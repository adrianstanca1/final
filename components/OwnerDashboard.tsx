import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ViewHeader } from './layout/ViewHeader';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Project, User, KPIs } from '../types';
import { formatCurrency } from '../utils/formatters';

interface OwnerDashboardProps {
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onSelectProject: (project: Project) => void;
  setActiveView: (view: string) => void;
}

interface DashboardData {
  projects: Project[];
  kpis: KPIs | null;
  users: User[];
}

const KpiCard: React.FC<{
  label: string;
  value: string;
  helper?: string;
}> = ({ label, value, helper }) => (
  <Card className="p-4">
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <span className="text-2xl font-bold">{value}</span>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  </Card>
);

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  addToast,
  onSelectProject,
  setActiveView,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    projects: [],
    kpis: null,
    users: [],
  });

  const fetchData = useCallback(async () => {
    if (!user?.companyId) return;

    try {
      setLoading(true);
      const [projects, kpis, users] = await Promise.all([
        api.getProjectsByCompany(user.companyId),
        api.getFinancialKPIsForCompany(user.companyId),
        api.getUsersByCompany(user.companyId),
      ]);

      setData({ projects, kpis, users });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.companyId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const totalProjects = data.projects.length;
    const activeProjects = data.projects.filter(p => p.status === 'ACTIVE').length;
    const completedProjects = data.projects.filter(p => p.status === 'COMPLETED').length;
    
    return {
      totalProjects,
      activeProjects,
      completedProjects,
    };
  }, [data.projects]);

  const recentProjects = useMemo(() => {
    return data.projects
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [data.projects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const currency = data.kpis?.currency ?? 'GBP';

  return (
    <div className="space-y-6">
      <ViewHeader
        title={`Welcome back, ${user?.firstName || user?.name}!`}
        description="Your construction business overview and key metrics."
        action={
          <Button onClick={() => setActiveView('projects')}>
            New Project
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Projects"
          value={stats.totalProjects.toString()}
          helper={`${stats.activeProjects} active`}
        />
        <KpiCard
          label="Active Projects"
          value={stats.activeProjects.toString()}
        />
        <KpiCard
          label="Completed Projects"
          value={stats.completedProjects.toString()}
        />
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(data.kpis?.totalRevenue ?? 0, currency)}
        />
      </div>

      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Projects</h3>
            <Button variant="outline" onClick={() => setActiveView('projects')}>
              View All
            </Button>
          </div>
          
          {recentProjects.length === 0 ? (
            <p className="text-muted-foreground">No projects found.</p>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                  onClick={() => onSelectProject(project)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{project.name}</h4>
                    <p className="text-sm text-muted-foreground">{project.client}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      project.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                      project.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {project.status}
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(project.budget || 0, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActiveView('projects')}
              >
                Manage Projects
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActiveView('financials')}
              >
                Financial Reports
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActiveView('team')}
              >
                Team Management
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Financial Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Revenue</span>
                <span className="font-medium">
                  {formatCurrency(data.kpis?.totalRevenue ?? 0, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding Invoices</span>
                <span className="font-medium">
                  {formatCurrency(data.kpis?.outstandingInvoices ?? 0, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Team Size</span>
                <span className="font-medium">{data.users.length} members</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OwnerDashboard;