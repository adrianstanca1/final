import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Project, Equipment } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';

interface ResourceSchedulerProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
}

const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(new Date(d.setDate(diff)).setHours(0, 0, 0, 0));
};

const dateToYMD = (date: Date) => date.toISOString().split('T')[0];

interface ScheduleItem {
    id: string;
    type: 'user' | 'equipment';
    resourceId: string;
    projectId: string;
    date: string;
    hours: number;
}

export const ResourceScheduler: React.FC<ResourceSchedulerProps> = ({ user, addToast }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [currentWeek, setCurrentWeek] = useState(getWeekStart(new Date()));
    const [loading, setLoading] = useState(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    const weekDays = useMemo(() => {
        const days = [];
        const start = new Date(currentWeek);
        for (let i = 0; i < 7; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            days.push(date);
        }
        return days;
    }, [currentWeek]);

    const fetchData = useCallback(async () => {
        const controller = new AbortController();
        abortControllerRef.current?.abort();
        abortControllerRef.current = controller;

        try {
            setLoading(true);
            const [usersData, projectsData, equipmentData] = await Promise.all([
                api.getUsersByCompany(user.companyId),
                api.getProjectsByCompany(user.companyId),
                api.getEquipmentByCompany(user.companyId)
            ]);

            if (!controller.signal.aborted) {
                setUsers(usersData);
                setProjects(projectsData);
                setEquipment(equipmentData);

                // Mock schedule data
                const mockSchedule: ScheduleItem[] = [];
                usersData.slice(0, 3).forEach((u, userIndex) => {
                    weekDays.forEach((day, dayIndex) => {
                        if (dayIndex < 5) { // Weekdays only
                            mockSchedule.push({
                                id: `user-${u.id}-${dateToYMD(day)}`,
                                type: 'user',
                                resourceId: u.id,
                                projectId: projectsData[userIndex % projectsData.length]?.id || '',
                                date: dateToYMD(day),
                                hours: 8
                            });
                        }
                    });
                });

                equipmentData.slice(0, 2).forEach((eq, eqIndex) => {
                    weekDays.forEach((day, dayIndex) => {
                        if (dayIndex < 5 && dayIndex > 0) { // Tue-Fri
                            mockSchedule.push({
                                id: `equipment-${eq.id}-${dateToYMD(day)}`,
                                type: 'equipment',
                                resourceId: eq.id,
                                projectId: projectsData[eqIndex % projectsData.length]?.id || '',
                                date: dateToYMD(day),
                                hours: 8
                            });
                        }
                    });
                });

                setSchedule(mockSchedule);
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                console.error('Failed to fetch resource data:', error);
                addToast('Failed to fetch resource data', 'error');
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, [addToast, weekDays]);

    useEffect(() => {
        fetchData();

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [fetchData]);

    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentWeek);
        newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
        setCurrentWeek(getWeekStart(newDate));
    };

    const getScheduleForResource = (resourceType: 'user' | 'equipment', resourceId: string, date: Date) => {
        return schedule.find(item =>
            item.type === resourceType &&
            item.resourceId === resourceId &&
            item.date === dateToYMD(date)
        );
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-300 rounded w-1/3"></div>
                    <div className="grid grid-cols-8 gap-2">
                        {[...Array(56)].map((_, i) => (
                            <div key={`loading-skeleton`} className="h-16 bg-gray-300 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Resource Scheduler</h1>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <Button
                            onClick={() => navigateWeek('prev')}
                            variant="outline"
                            size="sm"
                        >
                            ← Previous
                        </Button>
                        <span className="text-sm font-medium">
                            {currentWeek.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                            })} - {new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </span>
                        <Button
                            onClick={() => navigateWeek('next')}
                            variant="outline"
                            size="sm"
                        >
                            Next →
                        </Button>
                    </div>
                    <Button onClick={fetchData}>Refresh</Button>
                </div>
            </div>

            {/* Schedule Grid */}
            <div className="overflow-x-auto">
                <div className="min-w-full">
                    {/* Header */}
                    <div className="grid grid-cols-8 gap-2 mb-4">
                        <div className="p-3 bg-gray-50 rounded font-medium text-center">
                            Resource
                        </div>
                        {weekDays.map(day => (
                            <div key={day.toISOString()} className="p-3 bg-gray-50 rounded text-center">
                                <div className="font-medium">
                                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {day.getDate()}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Users */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3 text-gray-900">Workers</h3>
                        {users.slice(0, 5).map(user => (
                            <div key={user.id} className="grid grid-cols-8 gap-2 mb-2">
                                <div className="p-3 border rounded flex items-center space-x-3">
                                    <Avatar name={user.name || `${user.firstName} ${user.lastName}`.trim()} className="w-6 h-6 text-xs" />
                                    <div>
                                        <div className="font-medium text-sm">{user.name}</div>
                                        <div className="text-xs text-gray-500">{user.role}</div>
                                    </div>
                                </div>
                                {weekDays.map(day => {
                                    const scheduleItem = getScheduleForResource('user', user.id, day);
                                    const project = scheduleItem ? projects.find(p => p.id === scheduleItem.projectId) : null;

                                    return (
                                        <div key={day.toISOString()} className="p-2 border rounded">
                                            {scheduleItem ? (
                                                <div className="text-center">
                                                    <div className="text-xs font-medium text-blue-700">
                                                        {project?.name || 'Unknown'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {scheduleItem.hours}h
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center text-xs text-gray-400">
                                                    Available
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Equipment */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-gray-900">Equipment</h3>
                        {equipment.slice(0, 3).map(eq => (
                            <div key={eq.id} className="grid grid-cols-8 gap-2 mb-2">
                                <div className="p-3 border rounded">
                                    <div className="font-medium text-sm">{eq.name}</div>
                                    <div className="text-xs text-gray-500">{eq.type}</div>
                                </div>
                                {weekDays.map(day => {
                                    const scheduleItem = getScheduleForResource('equipment', eq.id, day);
                                    const project = scheduleItem ? projects.find(p => p.id === scheduleItem.projectId) : null;

                                    return (
                                        <div key={day.toISOString()} className="p-2 border rounded">
                                            {scheduleItem ? (
                                                <div className="text-center">
                                                    <div className="text-xs font-medium text-green-700">
                                                        {project?.name || 'Unknown'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {scheduleItem.hours}h
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center text-xs text-gray-400">
                                                    Available
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <div className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{users.length}</div>
                        <div className="text-sm text-gray-500">Workers</div>
                    </div>
                </Card>
                <Card>
                    <div className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{equipment.length}</div>
                        <div className="text-sm text-gray-500">Equipment</div>
                    </div>
                </Card>
                <Card>
                    <div className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">{projects.length}</div>
                        <div className="text-sm text-gray-500">Projects</div>
                    </div>
                </Card>
                <Card>
                    <div className="p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">{schedule.length}</div>
                        <div className="text-sm text-gray-500">Assignments</div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
