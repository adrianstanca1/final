import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, Equipment, SafetyIncident, Expense, Permission } from '../types';
import { hasPermission } from '../services/auth';

interface DashboardProps {
  user: User;
  setActiveView: (view: string) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value || 0);

export const Dashboard: React.FC<DashboardProps> = ({ user, setActiveView, addToast }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    projects: [] as Project[],
    todos: [] as Todo[],
    equipment: [] as Equipment[],
    incidents: [] as SafetyIncident[],
    expenses: [] as Expense[],
    users: [] as User[],
  });

  const getTaskStatusColor = (todo: Todo): string => {
    if (todo.status === 'DONE') return 'bg-green-500';
    if (new Date(todo.dueDate) < new Date()) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const fetchData = useCallback(async () => {
    if (!user.companyId) return;
    
    setLoading(true);
    try {
      // Mock data for now since we can't import api
      setData({
        projects: [],
        todos: [],
        equipment: [],
        incidents: [],
        expenses: [],
        users: [user],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const activeProjects = data.projects.filter(p => p.status === 'IN_PROGRESS');
    const overdueTodos = data.todos.filter(t => 
      t.status !== 'DONE' && 
      new Date(t.dueDate) < new Date()
    );
    const openIncidents = data.incidents.filter(i => i.status === 'OPEN');
    const pendingExpenses = data.expenses.filter(e => e.status === 'PENDING');
    
    return {
      activeProjects: activeProjects.length,
      overdueTodos: overdueTodos.length,
      openIncidents: openIncidents.length,
      pendingExpenses: pendingExpenses.length,
      totalUsers: data.users.length,
      equipmentCount: data.equipment.length,
    };
  }, [data]);

  // Recent activity
  const recentTodos = useMemo(() => {
    return data.todos
      .filter(t => t.assigneeId === user.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [data.todos, user.id]);

  const recentProjects = useMemo(() => {
    return data.projects
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }, [data.projects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user.firstName}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your projects today.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold">{kpis.activeProjects}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-lg">🏗️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue Tasks</p>
              <p className="text-2xl font-bold">{kpis.overdueTodos}</p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-lg">⚠️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Safety Incidents</p>
              <p className="text-2xl font-bold">{kpis.openIncidents}</p>
            </div>
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 text-lg">🛡️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Expenses</p>
              <p className="text-2xl font-bold">{kpis.pendingExpenses}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600 text-lg">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Team Members</p>
              <p className="text-2xl font-bold">{kpis.totalUsers}</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-lg">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Equipment</p>
              <p className="text-2xl font-bold">{kpis.equipmentCount}</p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-lg">🔧</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white rounded-lg shadow p-6 border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Projects</h2>
            <button
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
              onClick={() => setActiveView('projects')}
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentProjects.map(project => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-gray-600">
                    {project.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {Math.round(project.completionPercentage)}%
                  </p>
                  <p className="text-xs text-gray-600">
                    {project.status.replace('_', ' ').toLowerCase()}
                  </p>
                </div>
              </div>
            ))}
            {recentProjects.length === 0 && (
              <p className="text-center text-gray-600 py-4">
                No recent projects
              </p>
            )}
          </div>
        </div>

        {/* My Tasks */}
        <div className="bg-white rounded-lg shadow p-6 border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">My Recent Tasks</h2>
            <button
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
              onClick={() => setActiveView('tasks')}
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentTodos.map(todo => (
              <div
                key={todo.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getTaskStatusColor(todo)}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{todo.title}</p>
                  <p className="text-sm text-gray-600">
                    Due: {new Date(todo.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {recentTodos.length === 0 && (
              <p className="text-center text-gray-600 py-4">
                No recent tasks assigned
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 border">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <button
            className="h-20 flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setActiveView('projects')}
          >
            <span className="text-xl">🏗️</span>
            <span className="text-xs">Projects</span>
          </button>

          <button
            className="h-20 flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setActiveView('tasks')}
          >
            <span className="text-xl">📋</span>
            <span className="text-xs">Tasks</span>
          </button>

          <button
            className="h-20 flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setActiveView('team')}
          >
            <span className="text-xl">👥</span>
            <span className="text-xs">Team</span>
          </button>

          <button
            className="h-20 flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setActiveView('safety')}
          >
            <span className="text-xl">🛡️</span>
            <span className="text-xs">Safety</span>
          </button>

          {hasPermission(user, Permission.MANAGE_FINANCES) && (
            <button
              className="h-20 flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setActiveView('financials')}
            >
              <span className="text-xl">💰</span>
              <span className="text-xs">Financials</span>
            </button>
          )}

          <button
            className="h-20 flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setActiveView('equipment')}
          >
            <span className="text-xl">🔧</span>
            <span className="text-xs">Equipment</span>
          </button>
        </div>
      </div>
    </div>
  );
};