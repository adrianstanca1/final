import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Todo, Equipment, SafetyIncident, Expense, Role, Permission, ProjectPortfolioSummary, OperationalInsights } from '../types';
// import { Card } from './ui/Card';
// import { Button } from './ui/Button';
// import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { formatCurrency } from '../utils/finance';


interface DashboardProps {
    user: User;
    setActiveView: (view: string) => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, setActiveView, addToast }) => {
    const [loading, setLoading] = useState(true);

    const getTaskStatusColor = (todo: Todo): string => {
        if (todo.status === 'DONE') return 'bg-green-500';
        if (new Date(todo.dueDate) < new Date()) return 'bg-red-500';
        return 'bg-yellow-500';
    };
    const [data, setData] = useState({
        projects: [] as Project[],
        todos: [] as Todo[],
        equipment: [] as Equipment[],
        incidents: [] as SafetyIncident[],
        expenses: [] as Expense[],
        users: [] as User[],
        portfolio: null as ProjectPortfolioSummary | null,
        insights: null as OperationalInsights | null,
    });



    const fetchData = useCallback(async () => {
        if (!user.companyId) return;

        setLoading(true);
        try {
            const [
                projectsData,
                todosData,
                equipmentData,
                incidentsData,
                expensesData,
                usersData,
                portfolioData,
                insightsData,
            ] = await Promise.all([
                api.getProjects(),
                api.getTodos(),
                api.getEquipment(),
                api.getSafetyIncidents(),
                api.getExpenses(),
                api.getUsers(),
                api.getProjectPortfolioSummary().catch(() => null),
                api.getOperationalInsights().catch(() => null),
            ]);

            setData({
                projects: projectsData,
                todos: todosData,
                equipment: equipmentData,
                incidents: incidentsData,
                expenses: expensesData,
                users: usersData,
                portfolio: portfolioData,
                insights: insightsData,
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            addToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

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
                <div />;
            </div>



            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Active Projects</p>
                            <p className="text-2xl font-bold">{kpis.activeProjects}</p>
                        </div>
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-lg">🏗️</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Overdue Tasks</p>
                            <p className="text-2xl font-bold">{kpis.overdueTodos}</p>
                        </div>
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 text-lg">⚠️</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Safety Incidents</p>
                            <p className="text-2xl font-bold">{kpis.openIncidents}</p>
                        </div>
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600 text-lg">🛡️</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Pending Expenses</p>
                            <p className="text-2xl font-bold">{kpis.pendingExpenses}</p>
                        </div>
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <span className="text-yellow-600 text-lg">💰</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Team Members</p>
                            <p className="text-2xl font-bold">{kpis.totalUsers}</p>
                        </div>
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 text-lg">👥</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Equipment</p>
                            <p className="text-2xl font-bold">{kpis.equipmentCount}</p>
                        </div>
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 text-lg">🔧</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Projects */}
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Recent Projects</h2>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActiveView('projects')}
                        >
                            View All
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {recentProjects.map(project => (
                            <div
                                key={project.id}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                                <div>
                                    <p className="font-medium">{project.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {project.location}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">
                                        {Math.round(project.completionPercentage)}%
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {project.status.replace('_', ' ').toLowerCase()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {recentProjects.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">
                                No recent projects
                            </p>
                        )}
                    </div>
                </Card>

                {/* My Tasks */}
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">My Recent Tasks</h2>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActiveView('tasks')}
                        >
                            View All
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {recentTodos.map(todo => (
                            <div
                                key={todo.id}
                                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                            >
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getTaskStatusColor(todo)}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{todo.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Due: {new Date(todo.dueDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {recentTodos.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">
                                No recent tasks assigned
                            </p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Portfolio Summary - Only for managers */}
            {(user.role === Role.PROJECT_MANAGER || user.role === Role.OWNER) && data.portfolio && (
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Portfolio Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Budget</p>
                            <p className="text-xl font-bold">
                                {formatCurrency(data.portfolio.totalBudget)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Allocated</p>
                            <p className="text-xl font-bold">
                                {formatCurrency(data.portfolio.allocatedBudget)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Spent</p>
                            <p className="text-xl font-bold">
                                {formatCurrency(data.portfolio.spentBudget)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Remaining</p>
                            <p className="text-xl font-bold">
                                {formatCurrency(data.portfolio.remainingBudget)}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Quick Actions */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <Button
                        variant="secondary"
                        className="h-20 flex-col gap-2"
                        onClick={() => setActiveView('projects')}
                    >
                        <span className="text-xl">🏗️</span>
                        <span className="text-xs">Projects</span>
                    </Button>

                    <Button
                        variant="secondary"
                        className="h-20 flex-col gap-2"
                        onClick={() => setActiveView('tasks')}
                    >
                        <span className="text-xl">📋</span>
                        <span className="text-xs">Tasks</span>
                    </Button>

                    <Button
                        variant="secondary"
                        className="h-20 flex-col gap-2"
                        onClick={() => setActiveView('team')}
                    >
                        <span className="text-xl">👥</span>
                        <span className="text-xs">Team</span>
                    </Button>

                    <Button
                        variant="secondary"
                        className="h-20 flex-col gap-2"
                        onClick={() => setActiveView('safety')}
                    >
                        <span className="text-xl">🛡️</span>
                        <span className="text-xs">Safety</span>
                    </Button>

                    {hasPermission(user, Permission.MANAGE_FINANCES) && (
                        <Button
                            variant="secondary"
                            className="h-20 flex-col gap-2"
                            onClick={() => setActiveView('financials')}
                        >
                            <span className="text-xl">💰</span>
                            <span className="text-xs">Financials</span>
                        </Button>
                    )}

                    <Button
                        variant="secondary"
                        className="h-20 flex-col gap-2"
                        onClick={() => setActiveView('equipment')}
                    >
                        <span className="text-xl">🔧</span>
                        <span className="text-xs">Equipment</span>
                    </Button>
                </div>
            </Card>
        </div>
    );
};