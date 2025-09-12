import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, Equipment, ProjectAssignment, Role, TodoStatus } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Avatar } from './ui/Avatar';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { EquipmentStatusBadge } from './ui/StatusBadge';

interface ForemanDashboardProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const ForemanDashboard: React.FC<ForemanDashboardProps> = ({ user, addToast }) => {
    const [loading, setLoading] = useState(true);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [myTasks, setMyTasks] = useState<Todo[]>([]);
    const [crew, setCrew] = useState<User[]>([]);
    const [crewTasks, setCrewTasks] = useState<Map<number, Todo[]>>(new Map());
    const [equipment, setEquipment] = useState<Equipment[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;

            const userProjects = await api.getProjectsByUser(user.id);
            const activeProject = userProjects.find(p => p.status === 'Active');
            setCurrentProject(activeProject || null);

            if (activeProject) {
                const [allCompanyUsers, allProjectTasks, allCompanyEquipment, allAssignments] = await Promise.all([
                    api.getUsersByCompany(user.companyId),
                    api.getTodosByProjectIds([activeProject.id]),
                    api.getEquipmentByCompany(user.companyId),
                    api.getProjectAssignmentsByCompany(user.companyId),
                ]);

                // Set Foreman's tasks
                setMyTasks(allProjectTasks.filter(t => t.assigneeId === user.id && t.status !== TodoStatus.DONE));

                // Determine crew members
                const projectCrewAssignments = allAssignments.filter(a => a.projectId === activeProject.id && a.userId !== user.id);
                const crewIds = new Set(projectCrewAssignments.map(a => a.userId));
                const crewMembers = allCompanyUsers.filter(u => crewIds.has(u.id));
                setCrew(crewMembers);

                // Group tasks by crew member
                const tasksByCrew = new Map<number, Todo[]>();
                crewMembers.forEach(member => {
                    tasksByCrew.set(member.id, allProjectTasks.filter(t => t.assigneeId === member.id && t.status !== TodoStatus.DONE));
                });
                setCrewTasks(tasksByCrew);

                // Set project equipment
                setEquipment(allCompanyEquipment.filter(e => e.projectId === activeProject.id));
            }

        } catch (error) {
            addToast("Failed to load dashboard data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <Card><p>Loading Foreman Dashboard...</p></Card>;
    }

    if (!currentProject) {
        return (
            <Card className="text-center py-12">
                <h2 className="text-2xl font-bold">No Active Project</h2>
                <p className="text-slate-500 mt-2">You are not currently assigned to an active project.</p>
            </Card>
        );
    }
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Foreman's Dashboard</h1>
                <p className="text-lg text-slate-500">Managing: <span className="font-semibold text-slate-600">{currentProject.name}</span></p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    <Card>
                        <h3 className="text-xl font-semibold mb-3">My Tasks</h3>
                        <div className="space-y-2">
                            {myTasks.length > 0 ? myTasks.map(task => (
                                <div key={task.id} className="p-2 border-b">
                                    <p>{task.text}</p>
                                    <PriorityDisplay priority={task.priority} />
                                </div>
                            )) : <p className="text-sm text-slate-500">No tasks assigned to you.</p>}
                        </div>
                    </Card>
                    <Card>
                        <h3 className="text-xl font-semibold mb-3">Equipment on Site</h3>
                        <div className="space-y-2">
                            {equipment.length > 0 ? equipment.map(item => (
                                <div key={item.id} className="p-2 border-b flex justify-between items-center">
                                    <p>{item.name}</p>
                                    <EquipmentStatusBadge status={item.status} />
                                </div>
                            )) : <p className="text-sm text-slate-500">No equipment assigned to this project.</p>}
                        </div>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <h3 className="text-xl font-semibold mb-3">Crew's Tasks</h3>
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {crew.map(member => (
                                <div key={member.id}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Avatar name={member.name} className="w-8 h-8 text-xs" />
                                        <h4 className="font-semibold">{member.name}</h4>
                                    </div>
                                    <div className="pl-10 space-y-1">
                                        {crewTasks.get(member.id)?.map(task => (
                                            <p key={task.id} className="text-sm p-1 bg-slate-50 rounded-md">{task.text}</p>
                                        )) || <p className="text-sm text-slate-400 italic pl-2">No open tasks.</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <div className="whiteboard-bg grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="post-it post-it-yellow">
                            <h4 className="font-bold border-b border-black/20 pb-1 mb-2">Pre-Start Safety Check</h4>
                            <label className="flex items-center gap-2"><input type="checkbox"/> Site Access Clear</label>
                            <label className="flex items-center gap-2"><input type="checkbox"/> PPE Check Complete</label>
                            <label className="flex items-center gap-2"><input type="checkbox"/> Scaffolding Inspected</label>
                            <label className="flex items-center gap-2"><input type="checkbox"/> First-Aid Kit Available</label>
                        </div>
                        <div className="post-it post-it-blue">
                            <h4 className="font-bold border-b border-black/20 pb-1 mb-2">Daily Notes</h4>
                            <textarea className="w-full h-24 bg-transparent border-none focus:ring-0 p-0" placeholder="Notes for today's huddle..."></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};