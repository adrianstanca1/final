import React, { useState, useEffect } from 'react';
import { User, Project, Task, TaskStatus } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../services/mockApi';

interface ProjectDetailViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  selectedProject?: Project | null;
  onProjectSelect?: (project: Project) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ 
  user, 
  addToast, 
  selectedProject,
  onProjectSelect 
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedProject) {
      loadTasks();
    }
  }, [selectedProject]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const projectTasks = await api.getTasks();
      const filteredTasks = projectTasks.filter(task => task.projectId === selectedProject?.id);
      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      addToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedProject) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Select a Project</h2>
        <p className="text-gray-600">Please select a project to view its details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading project details...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{selectedProject.name}</h1>
        <p className="text-gray-600">{selectedProject.description}</p>
        <div className="mt-4 flex items-center space-x-4">
          <span className={`px-2 py-1 rounded-full text-xs ${
            selectedProject.status === 'active' ? 'bg-green-100 text-green-800' :
            selectedProject.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {selectedProject.status}
          </span>
          <span className="text-sm text-gray-500">
            Due: {new Date(selectedProject.endDate).toLocaleDateString()}
          </span>
        </div>
      </div>

      <Card className="mb-6">
        <Card.Header>
          <Card.Title>Project Tasks</Card.Title>
        </Card.Header>
        <Card.Content>
          {tasks.length === 0 ? (
            <p className="text-gray-500">No tasks found for this project.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    <p className="text-sm text-gray-600">{task.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                    task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.status}
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
