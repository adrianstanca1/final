// full contents of components/AllTasksView.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, TodoStatus } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { Avatar } from './ui/Avatar';

interface AllTasksViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
}

export const AllTasksView: React.FC<AllTasksViewProps> = ({ user, addToast, isOnline }) => {
    const [tasks, setTasks] = useState<Todo[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        projectId: 'all',
        assigneeId: 'all',
        status: 'open',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            const [projData, usersData] = await Promise.all([
                api.getProjectsByCompany(user.companyId),
                api.getUsersByCompany(user.companyId),
            ]);
            setProjects(projData);
            setUsers(usersData);
            if(projData.length > 0) {
                const taskData = await api.getTodosByProjectIds(projData.map(p => p.id));
                setTasks(taskData);
            }
        } catch (error) {
            addToast("Failed to load task data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const projectMatch = filters.projectId === 'all' || task.projectId.toString() === filters.projectId;
            const assigneeMatch = filters.assigneeId === 'all' || task.assigneeId?.toString() === filters.assigneeId;
            const statusMatch = filters.status === 'all' || 
                                (filters.status === 'open' && task.status !== TodoStatus.DONE) ||
                                (filters.status === 'completed' && task.status === TodoStatus.DONE);
            return projectMatch && assigneeMatch && statusMatch;
        });
    }, [tasks, filters]);

    if(loading) return <Card><p>Loading tasks...</p></Card>

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800">All Tasks</h2>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4 border-b">
                     <select value={filters.projectId} onChange={e => setFilters(f => ({ ...f, projectId: e.target.value }))} className="w-full p-2 border bg-white rounded-md">
                        <option value="all">All Projects</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                     <select value={filters.assigneeId} onChange={e => setFilters(f => ({ ...f, assigneeId: e.target.value }))} className="w-full p-2 border bg-white rounded-md">
                        <option value="all">All Assignees</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                     <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="w-full p-2 border bg-white rounded-md">
                        <option value="open">Open</option>
                        <option value="completed">Completed</option>
                        <option value="all">All</option>
                    </select>
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Task</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assignee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTasks.map(task => {
                                const assignee = task.assigneeId ? userMap.get(task.assigneeId) : null;
                                return (
                                    <tr key={task.id}>
                                        <td className="px-6 py-4 font-medium">{task.text}</td>
                                        <td className="px-6 py-4">{assignee ? <div className="flex items-center gap-2"><Avatar name={assignee.name} className="w-6 h-6 text-xs"/><span>{assignee.name}</span></div> : 'Unassigned'}</td>
                                        <td className="px-6 py-4"><PriorityDisplay priority={task.priority} /></td>
                                        <td className="px-6 py-4">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-6 py-4">{task.status}</td>
                                    </tr>
                                )
                            })}
                         </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
