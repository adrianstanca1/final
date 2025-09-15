import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, Role, Permission, TodoStatus, TodoPriority } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { KanbanBoard } from './KanbanBoard';
import { TaskModal } from './TaskModal';

interface AllTasksViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
}

export const AllTasksView: React.FC<AllTasksViewProps> = ({ user, addToast, isOnline }) => {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [personnel, setPersonnel] = useState<User[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string | number>>(new Set());
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Todo | null>(null);
    const [bulkAction, setBulkAction] = useState({ type: '', value: '' });
    
    const canManage = hasPermission(user, Permission.MANAGE_ALL_TASKS);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            const [projData, usersData] = await Promise.all([
                api.getProjectsByCompany(user.companyId),
                api.getUsersByCompany(user.companyId)
            ]);
            setProjects(projData);
            setPersonnel(usersData);

            if (projData.length > 0) {
                const allTodos = await api.getTodosByProjectIds(projData.map(p => p.id));
                setTodos(allTodos);
            }
        } catch (error) {
            addToast("Failed to load tasks.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredTodos = useMemo(() => {
        if (selectedProjectId === 'all') return todos;
        return todos.filter(t => t.projectId.toString() === selectedProjectId);
    }, [todos, selectedProjectId]);
    
    const handleOpenTaskModal = (task: Todo | null) => {
        setTaskToEdit(task);
        setIsTaskModalOpen(true);
    };

    const handleTaskStatusChange = (taskId: string | number, newStatus: TodoStatus) => {
        const originalTodos = [...todos];
        const updatedTodos = todos.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
        setTodos(updatedTodos);

        // FIX: Ensure taskId is a string for the API call.
        api.updateTodo(String(taskId), { status: newStatus }, user.id)
            .then(updatedTask => setTodos(prev => prev.map(t => t.id === taskId ? updatedTask : t)))
            .catch(() => {
                addToast("Failed to update task. Reverting.", "error");
                setTodos(originalTodos);
            });
    };
    
    const handleTaskSelectionChange = (taskId: string | number) => {
        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) newSet.delete(taskId);
            else newSet.add(taskId);
            return newSet;
        });
    };
    
     const handleTaskModalSuccess = () => {
        // Just refresh all data to ensure dependency graph is correct
        fetchData();
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedTaskIds(new Set(filteredTodos.map(t => t.id)));
        } else {
            setSelectedTaskIds(new Set());
        }
    };

    const handleApplyBulkAction = async () => {
        if (selectedTaskIds.size === 0 || !bulkAction.type || !bulkAction.value) return;

        let updates: Partial<Todo> = {};
        if (bulkAction.type === 'status') updates.status = bulkAction.value as TodoStatus;
        // FIX: Correctly handle unassignment and ensure assigneeId is a string.
        if (bulkAction.type === 'assignee') updates.assigneeId = bulkAction.value === 'unassigned' ? undefined : bulkAction.value;
        if (bulkAction.type === 'priority') updates.priority = bulkAction.value as TodoPriority;

        const originalTodos = [...todos];
        const selectedIdsArray = Array.from(selectedTaskIds);
        setTodos(prev => prev.map(t => selectedIdsArray.includes(t.id) ? { ...t, ...updates } : t));

        try {
            await api.bulkUpdateTodos(selectedIdsArray, updates, user.id);
            addToast(`Bulk update applied successfully.`, 'success');
        } catch (error) {
            addToast("Bulk update failed.", "error");
            setTodos(originalTodos);
        } finally {
            setSelectedTaskIds(new Set());
        }
    };

    if (loading) return <Card>Loading tasks...</Card>;

    const isAllSelected = filteredTodos.length > 0 && selectedTaskIds.size === filteredTodos.length;

    return (
        <div className="space-y-6">
            {isTaskModalOpen && <TaskModal user={user} projects={projects} users={personnel} onClose={() => setIsTaskModalOpen(false)} onSuccess={handleTaskModalSuccess} addToast={addToast} taskToEdit={taskToEdit} allProjectTasks={todos}/>}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">All Tasks</h2>
                {canManage && <Button onClick={() => handleOpenTaskModal(null)}>Add Task</Button>}
            </div>

            <Card>
                <div className="flex flex-wrap gap-4 items-center p-4 border-b">
                    <div className="flex items-center gap-2">
                         <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="h-4 w-4 rounded" />
                         <label>Select All</label>
                    </div>
                    <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="p-2 border rounded bg-white dark:bg-slate-800">
                        <option value="all">All Projects</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                {selectedTaskIds.size > 0 && (
                    <div className="p-4 bg-sky-50 dark:bg-sky-900/50 flex flex-wrap gap-4 items-center">
                        <span className="font-semibold">{selectedTaskIds.size} tasks selected</span>
                        <select onChange={e => setBulkAction({ type: 'status', value: e.target.value })} className="p-2 border rounded bg-white dark:bg-slate-800">
                            <option value="">Change Status...</option>
                            {Object.values(TodoStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                         <select onChange={e => setBulkAction({ type: 'assignee', value: e.target.value })} className="p-2 border rounded bg-white dark:bg-slate-800">
                            <option value="">Change Assignee...</option>
                            <option value="unassigned">Unassigned</option>
                            {personnel.map(p => <option key={p.id} value={p.id}>{`${p.firstName} ${p.lastName}`}</option>)}
                        </select>
                         <select onChange={e => setBulkAction({ type: 'priority', value: e.target.value })} className="p-2 border rounded bg-white dark:bg-slate-800">
                            <option value="">Change Priority...</option>
                            {Object.values(TodoPriority).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <Button onClick={handleApplyBulkAction}>Apply</Button>
                    </div>
                )}
            </Card>
            
            <KanbanBoard
                todos={filteredTodos}
                allTodos={todos}
                user={user}
                personnel={personnel}
                onTaskStatusChange={handleTaskStatusChange}
                onTaskSelectionChange={handleTaskSelectionChange}
                selectedTaskIds={selectedTaskIds}
            />
        </div>
    );
};