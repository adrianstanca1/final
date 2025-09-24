import React, { useState, useEffect } from 'react';
import { User, Project, View } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ViewHeader } from './layout/ViewHeader';
import { api } from '../services/mockApi';

interface OwnerDashboardProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  setActiveView?: (view: View) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ 
  user, 
  addToast, 
  setActiveView 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const projectsResult = await api.getProjects();
        setProjects(projectsResult);
      } catch (error) {
        addToast('Failed to load portfolio data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [addToast]);

  if (loading) return <Card>Loading owner dashboard...</Card>;

  const totalValue = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const activeProjects = projects.filter(p => p.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      <ViewHeader
        view="owner-dashboard"
        title="Portfolio Overview"
        description="Monitor the commercial pulse and operational risk across the portfolio."
        actions={
          setActiveView ? (
            <Button variant="secondary" onClick={() => setActiveView('financials')}>
              Open financial workspace
            </Button>
          ) : undefined
        }
        meta={[
          {
            label: 'Portfolio value',
            value: `$${(totalValue / 1000000).toFixed(1)}M`,
            helper: `${activeProjects} active engagements`,
          },
          {
            label: 'Portfolio ROI',
            value: `15%`,
            helper: 'Average return on investment',
          },
        ]}
      />
      
      <div className="grid gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Active Projects</h3>
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => (
                <div key={project.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{project.name}</h4>
                    <p className="text-sm text-gray-500">{project.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(project.budget || 0).toLocaleString()}</p>
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
