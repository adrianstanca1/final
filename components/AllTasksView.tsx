import React, { useState, useEffect } from 'react';
import { User, Task, Project } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ViewHeader } from './layout/ViewHeader';
import { api } from '../services/mockApi';

interface AllTasksViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const AllTasksView: React.FC<AllTasksViewProps> = ({ user, addToast }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tasksResult, projectsResult] = await Promise.all([
          api.getTasks(),
          api.getProjects()
        ]);
        setTasks(tasksResult);
        setProjects(projectsResult);
      } catch (error) {
        addToast('Failed to load tasks', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [addToast]);

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const updatedTask = tasks.find(t => t.id === taskId);
      if (updatedTask) {
        const updated = { ...updatedTask, status: newStatus as any };
        await api.updateTask(updated);
        setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
        addToast('Task status updated', 'success');
      }
    } catch (error) {
      addToast('Failed to update task status', 'error');
    }
  };

  if (loading) return <Card>Loading tasks...</Card>;

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
      <ViewHeader
        view="all-tasks"
        title="All Tasks"
        description="Manage all project tasks"
        actions={<Button>Add Task</Button>}
        meta={[
          {
            label: 'Total tasks',
            value: tasks.length.toString(),
            helper: 'All tasks across projects'
          },
          {
            label: 'In progress',
            value: inProgressTasks.length.toString(),
            helper: 'Actively being worked'
          },
          {
            label: 'Completed',
            value: completedTasks.length.toString(),
            helper: 'Finished tasks'
          }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Pending ({pendingTasks.length})</h3>
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
                      onClick={() => handleTaskStatusChange(task.id, 'in_progress')}
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
            <h3 className="text-lg font-semibold mb-4">In Progress ({inProgressTasks.length})</h3>
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
                      onClick={() => handleTaskStatusChange(task.id, 'completed')}
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
            <h3 className="text-lg font-semibold mb-4">Completed ({completedTasks.length})</h3>
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
