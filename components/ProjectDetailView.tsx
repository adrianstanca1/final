import React, { useState, useEffect } from 'react';
import { User, Project, Task, TodoStatus, TodoPriority, ProjectStatus } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface ProjectDetailViewProps {
  projectId: string;
  user: User;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ projectId, user }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | TodoStatus>('all');

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        // Mock API calls - replace with actual API
        const mockProject: Project = {
          id: 'project-1',
          name: 'Sample Construction Project',
          description: 'This is a mock project for demonstration purposes',
          status: 'ACTIVE' as ProjectStatus,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          budget: 1000000,
          spent: 250000,
          progress: 25,
          actualCost: 275000,
          companyId: 'company-1',
          clientId: 'client-1',
          managerId: 'manager-1',
          projectType: 'COMMERCIAL',
          workClassification: 'NEW_CONSTRUCTION',
          location: {
            address: '123 Construction St, Building City, BC 12345',
            lat: 49.2827,
            lng: -123.1207
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }; const mockTasks: Task[] = [
          {
            id: '1',
            title: 'Foundation Work',
            description: 'Complete foundation setup',
            status: TodoStatus.IN_PROGRESS,
            priority: TodoPriority.HIGH,
            assignedTo: user.id,
            projectId: projectId,
            dueDate: new Date().toISOString(),
            estimatedHours: 40,
            text: 'Foundation Work',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        setProject(mockProject);
        setTasks(mockTasks);
      } catch (error) {
        console.error('Failed to load project:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadProject();
    }
  }, [projectId, user.id, user.companyId]);

  const filteredTasks = tasks.filter(task =>
    filter === 'all' || task.status === filter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PLANNING':
        return 'bg-blue-100 text-blue-800';
      case 'ON_HOLD':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusColor = (status: TodoStatus) => {
    switch (status) {
      case TodoStatus.TODO:
        return 'bg-red-100 text-red-800';
      case TodoStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800';
      case TodoStatus.DONE:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading project details...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Project not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <div className="border-b border-gray-200 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-semibold">{project.name}</h2>
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
          </div>
        </div>
        <div>
          <p className="text-gray-700 mb-4">{project.description}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Budget:</span> ${project.budget?.toLocaleString() || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Location:</span> {project.location?.address || 'N/A'}
            </div>
          </div>
        </div>
      </Card>

      {/* Tasks Section */}
      <Card>
        <div className="border-b border-gray-200 pb-4 mb-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Tasks</h3>
            <div className="flex space-x-2">
              <Button
                variant={filter === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === TodoStatus.TODO ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter(TodoStatus.TODO)}
              >
                To Do
              </Button>
              <Button
                variant={filter === TodoStatus.IN_PROGRESS ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter(TodoStatus.IN_PROGRESS)}
              >
                In Progress
              </Button>
              <Button
                variant={filter === TodoStatus.DONE ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter(TodoStatus.DONE)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
        <div>
          {filteredTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tasks found</p>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    <p className="text-sm text-gray-600">{task.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getTaskStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ProjectDetailView;
