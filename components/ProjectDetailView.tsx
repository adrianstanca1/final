import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Project, Todo, Document, Role, Permission, TodoStatus, TodoPriority, SafetyIncident, Expense, ExpenseStatus } from '../types';
// FIX: Corrected API import
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { hasPermission } from '../services/auth';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { Avatar } from './ui/Avatar';
import { IncidentSeverityBadge, IncidentStatusBadge } from './ui/StatusBadge';
import { ProjectModal } from './CreateProjectModal';
import { ReminderControl } from './ReminderControl';
import { TaskModal } from './TaskModal';
import { Tag } from './ui/Tag';
import { ReminderModal } from './ReminderModal';
import { WhiteboardView } from './WhiteboardView';

interface ProjectDetailViewProps {
  project: Project;
  user: User;
  onBack: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
  onStartChat: (recipient: User) => void;
}

type DetailTab = 'overview' | 'tasks' | 'whiteboard' | 'documents' | 'team' | 'safety' | 'financials';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const ProjectHealthSummary: React.FC<{ project: Project; tasks: Todo[]; }> = ({ project, tasks }) => {
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);

    const generateSummary = useCallback(async () => {
        setLoading(true);
        try {
            // This would be a call to a Gemini model in a real app
            await new Promise(res => setTimeout(res, 1200));
            const completedTasks = tasks.filter(t => t.status === TodoStatus.DONE).length;
            const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
            const budgetUsage = (project.actualCost / project.budget) * 100;
            
            let health = 'Good';
            if (budgetUsage > 100 || progress < 50 && budgetUsage > 60) health = 'Poor';
            else if (budgetUsage > 90) health = 'Fair';
            
            setSummary(
                `Project health is **${health}**. \n` +
                `- **Progress:** ${progress.toFixed(0)}% complete (${completedTasks}/${tasks.length} tasks). \n` +
                `- **Budget:** ${budgetUsage.toFixed(0)}% utilized. Currently ${budgetUsage > 100 ? 'over' : 'within'} budget. \n` +
                `- **Recommendation:** Focus on completing high-priority tasks to maintain schedule.`
            );
        } catch (error)
{
            setSummary('Could not generate AI summary.');
        } finally {
            setLoading(false);
        }
    }, [project, tasks]);

    return (
        <Card className="bg-muted">
            <div className="flex justify-between items-center mb-2">
                 <h3 className="font-semibold text-lg">AI Project Health Summary</h3>
                 <Button size="sm" variant="secondary" onClick={generateSummary} isLoading={loading}>Generate</Button>
            </div>
            {summary ? (
                 <div className="text-sm space-y-1 whitespace-pre-wrap">
                    {summary.split('\n').map((line, i) => <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>').replace(/- /g, '• ') }}></p>)}
                </div>
            ) : <p className="text-sm text-muted-foreground">Click "Generate" to get an AI-powered summary of the project's status.</p>}
        </Card>
    );
};

const TaskItem: React.FC<{
    task: Todo;
    allProjectTasks: Todo[];
    team: User[];
    canManage: boolean;
    // FIX: Changed taskId from number | string to just string
    onUpdate: (taskId: string, updates: Partial<Todo>) => void;
    onEdit: (task: Todo) => void;
    onOpenReminder: (task: Todo) => void;
}> = ({ task, allProjectTasks, team, canManage, onUpdate, onEdit, onOpenReminder }) => {
    const [progress, setProgress] = useState(task.progress ?? 0);
    const assignee = useMemo(() => team.find(u => u.id === task.assigneeId), [team, task.assigneeId]);

    useEffect(() => {
        setProgress(task.progress ?? 0);
    }, [task.progress]);

    const isBlocked = useMemo(() => {
        if (!task.dependsOn || task.dependsOn.length === 0) return false;
        return task.dependsOn.some(depId => {
            const dependency = allProjectTasks.find(t => t.id == depId);
            return dependency && dependency.status !== TodoStatus.DONE;
        });
    }, [task.dependsOn, allProjectTasks]);

    const blockerTasks = useMemo(() => {
        if (!isBlocked || !task.dependsOn) return '';
        return task.dependsOn
            .map(depId => allProjectTasks.find(t => t.id == depId))
            .filter((t): t is Todo => !!t && t.status !== TodoStatus.DONE)
            .map(t => `#${t.id.toString().substring(0, 5)} - ${t.text}`)
            .join('\n');
    }, [isBlocked, task.dependsOn, allProjectTasks]);


    const handleProgressChangeCommit = (newProgress: number) => {
        if (newProgress !== (task.progress ?? 0)) {
            onUpdate(task.id, { progress: newProgress });
        }
    };
    
    const handleToggleComplete = () => {
        const newProgress = task.status === TodoStatus.DONE ? 0 : 100;
        setProgress(newProgress); // Optimistic UI update for the slider
        onUpdate(task.id, { progress: newProgress });
    };

    return (
        <div className={`grid grid-cols-1 md:grid-cols-6 items-center gap-x-4 gap-y-2 p-3 rounded-md hover:bg-accent border-b border-border last:border-b-0 ${isBlocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <div className="md:col-span-3 flex items-center gap-3 group">
                 <input
                    type="checkbox"
                    checked={task.status === TodoStatus.DONE}
                    onChange={handleToggleComplete}
                    disabled={!canManage || isBlocked}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-ring disabled:cursor-not-allowed"
                />
                 {isBlocked && (
                    <div className="text-muted-foreground" title={`Blocked by:\n${blockerTasks}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
                <span className={task.status === TodoStatus.DONE ? 'line-through text-muted-foreground' : ''}>{task.text}</span>
                {canManage && <ReminderControl todo={task} onClick={() => onOpenReminder(task)} />}
                {canManage && !isBlocked && (
                    <button onClick={() => onEdit(task)} className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/10 text-muted-foreground hover:text-foreground transition-opacity disabled:opacity-50" aria-label="Edit task" title="Edit Task">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                        </svg>
                    </button>
                )}
            </div>
             <div className="flex justify-start md:justify-center">
                {assignee && <Avatar name={`${assignee.firstName} ${assignee.lastName}`} imageUrl={assignee.avatar} className="w-8 h-8 text-xs" />}
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
                 <input
                    type="range"
                    min="0" max="100"
                    value={progress}
                    onChange={e => setProgress(Number(e.target.value))}
                    onMouseUp={e => handleProgressChangeCommit(Number(e.currentTarget.value))}
                    onTouchEnd={e => handleProgressChangeCommit(Number(e.currentTarget.value))}
                    disabled={!canManage || isBlocked}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="text-sm font-semibold w-12 text-right">{progress}%</span>
            </div>
        </div>
    );
};


export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project: initialProject, user, onBack, addToast, isOnline, onStartChat }) => {
    const [project, setProject] = useState(initialProject);
    const [activeTab, setActiveTab] = useState<DetailTab>('overview');
    const [tasks, setTasks] = useState<Todo[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [team, setTeam] = useState<User[]>([]);
    const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Todo | null>(null);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [taskForReminder, setTaskForReminder] = useState<Todo | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        const controller = new AbortController();
        abortControllerRef.current?.abort();
        abortControllerRef.current = controller;

        setLoading(true);
        try {
            if (!user.companyId) return;
            const [taskData, docData, teamData, allIncidents, allExpenses] = await Promise.all([
                api.getTodosByProjectIds([project.id], { signal: controller.signal }),
                api.getDocumentsByProject(project.id, { signal: controller.signal }),
                api.getUsersByProject(project.id, { signal: controller.signal }),
                api.getSafetyIncidentsByCompany(user.companyId, { signal: controller.signal }),
                api.getExpensesByCompany(user.companyId, { signal: controller.signal }),
            ]);
            if (controller.signal.aborted) return;
            setTasks(taskData.sort((a,b) => (a.progress ?? 0) - (b.progress ?? 0)));
            if (controller.signal.aborted) return;
            setDocuments(docData as any);
            if (controller.signal.aborted) return;
            setTeam(teamData);
            if (controller.signal.aborted) return;
            setIncidents(allIncidents.filter(i => i.projectId == project.id));
            if (controller.signal.aborted) return;
            setExpenses(allExpenses.filter(e => e.projectId == project.id));
        } catch (error) {
            if (controller.signal.aborted) return;
            addToast("Failed to load project details.", "error");
        } finally {
            if (controller.signal.aborted) return;
            setLoading(false);
        }
    }, [project.id, user.companyId, addToast]);

    useEffect(() => {
        fetchData();
        return () => {
            abortControllerRef.current?.abort();
        };
    }, [fetchData]);
    
    useEffect(() => {
        setProject(initialProject);
    }, [initialProject]);

    // FIX: Changed taskId from number | string to string to match the API.
    const handleTaskUpdate = async (taskId: string, updates: Partial<Todo>) => {
        const originalTasks = [...tasks];
        setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
        try {
            await api.updateTodo(taskId, updates, user.id);
            // After successful API call, refresh all data to get consistent dependency statuses
            fetchData();
            addToast("Task updated.", "success");
        } catch (e) {
            addToast("Failed to update task.", "error");
            setTasks(originalTasks);
        }
    };
    
    const handleOpenTaskModal = (task: Todo | null) => {
        setTaskToEdit(task);
        setIsTaskModalOpen(true);
    };

    const handleOpenReminderModal = (task: Todo) => {
        setTaskForReminder(task);
        setIsReminderModalOpen(true);
    };

    const handleTaskModalSuccess = () => {
        // Just refresh all data to ensure dependency graph is correct
        fetchData();
    };

    const handleProjectUpdate = (updatedProject: Project) => setProject(updatedProject);

    const canManageTasks = hasPermission(user, Permission.MANAGE_ALL_TASKS);
    
    // --- Render Methods for Tabs ---

    const renderTasks = () => (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Tasks</h3>
                {canManageTasks && <Button onClick={() => handleOpenTaskModal(null)}>Add Task</Button>}
            </div>
            {tasks.length > 0 ? (
                <div className="space-y-1">{tasks.map(task => <TaskItem key={task.id} task={task} allProjectTasks={tasks} team={team} canManage={canManageTasks} onUpdate={handleTaskUpdate} onEdit={handleOpenTaskModal} onOpenReminder={handleOpenReminderModal} />)}</div>
            ) : <p className="text-muted-foreground text-center py-4">No tasks for this project yet.</p>}
        </Card>
    );
    
    const renderDocuments = () => (
        <Card>
            <h3 className="font-semibold text-lg mb-4">Documents</h3>
            {documents.length > 0 ? (
                <ul className="divide-y border-border">{documents.map(doc => (<li key={doc.id} className="py-3 flex justify-between items-center"><div><p className="font-medium">{doc.name}</p><p className="text-sm text-muted-foreground">{doc.category} - v{doc.version}</p></div><Button variant="secondary" size="sm">Download</Button></li>))}</ul>
            ) : <p className="text-muted-foreground text-center py-4">No documents uploaded for this project.</p>}
        </Card>
    );
    
    const renderTeam = () => (
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {team.map(member => (<Card key={member.id} className="text-center"><Avatar name={`${member.firstName} ${member.lastName}`} imageUrl={member.avatar} className="w-20 h-20 mx-auto mb-4" /><h4 className="font-semibold">{`${member.firstName} ${member.lastName}`}</h4><p className="text-sm text-muted-foreground">{member.role}</p>{user.id !== member.id && hasPermission(user, Permission.SEND_DIRECT_MESSAGE) && (<Button variant="ghost" size="sm" className="mt-2" onClick={() => onStartChat(member)}>Message</Button>)}</Card>))}
        </div>
    );
    
    const renderSafety = () => (
         <Card>
            <h3 className="font-semibold text-lg mb-4">Safety Incidents</h3>
            {incidents.length > 0 ? (
                 <div className="overflow-x-auto"><table className="min-w-full divide-y divide-border"><thead className="bg-muted"><tr><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Description</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Severity</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Date</th></tr></thead><tbody className="bg-card divide-y divide-border">{incidents.map(incident => (<tr key={incident.id}><td className="px-4 py-3 text-sm max-w-md truncate" title={incident.description}>{incident.description}</td><td className="px-4 py-3"><IncidentSeverityBadge severity={incident.severity} /></td><td className="px-4 py-3"><IncidentStatusBadge status={incident.status} /></td><td className="px-4 py-3 text-sm">{new Date(incident.timestamp).toLocaleDateString()}</td></tr>))}</tbody></table></div>
            ) : <p className="text-muted-foreground text-center py-4">No safety incidents reported for this project.</p>}
        </Card>
    );

    const renderFinancials = () => {
        const totalInvoiced = 0; // This would need to be calculated from invoice data
        const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
        const profitability = project.budget > 0 ? ((project.budget - (project.actualCost + totalExpenses)) / project.budget) * 100 : 0;

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card><p className="text-sm text-muted-foreground">Budget vs Actual</p><p className="text-2xl font-bold">{formatCurrency(project.actualCost)} / {formatCurrency(project.budget)}</p></Card>
                    <Card><p className="text-sm text-muted-foreground">Total Invoiced</p><p className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</p></Card>
                    <Card><p className="text-sm text-muted-foreground">Profitability</p><p className={`text-2xl font-bold ${profitability < 0 ? 'text-red-500' : 'text-green-500'}`}>{profitability.toFixed(1)}%</p></Card>
                </div>
                <Card>
                    <h3 className="font-semibold text-lg mb-4">Expenses for this Project</h3>
                    {expenses.length > 0 ? (
                        expenses.map(exp => (
                            <div key={exp.id} className="p-2 border-b flex justify-between items-center">
                                <div><p>{new Date(exp.submittedAt).toLocaleDateString()} - {exp.description}</p><p className="text-sm text-muted-foreground">{exp.category}</p></div>
                                {/* FIX: Corrected status comparison to use enum values. */}
                                <div className="text-right"><p className="font-semibold">{formatCurrency(exp.amount)}</p><Tag label={exp.status} color={exp.status === ExpenseStatus.APPROVED ? 'green' : exp.status === ExpenseStatus.REJECTED ? 'red' : 'yellow'} /></div>
                            </div>
                        ))
                    ) : <p className="text-muted-foreground text-center py-4">No expenses logged for this project.</p>}
                </Card>
            </div>
        );
    };

     const renderOverview = () => (
        <div className="space-y-6">
            <ProjectHealthSummary project={project} tasks={tasks} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card><h3 className="font-semibold mb-2">Budget</h3><p className="text-3xl font-bold">{formatCurrency(project.actualCost)}</p><p className="text-sm text-muted-foreground">of {formatCurrency(project.budget)} used</p><div className="w-full bg-muted rounded-full h-2.5 mt-2"><div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${(project.actualCost / project.budget) * 100}%` }}></div></div></Card>
                <Card><h3 className="font-semibold mb-2">Team Members</h3><div className="flex -space-x-2">{team.map(member => <Avatar key={member.id} name={`${member.firstName} ${member.lastName}`} imageUrl={member.avatar} className="w-10 h-10 border-2 border-card" />)}</div></Card>
                <Card><h3 className="font-semibold mb-2">Key Info</h3><p className="text-sm">Start: {new Date(project.startDate).toLocaleDateString()}</p>{project.geofenceRadius && <p className="text-sm">Geofence: {project.geofenceRadius}m</p>}</Card>
            </div>
        </div>
    );
    
    const renderContent = () => {
        if(loading) return <Card>Loading project details...</Card>
        switch(activeTab) {
            case 'overview': return renderOverview();
            case 'tasks': return renderTasks();
            case 'whiteboard': return <WhiteboardView project={project} user={user} addToast={addToast} />;
            case 'documents': return renderDocuments();
            case 'team': return renderTeam();
            case 'safety': return renderSafety();
            case 'financials': return renderFinancials();
            default: return renderOverview();
        }
    };

    return (
        <div className="space-y-6">
            {isEditModalOpen && <ProjectModal user={user} onClose={() => setIsEditModalOpen(false)} onSuccess={handleProjectUpdate} addToast={addToast} projectToEdit={project}/>}
            {isTaskModalOpen && <TaskModal user={user} projects={[project]} users={team} onClose={() => setIsTaskModalOpen(false)} onSuccess={handleTaskModalSuccess} addToast={addToast} taskToEdit={taskToEdit} allProjectTasks={tasks}/>}
            {isReminderModalOpen && taskForReminder && (
                <ReminderModal
                    todo={taskForReminder}
                    user={user}
                    onClose={() => setIsReminderModalOpen(false)}
                    onSuccess={fetchData}
                    addToast={addToast}
                />
            )}
            
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">&larr; Back to all projects</button>
            
            <div className="flex justify-between items-start">
                <div><h1 className="text-4xl font-bold text-foreground">{project.name}</h1><p className="text-muted-foreground">{project.location.address}</p></div>
                {hasPermission(user, Permission.MANAGE_PROJECT_DETAILS) && <Button onClick={() => setIsEditModalOpen(true)}>Edit Project</Button>}
            </div>
            
             <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {(['overview', 'tasks', 'whiteboard', 'documents', 'team', 'safety', 'financials'] as DetailTab[]).map(tab => (
                         <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {renderContent()}
        </div>
    );
};