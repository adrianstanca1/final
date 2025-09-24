import React, { useState, useEffect } from 'react';
import { User, Project, Task, TodoStatus } from '../types';
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
          id: projectId,
          name: 'Sample Project',
          description: 'Project description',
          status: 'ACTIVE',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          budget: 100000,
          companyId: user.companyId,
          clientId: 'client1',
          managerId: user.id,
          location: {
            address: 'Sample Address',
            lat: 40.7128,
            lng: -74.0060
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const mockTasks: Task[] = [
          {
            id: '1',
            title: 'Foundation Work',
            description: 'Complete foundation setup',
            status: TodoStatus.IN_PROGRESS,
            priority: 'HIGH',
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
        <Card.Header>
          <div className="flex justify-between items-start">
            <Card.Title className="text-2xl">{project.name}</Card.Title>
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
          </div>
        </Card.Header>
        <Card.Content>
          <p className="text-gray-700 mb-4">{project.description}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Budget:</span> ${project.budget?.toLocaleString() || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Location:</span> {project.location?.address || 'N/A'}
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Tasks Section */}
      <Card>
        <Card.Header>
          <div className="flex justify-between items-center">
            <Card.Title>Tasks</Card.Title>
            <div className="flex space-x-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === TodoStatus.TODO ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(TodoStatus.TODO)}
              >
                To Do
              </Button>
              <Button
                variant={filter === TodoStatus.IN_PROGRESS ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(TodoStatus.IN_PROGRESS)}
              >
                In Progress
              </Button>
              <Button
                variant={filter === TodoStatus.DONE ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(TodoStatus.DONE)}
              >
                Done
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Content>
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
        </Card.Content>
      </Card>
    </div>
  );
};

export default ProjectDetailView;
