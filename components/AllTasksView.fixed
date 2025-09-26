import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Project, Todo, Role, Permission, TodoStatus, TodoPriority } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { Button } from './ui/Button';
import { KanbanBoard } from './KanbanBoard';
import { TaskModal } from './TaskModal';
import { ViewHeader } from './layout/ViewHeader';
import { Avatar } from './ui/Avatar';

interface AllTasksViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
}

const TaskDetailModal: React.FC<{
  task: Todo;
  user: User;
  projects: Project[];
  personnel: User[];
  allTasksForProject: Todo[];
  onClose: () => void;
  onUpdateTask: (task: Todo, updates: Partial<Todo>) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ task, user, projects, personnel, allTasksForProject, onClose, onUpdateTask, addToast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableTask, setEditableTask] = useState<Todo>(task);
  const [newComment, setNewComment] = useState('');

  useEffect(() => { setEditableTask(task); }, [task]);

  const canManage = hasPermission(user, Permission.MANAGE_TASKS);
  const isTaskDone = task.status === TodoStatus.DONE;
  
  const allOtherTasks = useMemo(() => {
    return allTasksForProject.filter(t => t.id !== task.id);
  }, [allTasksForProject, task.id]);

  const dependencies = useMemo(() => {
    return (task.dependsOn || []).map(depId => allTasksForProject.find(t => t.id === depId)).filter(Boolean) as Todo[];
  }, [task.dependsOn, allTasksForProject]);

  const dependents = useMemo(() => {
    return allTasksForProject.filter(t => t.dependsOn?.includes(task.id));
  }, [allTasksForProject, task.id]);

  const areDependenciesMet = useMemo(() => {
    return dependencies.every(dep => dep.status === TodoStatus.DONE);
  }, [dependencies]);

  const handleSave = async () => {
    try {
      onUpdateTask(task, editableTask);
      setIsEditing(false);
      addToast('Task updated successfully', 'success');
    } catch (error) {
      addToast('Failed to update task', 'error');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      const comment = {
        id: Date.now().toString(),
        userId: user.id,
        content: newComment,
        createdAt: new Date().toISOString(),
      };
      
      const updatedComments = [...(task.comments || []), comment];
      onUpdateTask(task, { comments: updatedComments });
      setNewComment('');
      addToast('Comment added', 'success');
    } catch (error) {
      addToast('Failed to add comment', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Task Details</h2>
          <button onClick={onClose} title="Close modal" className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Task content would go here */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-lg">{task.text}</h3>
              <p className="text-sm text-gray-500">Status: {task.status}</p>
            </div>
            
            {/* Dependencies */}
            {dependencies.length > 0 && (
              <div>
                <h4 className="font-medium">Dependencies</h4>
                <ul className="text-sm text-gray-600">
                  {dependencies.map(dep => (
                    <li key={dep.id}>{dep.text} ({dep.status})</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Comments */}
            <div>
              <h4 className="font-medium">Comments</h4>
              <div className="space-y-2">
                {(task.comments || []).map(comment => (
                  <div key={comment.id} className="p-2 bg-gray-50 rounded">
                    <p className="text-sm">{comment.content}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              
              {canManage && (
                <div className="mt-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full p-2 border rounded"
                    rows={3}
                  />
                  <Button onClick={handleAddComment} className="mt-2">
                    Add Comment
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AllTasksView: React.FC<AllTasksViewProps> = ({ user, addToast, isOnline }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bulkAction, setBulkAction] = useState<{ type: string; value: string }>({ type: '', value: '' });
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showCompleted, setShowCompleted] = useState(false);

  const canManage = hasPermission(user, Permission.MANAGE_TASKS);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [todosData, projectsData, personnelData] = await Promise.all([
        api.getTodos(),
        api.getProjects(),
        api.getUsers(),
      ]);
      
      setTodos(todosData);
      setProjects(projectsData);
      setPersonnel(personnelData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      if (selectedProjectId !== 'all' && todo.projectId !== selectedProjectId) {
        return false;
      }
      return todo.status !== TodoStatus.DONE;
    });
  }, [todos, selectedProjectId]);

  const completedTasks = useMemo(() => {
    return todos.filter(todo => {
      if (selectedProjectId !== 'all' && todo.projectId !== selectedProjectId) {
        return false;
      }
      return todo.status === TodoStatus.DONE;
    });
  }, [todos, selectedProjectId]);

  const projectMap = useMemo(() => {
    return new Map(projects.map(p => [p.id, p.name]));
  }, [projects]);

  const personnelMap = useMemo(() => {
    return new Map(personnel.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
  }, [personnel]);

  const taskSummary = useMemo(() => {
    const all = filteredTodos.length;
    const inProgress = filteredTodos.filter(t => t.status === TodoStatus.IN_PROGRESS).length;
    const overdue = filteredTodos.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TodoStatus.DONE
    ).length;
    
    return { all, inProgress, overdue };
  }, [filteredTodos]);

  const isAllSelected = selectedTaskIds.size > 0 && selectedTaskIds.size === filteredTodos.length;

  const handleTaskSelectionChange = useCallback((taskIds: Set<string>) => {
    setSelectedTaskIds(taskIds);
  }, []);

  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: TodoStatus) => {
    try {
      const task = todos.find(t => t.id === taskId);
      if (!task) return;

      const updatedTask = {
        ...task,
        status: newStatus,
        completedAt: newStatus === TodoStatus.DONE ? new Date().toISOString() : undefined,
        completedBy: newStatus === TodoStatus.DONE ? user.id : undefined,
      };

      await api.updateTodo(taskId, updatedTask);
      setTodos(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      addToast('Task status updated', 'success');
    } catch (error) {
      addToast('Failed to update task status', 'error');
    }
  }, [todos, user.id, addToast]);

  const handleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
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

    try {
      const updates: Partial<Todo> = {};
      
      if (bulkAction.type === 'status') {
        updates.status = bulkAction.value as TodoStatus;
        if (bulkAction.value === TodoStatus.DONE) {
          updates.completedAt = new Date().toISOString();
          updates.completedBy = user.id;
        }
      } else if (bulkAction.type === 'assignee') {
        updates.assigneeId = bulkAction.value === 'unassigned' ? undefined : bulkAction.value;
      } else if (bulkAction.type === 'priority') {
        updates.priority = bulkAction.value as TodoPriority;
      }

      const promises = Array.from(selectedTaskIds).map(taskId => 
        api.updateTodo(taskId, updates)
      );

      await Promise.all(promises);
      
      setTodos(prev => prev.map(task => 
        selectedTaskIds.has(task.id) ? { ...task, ...updates } : task
      ));
      
      setSelectedTaskIds(new Set());
      setBulkAction({ type: '', value: '' });
      addToast(`Updated ${selectedTaskIds.size} tasks`, 'success');
    } catch (error) {
      addToast('Failed to update tasks', 'error');
    }
  };

  const handleUpdateTask = useCallback(async (task: Todo, updates: Partial<Todo>) => {
    try {
      const updatedTask = { ...task, ...updates };
      await api.updateTodo(task.id, updatedTask);
      setTodos(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    } catch (error) {
      throw error;
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ViewHeader
        title="All Tasks"
        subtitle="Manage and track all project tasks"
        stats={[
          {
            label: 'Total',
            value: `${taskSummary.all}`,
            helper: 'Open tasks across all projects',
            indicator: 'neutral',
          },
          {
            label: 'In Progress',
            value: `${taskSummary.inProgress}`,
            helper: 'Actively being worked',
            indicator: taskSummary.inProgress > 0 ? 'positive' : 'neutral',
          },
          {
            label: 'Overdue',
            value: `${taskSummary.overdue}`,
            helper: taskSummary.overdue > 0 ? 'Needs attention' : 'On track',
            indicator: taskSummary.overdue > 0 ? 'negative' : 'positive',
          },
        ]}
      />

      {viewMode === 'list' ? (
        <Card className="p-0">
          <div className="flex flex-wrap items-center gap-4 px-4 py-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input 
                type="checkbox" 
                checked={isAllSelected} 
                onChange={handleSelectAll} 
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary" 
              />
              Select all
            </label>
            <select
              title="Filter by project"
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
            >
              <option value="all">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                Kanban
              </Button>
            </div>
          </div>
          
          {selectedTaskIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-4 border-t border-border bg-primary/5 px-4 py-4 text-sm">
              <span className="font-semibold text-foreground">{selectedTaskIds.size} task(s) selected</span>
              <select
                title="Bulk change status"
                onChange={e => setBulkAction({ type: 'status', value: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
              >
                <option value="">Change status...</option>
                {Object.values(TodoStatus).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <select
                title="Bulk change assignee"
                onChange={e => setBulkAction({ type: 'assignee', value: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
              >
                <option value="">Change assignee...</option>
                <option value="unassigned">Unassigned</option>
                {personnel.map(p => <option key={p.id} value={p.id}>{`${p.firstName} ${p.lastName}`}</option>)}
              </select>
              <select
                title="Bulk change priority"
                onChange={e => setBulkAction({ type: 'priority', value: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
              >
                <option value="">Change priority...</option>
                {Object.values(TodoPriority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <Button onClick={handleApplyBulkAction}>Apply</Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {canManage && (
                    <th className="px-6 py-3">
                      <input 
                        type="checkbox" 
                        title="Select all tasks" 
                        onChange={handleSelectAll} 
                        checked={isAllSelected}
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assignee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTodos.map(task => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TodoStatus.DONE;
                  const taskDependencies = (task.dependsOn || []).map(depId => todos.find(t => t.id === depId)).filter(Boolean) as Todo[];
                  const isTaskBlocked = taskDependencies.some(dep => dep.status !== TodoStatus.DONE);
                  
                  return (
                    <tr 
                      key={task.id} 
                      className={`hover:bg-slate-50 ${isTaskBlocked ? 'opacity-60' : 'cursor-pointer'}`} 
                      onClick={() => !isTaskBlocked && setSelectedTask(task)}
                    >
                      {canManage && (
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedTaskIds.has(task.id)} 
                            onChange={() => handleTaskSelection(task.id)} 
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-2">
                          {isTaskBlocked && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span>{task.text}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{projectMap.get(task.projectId)}</td>
                      <td className="px-6 py-4 text-sm">
                        {task.assigneeId ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={personnelMap.get(task.assigneeId) || ''} className="w-6 h-6 text-xs" />
                            <span>{personnelMap.get(task.assigneeId)}</span>
                          </div>
                        ) : 'Unassigned'}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <PriorityDisplay priority={task.priority} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-800">
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredTodos.length === 0 && (
            <p className="text-center py-8 text-slate-500">No open tasks match your filters.</p>
          )}

          {/* Completed Tasks Section */}
          <div className="mt-8 px-4 pb-4">
            <details open={showCompleted} onToggle={(e) => setShowCompleted((e.target as HTMLDetailsElement).open)}>
              <summary className="font-semibold text-lg cursor-pointer py-2">
                Completed Tasks ({completedTasks.length})
              </summary>
              <div className="mt-4 space-y-3 pl-4 border-l-2">
                {completedTasks.map(task => (
                  <div key={task.id} className="p-3 bg-slate-50 rounded-r-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="line-through text-slate-600">{task.text}</p>
                        <p className="text-xs text-slate-500">in {projectMap.get(task.projectId)}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>Completed by {personnelMap.get(task.completedBy!) || 'Unknown'}</p>
                      {task.completedAt && <p>{new Date(task.completedAt).toLocaleDateString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </Card>
      ) : (
        <KanbanBoard
          todos={filteredTodos}
          allTodos={todos}
          user={user}
          personnel={personnel}
          onTaskStatusChange={handleTaskStatusChange}
          onTaskSelectionChange={handleTaskSelectionChange}
          selectedTaskIds={selectedTaskIds}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          user={user}
          projects={projects}
          personnel={personnel}
          allTasksForProject={todos.filter(t => t.projectId === selectedTask.projectId)}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTask}
          addToast={addToast}
        />
      )}

      {showTaskModal && canManage && (
        <TaskModal
          user={user}
          projects={projects}
          personnel={personnel}
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => {
            setShowTaskModal(false);
            fetchData();
          }}
          addToast={addToast}
        />
      )}
    </div>
  );
};