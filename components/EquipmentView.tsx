import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Equipment, Project, EquipmentStatus, Permission, ResourceAssignment, EquipmentHistory } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { EquipmentStatusBadge } from './ui/StatusBadge';
import { hasPermission } from '../services/auth';
import { Avatar } from './ui/Avatar';

interface EquipmentViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

// --- AssignEquipmentModal Sub-Component ---
const AssignEquipmentModal: React.FC<{
    equipment: Equipment;
    projects: Project[];
    user: User;
    onClose: () => void;
    onSuccess: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ equipment, projects, user, onClose, onSuccess, addToast }) => {
    const today = new Date().toISOString().split('T')[0];
    const [projectId, setProjectId] = useState<string>(projects[0]?.id.toString() || '');
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !startDate || !endDate) {
            addToast("Please fill all fields.", "error");
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            addToast("Start date cannot be after end date.", "error");
            return;
        }

        setIsSaving(true);
        try {
            const assignmentData = {
                companyId: user.companyId!,
                projectId: parseInt(projectId),
                resourceId: equipment.id,
                resourceType: 'equipment' as const,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            };
            await api.createResourceAssignment(assignmentData, user.id);
            addToast(`${equipment.name} assigned successfully.`, "success");
            onSuccess();
            onClose();
        } catch (error) {
            addToast("Failed to assign equipment.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Schedule {equipment.name}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="project-select" className="block text-sm font-medium text-gray-700">Project</label>
                        <select id="project-select" value={projectId} onChange={e => setProjectId(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white">
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Start Date</label>
                            <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                        </div>
                        <div>
                             <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">End Date</label>
                            <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md" />
                        </div>
                    </div>
                     <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving}>Assign Equipment</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

// --- EquipmentHistoryModal Sub-Component ---
const EquipmentHistoryModal: React.FC<{
    equipment: Equipment;
    onClose: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ equipment, onClose, addToast }) => {
    const [history, setHistory] = useState<EquipmentHistory[]>([]);
    const [users, setUsers] = useState<Map<number, User>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [historyData, usersData] = await Promise.all([
                    api.getEquipmentHistory(equipment.id),
                    api.getUsersByCompany(equipment.companyId)
                ]);
                setHistory(historyData);
                setUsers(new Map(usersData.map(u => [u.id, u])));
            } catch (error) {
                addToast("Failed to load equipment history.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [equipment, addToast]);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-2xl h-auto max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                 <h2 className="text-2xl font-bold text-slate-800 mb-4">History for {equipment.name}</h2>
                 <div className="flex-grow overflow-y-auto pr-2">
                    {loading ? <p>Loading history...</p> : (
                        <div className="space-y-4">
                            {history.map(item => (
                                <div key={item.id} className="flex gap-4">
                                    <div className="text-xs text-slate-500 w-24 text-right flex-shrink-0">
                                        <p>{new Date(item.timestamp).toLocaleDateString()}</p>
                                        <p>{new Date(item.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                    <div className="relative pl-6">
                                        <div className="absolute top-1 -left-2 w-4 h-4 rounded-full bg-slate-200 border-4 border-white"></div>
                                        <div className="absolute top-1 left-0 w-px h-full bg-slate-200"></div>
                                        <p className="font-semibold">{item.action}</p>
                                        <p className="text-sm text-slate-600">{item.details}</p>
                                        <p className="text-xs text-slate-400">by {users.get(item.actorId)?.name || 'Unknown User'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
                 <div className="text-right mt-4 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </Card>
        </div>
    );
};

// --- EquipmentScheduleView Sub-Component ---
const EquipmentScheduleView: React.FC<{
    user: User;
    projects: Project[];
    equipment: Equipment[];
    assignments: ResourceAssignment[];
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ user, projects, equipment, assignments, addToast }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const weekStart = useMemo(() => {
        const d = new Date(currentDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }, [currentDate]);
    
    const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        return date;
    }), [weekStart]);

    const changeWeek = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
            return newDate;
        });
    };
    
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-slate-700">Equipment Schedule</h3>
                <div className="flex items-center gap-4">
                    <Button onClick={() => changeWeek('prev')} variant="secondary" size="sm">&lt; Prev</Button>
                    <span className="font-medium text-sm text-slate-600">{weekStart.toLocaleDateString()} - {weekDays[6].toLocaleDateString()}</span>
                    <Button onClick={() => changeWeek('next')} variant="secondary" size="sm">Next &gt;</Button>
                </div>
            </div>
             <div className="overflow-x-auto border rounded-lg">
                <div className="grid grid-cols-[200px_repeat(7,1fr)] min-w-[900px]">
                    <div className="p-2 font-semibold border-b border-r bg-slate-50 sticky left-0 z-10">Equipment</div>
                    {weekDays.map(day => (
                        <div key={day.toISOString()} className="p-2 font-semibold border-b text-center bg-slate-50">
                            {day.toLocaleDateString('en-US', { weekday: 'short' })} <span className="text-xs font-normal">{day.getDate()}</span>
                        </div>
                    ))}
                    {equipment.map(item => (
                        <React.Fragment key={item.id}>
                            <div className="p-2 font-medium border-b border-r break-words bg-white sticky left-0 z-10">{item.name}</div>
                            <div className="col-span-7 border-b relative grid grid-cols-7 h-12">
                                {assignments.filter(a => a.resourceType === 'equipment' && a.resourceId === item.id).map(a => {
                                    const startDate = new Date(a.startDate);
                                    const endDate = new Date(a.endDate);
                                    startDate.setHours(0,0,0,0);
                                    endDate.setHours(23,59,59,999);
                                    
                                    const weekEnd = new Date(weekDays[6]); weekEnd.setHours(23,59,59,999);
                                    if (endDate < weekStart || startDate > weekEnd) return null;

                                    const startDayIndex = Math.max(0, (startDate.getTime() - weekStart.getTime()) / (24*60*60*1000));
                                    const endDayIndex = Math.min(6.99, (endDate.getTime() - weekStart.getTime()) / (24*60*60*1000));
                                    
                                    const left = (startDayIndex / 7) * 100;
                                    const width = Math.max(12, ((endDayIndex - startDayIndex + 1) / 7) * 100);
                                    
                                    const project = projects.find(p => p.id === a.projectId);

                                    return (
                                        <div key={a.id} className="absolute h-8 px-2 py-1 rounded bg-green-600 text-white text-xs overflow-hidden" style={{ left: `${left}%`, width: `${width}%`, top: `0.5rem` }} title={`${project?.name || 'Unknown Project'}`}>
                                           <span className="truncate">{project?.name || 'Unknown Project'}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </Card>
    );
};

export const EquipmentView: React.FC<EquipmentViewProps> = ({ user, addToast }) => {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'schedule'>('list');

    const [modalState, setModalState] = useState<{ type: 'assign' | 'history'; equipment: Equipment | null }>({ type: 'assign', equipment: null });
    
    const [filters, setFilters] = useState({ status: 'all', type: 'all', project: 'all' });
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const canManage = hasPermission(user, Permission.MANAGE_EQUIPMENT);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            const [equipData, projData, assignData] = await Promise.all([
                api.getEquipmentByCompany(user.companyId),
                api.getProjectsByCompany(user.companyId),
                api.getResourceAssignments(user.companyId),
            ]);
            setEquipment(equipData);
            setProjects(projData);
            setAssignments(assignData);
        } catch (error) {
            addToast('Failed to load equipment data.', 'error');
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleUpdateStatus = async (equipmentId: number, status: EquipmentStatus) => {
        setActiveDropdown(null);
        try {
            await api.updateEquipmentStatus(equipmentId, status, user.id);
            addToast('Equipment status updated successfully!', 'success');
            fetchData();
        } catch (error) {
            addToast('Failed to update equipment status.', 'error');
        }
    };

    const handleUnassign = async (equipmentId: number) => {
        setActiveDropdown(null);
        const now = new Date();
        const currentAssignment = assignments.find(a => a.resourceId === equipmentId && a.resourceType === 'equipment' && new Date(a.startDate) <= now && new Date(a.endDate) >= now);
        if (!currentAssignment) {
            addToast('No current assignment found to unassign.', 'error');
            return;
        }
        if (window.confirm('Are you sure you want to unassign this equipment? This will remove its current schedule.')) {
            try {
                await api.deleteResourceAssignment(currentAssignment.id, user.id);
                addToast('Equipment unassigned successfully!', 'success');
                fetchData();
            } catch (error) {
                addToast('Failed to unassign equipment.', 'error');
            }
        }
    };

    const equipmentTypes = useMemo(() => [...new Set(equipment.map(e => e.type))], [equipment]);
    
    const filteredEquipment = useMemo(() => {
        return equipment.filter(item => {
            const statusMatch = filters.status === 'all' || item.status === filters.status;
            const typeMatch = filters.type === 'all' || item.type === filters.type;
            const projectMatch = filters.project === 'all' || item.projectId?.toString() === filters.project;
            return statusMatch && typeMatch && projectMatch;
        });
    }, [equipment, filters]);
    
    if (loading) {
        return <Card><p>Loading equipment...</p></Card>;
    }

    return (
        <div className="space-y-6">
            {modalState.equipment && modalState.type === 'assign' && (
                <AssignEquipmentModal 
                    equipment={modalState.equipment} 
                    projects={projects}
                    user={user}
                    onClose={() => setModalState({ type: 'assign', equipment: null })} 
                    onSuccess={fetchData} 
                    addToast={addToast} 
                />
            )}
            {modalState.equipment && modalState.type === 'history' && (
                 <EquipmentHistoryModal 
                    equipment={modalState.equipment}
                    onClose={() => setModalState({ type: 'history', equipment: null })}
                    addToast={addToast}
                 />
            )}

            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Equipment Management</h2>
                <div className="flex gap-2">
                     <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:bg-white/50'}`}>List</button>
                        <button onClick={() => setViewMode('schedule')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === 'schedule' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:bg-white/50'}`}>Schedule</button>
                    </div>
                    {canManage && <Button>Add Equipment</Button>}
                </div>
            </div>

            {viewMode === 'list' ? (
                <Card>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4 border-b">
                        <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="p-2 border rounded-md bg-white">
                            <option value="all">All Statuses</option>
                            {Object.values(EquipmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))} className="p-2 border rounded-md bg-white">
                            <option value="all">All Types</option>
                            {equipmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                         <select value={filters.project} onChange={e => setFilters(f => ({...f, project: e.target.value}))} className="p-2 border rounded-md bg-white">
                            <option value="all">All Projects</option>
                            <option value="unassigned">Unassigned</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assigned Project</th>
                                    {canManage && <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEquipment.map(item => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><EquipmentStatusBadge status={item.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {item.projectId ? projects.find(p => p.id === item.projectId)?.name : 'N/A'}
                                        </td>
                                        {canManage && <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="relative inline-block text-left" ref={activeDropdown === item.id ? dropdownRef : null}>
                                                <Button variant="ghost" size="sm" onClick={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}>...</Button>
                                                {activeDropdown === item.id && (
                                                    <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                                        <div className="py-1" role="menu" aria-orientation="vertical">
                                                            <button onClick={() => { setModalState({ type: 'assign', equipment: item }); setActiveDropdown(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Schedule Assignment</button>
                                                            {item.status === EquipmentStatus.IN_USE && <button onClick={() => handleUnassign(item.id)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Unassign</button>}
                                                            {item.status !== EquipmentStatus.MAINTENANCE && <button onClick={() => handleUpdateStatus(item.id, EquipmentStatus.MAINTENANCE)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Set Maintenance</button>}
                                                            {item.status !== EquipmentStatus.AVAILABLE && <button onClick={() => handleUpdateStatus(item.id, EquipmentStatus.AVAILABLE)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Set Available</button>}
                                                            <button onClick={() => { setModalState({ type: 'history', equipment: item }); setActiveDropdown(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">View History</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <EquipmentScheduleView user={user} projects={projects} equipment={equipment} assignments={assignments} addToast={addToast} />
            )}
        </div>
    );
};