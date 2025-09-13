// full contents of components/ForemanDashboard.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, Equipment, ProjectAssignment, Role, TodoStatus } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Avatar } from './ui/Avatar';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { EquipmentStatusBadge } from './ui/StatusBadge';
import { Button } from './ui/Button';

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

                setMyTasks(allProjectTasks.filter(t => t.assigneeId === user.id && t.status !== TodoStatus.DONE));

                const projectCrewAssignments = allAssignments.filter(a => a.projectId === activeProject.id && a.userId !== user.id);
                const crewIds = new Set(projectCrewAssignments.map(a => a.userId));
                const crewMembers = allCompanyUsers.filter(u => crewIds.has(u.id));
                setCrew(crewMembers);

                const tasksByCrew = new Map<number, Todo[]>();
                crewMembers.forEach(member => {
                    tasksByCrew.set(member.id, allProjectTasks.filter(t => t.assigneeId === member.id && t.status !== TodoStatus.DONE));
                });
                setCrewTasks(tasksByCrew);

                setEquipment(allCompanyEquipment.filter(e => e.projectId === activeProject.id));
            }
        } catch (error) {
            addToast("Failed to load foreman dashboard data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <Card>Loading dashboard...</Card>;
    }

    if (!currentProject) {
        return <Card>You are not currently assigned to an active project.</Card>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Foreman Dashboard</h1>
                <p className="text-slate-500">Overview of <strong>{currentProject.name}</strong></p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <h2 className="font-semibold text-lg mb-2">My High-Priority Tasks</h2>
                        {myTasks.length > 0 ? (
                             <div className="space-y-2">
                                {myTasks.slice(0, 5).map(task => (
                                    <div key={task.id} className="flex justify-between items-center p-2 rounded-md hover:bg-slate-50">
                                        <span>{task.text}</span>
                                        <PriorityDisplay priority={task.priority} />
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-slate-500">No active tasks assigned to you.</p>}
                    </Card>
                    <Card>
                        <h2 className="font-semibold text-lg mb-2">Crew Status</h2>
                        <div className="space-y-3">
                            {crew.map(member => (
                                <div key={member.id} className="flex items-center gap-4 p-2 rounded-md">
                                    <Avatar name={member.name} />
                                    <div className="flex-grow">
                                        <p className="font-semibold">{member.name}</p>
                                        <p className="text-sm text-slate-500">
                                            {crewTasks.get(member.id)?.length || 0} active tasks
                                        </p>
                                    </div>
                                    <Button size="sm" variant="secondary">View Tasks</Button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <h2 className="font-semibold text-lg mb-2">On-site Equipment</h2>
                        <div className="space-y-2">
                            {equipment.map(item => (
                                <div key={item.id} className="flex justify-between">
                                    <span>{item.name}</span>
                                    <EquipmentStatusBadge status={item.status} />
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card>
                        <h2 className="font-semibold text-lg mb-2">Quick Actions</h2>
                        <div className="flex flex-col gap-2">
                            <Button variant="danger">Report Safety Incident</Button>
                            <Button>Request Materials</Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
