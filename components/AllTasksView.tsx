import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Todo, Project, TodoStatus, TodoPriority, Permission } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ViewHeader } from './layout/ViewHeader';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';

interface AllTasksViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline?: boolean;
};

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
  const abortControllerRef = useRef<AbortController | null>(null);

  const taskSummary = useMemo(() => {
    const total = todos.length;
    const inProgress = todos.filter(t => t.status === TodoStatus.IN_PROGRESS).length;
    const completed = todos.filter(t => t.status === TodoStatus.DONE).length;
    const overdue = todos.filter(t => {
      if (!t.dueDate || t.status === TodoStatus.DONE) return false;
      const due = new Date(t.dueDate);
      return !Number.isNaN(due.getTime()) && due < new Date();
    }).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, inProgress, completed, overdue, completionRate };
  }, [todos]);

  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      if (!user.companyId) return;
      const [projData, usersData] = await Promise.all([
        api.getProjectsByCompany(user.companyId, { signal: controller.signal }),
        api.getUsersByCompany(user.companyId, { signal: controller.signal })
      ]);
      if (controller.signal.aborted) return;
      setProjects(projData);
      if (controller.signal.aborted) return;
      setPersonnel(usersData);

      if (projData.length > 0) {
        const allTodos = await api.getTodosByProjectIds(projData.map(p => p.id), { signal: controller.signal });
        if (controller.signal.aborted) return;
        setTodos(allTodos);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        addToast("Failed to load tasks.", "error");
      }
    } finally {
      if (controller.signal.aborted) return;
      setLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => {
    fetchData();
    return () => {
      abortControllerRef.current?.abort();
    };
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

  const pendingTasks = todos.filter(t => t.status === TodoStatus.TODO);
  const inProgressTasks = todos.filter(t => t.status === TodoStatus.IN_PROGRESS);
  const completedTasks = todos.filter(t => t.status === TodoStatus.DONE);

  return (
    <div className="space-y-6">
      <ViewHeader
        title="All Tasks"
        description="Manage all project tasks"
        isOnline={!!isOnline}
        actions={<Button>Add Task</Button>}
        meta={[
          {
            label: 'Total tasks',
            value: taskSummary.total.toString(),
            helper: 'All tasks across projects'
          },
          {
            label: 'In progress',
            value: taskSummary.inProgress.toString(),
            helper: 'Actively being worked'
          },
          {
            label: 'Completed',
            value: taskSummary.completed.toString(),
            helper: 'Finished tasks'
          }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Pending ({pendingTasks.length}) </h3>
            <div className="space-y-3">
              {pendingTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="p-3 border rounded-lg">
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-sm text-gray-500">{task.description}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">{task.priority}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTaskStatusChange(task.id, TodoStatus.IN_PROGRESS)}
                    >
                      Start
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">In Progress ({inProgressTasks.length}) </h3>
            <div className="space-y-3">
              {inProgressTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="p-3 border rounded-lg">
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-sm text-gray-500">{task.description}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">{task.priority}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTaskStatusChange(task.id, TodoStatus.DONE)}
                    >
                      Complete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Completed ({completedTasks.length}) </h3>
            <div className="space-y-3">
              {completedTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="p-3 border rounded-lg opacity-75">
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-sm text-gray-500">{task.description}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-green-600">✓ Completed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
