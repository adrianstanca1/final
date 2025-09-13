// full contents of components/ProjectDetailView.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, Document, Role, Permission, TodoStatus, TodoPriority } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { hasPermission } from '../services/auth';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { Avatar } from './ui/Avatar';

interface ProjectDetailViewProps {
  project: Project;
  user: User;
  onBack: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
  onStartChat: (recipient: User) => void;
}

type DetailTab = 'overview' | 'tasks' | 'documents' | 'team' | 'safety';

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
        } catch (error) {
            setSummary('Could not generate AI summary.');
        } finally {
            setLoading(false);
        }
    }, [project, tasks]);

    return (
        <Card className="bg-slate-50 dark:bg-slate-800">
            <div className="flex justify-between items-center mb-2">
                 <h3 className="font-semibold text-lg">AI Project Health Summary</h3>
                 <Button size="sm" variant="secondary" onClick={generateSummary} isLoading={loading}>Generate</Button>
            </div>
            {summary ? (
                 <div className="text-sm space-y-1 whitespace-pre-wrap">
                    {summary.split('\n').map((line, i) => <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>').replace(/- /g, '• ') }}></p>)}
                </div>
            ) : <p className="text-sm text-slate-500">Click "Generate" to get an AI-powered summary of the project's status.</p>}
        </Card>
    );
};


export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, user, onBack, addToast, isOnline, onStartChat }) => {
    const [activeTab, setActiveTab] = useState<DetailTab>('overview');
    const [tasks, setTasks] = useState<Todo[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [team, setTeam] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // FIX: Corrected API calls to use the newly implemented methods in mockApi.ts.
            const [taskData, docData, teamData] = await Promise.all([
                api.getTodosByProjectIds([project.id]),
                api.getDocumentsByProject(project.id),
                api.getUsersByProject(project.id)
            ]);
            setTasks(taskData);
            setDocuments(docData);
            setTeam(teamData);
        } catch (error) {
            addToast("Failed to load project details.", "error");
        } finally {
            setLoading(false);
        }
    }, [project.id, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const renderTasks = () => (
        <Card>
            <h3 className="font-semibold text-lg mb-4">Tasks</h3>
            <div className="space-y-2">
                {tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={task.status === TodoStatus.DONE} readOnly />
                            <span>{task.text}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <PriorityDisplay priority={task.priority} />
                            {task.assigneeId && <Avatar name={team.find(u => u.id === task.assigneeId)?.name || ''} className="w-6 h-6 text-xs" />}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );

     const renderOverview = () => (
        <div className="space-y-6">
            <ProjectHealthSummary project={project} tasks={tasks} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <h3 className="font-semibold mb-2">Budget</h3>
                    <p className="text-3xl font-bold">£{project.actualCost.toLocaleString()}</p>
                    <p className="text-sm text-slate-500">of £{project.budget.toLocaleString()} used</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${(project.actualCost / project.budget) * 100}%` }}></div>
                    </div>
                </Card>
                <Card>
                    <h3 className="font-semibold mb-2">Team Members</h3>
                    <div className="flex -space-x-2">
                        {team.map(member => <Avatar key={member.id} name={member.name} className="w-10 h-10 border-2 border-white dark:border-slate-900" />)}
                    </div>
                </Card>
                <Card>
                    <h3 className="font-semibold mb-2">Key Dates</h3>
                    <p className="text-sm">Start: {new Date(project.startDate).toLocaleDateString()}</p>
                </Card>
            </div>
        </div>
    );
    
    const renderContent = () => {
        if(loading) return <Card>Loading project details...</Card>
        switch(activeTab) {
            case 'overview': return renderOverview();
            case 'tasks': return renderTasks();
            // ... other tabs
            default: return renderOverview();
        }
    };

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                &larr; Back to all projects
            </button>
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{project.name}</h1>
                    <p className="text-slate-500">{project.location.address}</p>
                </div>
                {hasPermission(user, Permission.MANAGE_PROJECT_DETAILS) && <Button>Edit Project</Button>}
            </div>
            
             <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6">
                    {(['overview', 'tasks', 'documents', 'team', 'safety'] as DetailTab[]).map(tab => (
                         <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {renderContent()}
        </div>
    );
};