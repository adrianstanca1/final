import React, { useState, useEffect } from 'react';
import { User, Project, ProjectStatus } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../services/mockApi';

interface ProjectsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onProjectSelect?: (project: Project) => void;
  selectedProject?: Project | null;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ 
  user, 
  addToast, 
  onProjectSelect,
  selectedProject 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await api.getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
      addToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => addToast('Create project feature coming soon', 'info')}>
          Create Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <Card.Content className="text-center py-8">
            <p className="text-gray-500 mb-4">No projects found.</p>
            <Button onClick={() => addToast('Create project feature coming soon', 'info')}>
              Create Your First Project
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <Card 
              key={project.id} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedProject?.id === project.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => onProjectSelect?.(project)}
            >
              <Card.Header>
                <div className="flex justify-between items-start">
                  <Card.Title className="text-lg">{project.name}</Card.Title>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
              </Card.Header>
              <Card.Content>
                <p className="text-gray-600 mb-4 text-sm">{project.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start Date:</span>
                    <span>{new Date(project.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">End Date:</span>
                    <span>{new Date(project.endDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Budget:</span>
                    <span>${project.budget?.toLocaleString() || 'N/A'}</span>
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsView;
