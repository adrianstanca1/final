import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Project, ProjectAssignment } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Avatar } from './ui/Avatar';

interface WorkforcePlannerProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
}

interface AssignedUser extends User {
    projectId: string | null;
}

export const WorkforcePlanner: React.FC<WorkforcePlannerProps> = ({ user, addToast }) => {
    const [users, setUsers] = useState<AssignedUser[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        const controller = new AbortController();
        abortControllerRef.current?.abort();
        abortControllerRef.current = controller;

        try {
            setLoading(true);
            const [usersResponse, projectsResponse] = await Promise.all([
                api.getUsersByCompany(user.companyId),
                api.getProjectsByCompany(user.companyId)
            ]);

            if (!controller.signal.aborted) {
                const usersWithAssignments = usersResponse.map((u: User) => ({
                    ...u,
                    projectId: null
                }));

                setUsers(usersWithAssignments);
                setProjects(projectsResponse);
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                addToast('Failed to fetch workforce data', 'error');
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [fetchData]);

    const assignUserToProject = async (userId: string, projectId: string | null) => {
        try {
            if (projectId) {
                await api.assignUserToProject(userId, projectId);
                addToast('User assigned successfully', 'success');
            } else {
                await api.unassignUserFromProject(userId);
                addToast('User unassigned successfully', 'success');
            }

            setUsers(prevUsers =>
                prevUsers.map(u =>
                    u.id === userId ? { ...u, projectId } : u
                )
            );
        } catch (error) {
            addToast('Failed to update assignment', 'error');
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i}>
                                <div className="h-24 bg-gray-300 rounded"></div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const unassignedUsers = users.filter(u => !u.projectId);
    const assignedUsers = users.filter(u => u.projectId);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Workforce Planning</h1>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Unassigned Users */}
                <Card>
                    <div className="p-4">
                        <h2 className="text-lg font-semibold mb-4 text-gray-900">
                            Available Workers ({unassignedUsers.length})
                        </h2>
                        <div className="space-y-3">
                            {unassignedUsers.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <Avatar name={user.name || `${user.firstName} ${user.lastName}`.trim()} className="w-10 h-10" />
                                        <div>
                                            <div className="font-medium text-gray-900">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.role}</div>
                                        </div>
                                    </div>
                                    <select
                                        value=""
                                        onChange={(e) => assignUserToProject(user.id, e.target.value || null)}
                                        className="px-3 py-1 border rounded text-sm"
                                    >
                                        <option value="">Assign to project...</option>
                                        {projects.map(project => (
                                            <option key={project.id} value={project.id}>
                                                {project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                            {unassignedUsers.length === 0 && (
                                <div className="text-center text-gray-500 py-8">
                                    No available workers
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Assigned Users by Project */}
                <Card>
                    <div className="p-4">
                        <h2 className="text-lg font-semibold mb-4 text-gray-900">
                            Project Assignments ({assignedUsers.length})
                        </h2>
                        <div className="space-y-4">
                            {projects.map(project => {
                                const projectUsers = assignedUsers.filter(u => u.projectId === project.id);
                                if (projectUsers.length === 0) return null;

                                return (
                                    <div key={project.id} className="border rounded-lg p-3">
                                        <h3 className="font-medium text-gray-900 mb-2">{project.name}</h3>
                                        <div className="space-y-2">
                                            {projectUsers.map(user => (
                                                <div key={user.id} className="flex items-center justify-between pl-4">
                                                    <div className="flex items-center space-x-3">
                                                        <Avatar name={user.name || `${user.firstName} ${user.lastName}`.trim()} className="w-6 h-6 text-xs" />
                                                        <div>
                                                            <div className="font-medium text-sm text-gray-900">{user.name}</div>
                                                            <div className="text-xs text-gray-500">{user.role}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => assignUserToProject(user.id, null)}
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                    >
                                                        Unassign
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {assignedUsers.length === 0 && (
                                <div className="text-center text-gray-500 py-8">
                                    No project assignments
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <div className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{users.length}</div>
                        <div className="text-sm text-gray-500">Total Workers</div>
                    </div>
                </Card>
                <Card>
                    <div className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{assignedUsers.length}</div>
                        <div className="text-sm text-gray-500">Assigned</div>
                    </div>
                </Card>
                <Card>
                    <div className="p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">{unassignedUsers.length}</div>
                        <div className="text-sm text-gray-500">Available</div>
                    </div>
                </Card>
                <Card>
                    <div className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">{projects.length}</div>
                        <div className="text-sm text-gray-500">Active Projects</div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
