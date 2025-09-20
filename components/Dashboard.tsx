import React, { useState, useEffect } from 'react';
import { User, Project, Task, Equipment, SafetyIncident, Permission } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { ViewHeader } from './layout/ViewHeader';
interface DashboardProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  activeView: View;
  setActiveView: (view: View) => void;
  onSelectProject: (project: Project) => void;
}
const KpiCard: React.FC<{ title: string; value: string; subtext?: string; icon: React.ReactNode }> = ({ title, value, subtext, icon }) => (
    <Card className="flex items-center gap-4 animate-card-enter">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-muted text-muted-foreground">
            {icon}
        </div>
        <div>
            <h3 className="font-semibold text-muted-foreground">{title}</h3>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {subtext && <p className="text-sm text-muted-foreground">{subtext}</p>}
        </div>
    </Card>
);

export const Dashboard: React.FC<DashboardProps> = ({ user, addToast, setActiveView, onSelectProject }) => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsResult, tasksResult] = await Promise.all([
          api.getProjects(),
          api.getTasks()
        ]);
        setProjects(projectsResult);
        setTasks(tasksResult);
      } catch (error) {
        addToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [addToast]);

  if (loading) return <Card>Loading dashboard...</Card>;

  const activeProjects = projects.filter(p => p.status === 'in_progress');
  const pendingTasks = tasks.filter(t => t.status === 'pending');

  return (
    <div className="space-y-6">
      <ViewHeader
        view="dashboard"
        title="Dashboard"
        description="Overview of your projects and tasks"
        meta={[
          {
            label: 'Active Projects',
            value: activeProjects.length.toString(),
            helper: 'Projects in progress'
          },
          {
            label: 'Pending Tasks',
            value: pendingTasks.length.toString(),
            helper: 'Tasks awaiting action'
          }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Projects</h3>
            <div className="space-y-3">
              {activeProjects.slice(0, 5).map((project) => (
                <div key={project.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{project.name}</h4>
                    <p className="text-sm text-gray-500">{project.status}</p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => onSelectProject?.(project.id)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Tasks</h3>
            <div className="space-y-3">
              {pendingTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-gray-500">{task.status}</p>
                  </div>
                  <Button variant="secondary" size="sm">
                    View
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
