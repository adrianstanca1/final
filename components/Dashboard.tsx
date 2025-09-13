// full contents of components/Dashboard.tsx

import React from 'react';
import { User, View, Project, Timesheet, Expense, TimesheetStatus, ExpenseStatus, Permission } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { TimesheetStatusBadge } from './ui/StatusBadge';
import { format } from 'date-fns';

interface DashboardProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  activeView: View;
  setActiveView: (view: View) => void;
  onSelectProject: (project: Project) => void;
}

const KpiCard: React.FC<{ title: string; value: string; subtext?: string; icon: React.ReactNode }> = ({ title, value, subtext, icon }) => (
    <Card className="flex items-center gap-4 animate-card-enter">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
            {icon}
        </div>
        <div>
            <h3 className="font-semibold text-slate-600 dark:text-slate-300">{title}</h3>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            {subtext && <p className="text-sm text-slate-500">{subtext}</p>}
        </div>
    </Card>
);

const ProjectHealthIndicator: React.FC<{ project: Project }> = ({ project }) => {
    const budgetUtilization = (project.actualCost / project.budget) * 100;
    let color = 'text-green-500';
    let text = 'On Track';
    if (budgetUtilization > 100) {
        color = 'text-red-500';
        text = 'Over Budget';
    } else if (budgetUtilization > 85) {
        color = 'text-yellow-500';
        text = 'At Risk';
    }
    return <span className={`font-semibold ${color}`}>{text}</span>;
};

export const Dashboard: React.FC<DashboardProps> = ({ user, addToast, setActiveView, onSelectProject }) => {
    const [loading, setLoading] = React.useState(true);
    const [projects, setProjects] = React.useState<Project[]>([]);
    const [pendingTimesheets, setPendingTimesheets] = React.useState<Timesheet[]>([]);
    const [pendingExpenses, setPendingExpenses] = React.useState<Expense[]>([]);
    const [personnel, setPersonnel] = React.useState<User[]>([]);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            const [projData, usersData] = await Promise.all([
                api.getProjectsByCompany(user.companyId),
                api.getUsersByCompany(user.companyId)
            ]);
            setProjects(projData);
            setPersonnel(usersData);

            if (hasPermission(user, Permission.MANAGE_TIMESHEETS)) {
                const tsData = await api.getTimesheetsByCompany(user.companyId, user.id);
                setPendingTimesheets(tsData.filter(t => t.status === TimesheetStatus.PENDING));
            }
            if (hasPermission(user, Permission.MANAGE_EXPENSES)) {
                const exData = await api.getExpensesByCompany(user.companyId);
                setPendingExpenses(exData.filter(e => e.status === ExpenseStatus.PENDING));
            }
        } catch (error) {
            addToast("Failed to load dashboard data.", 'error');
        } finally {
            setLoading(false);
        }
    }, [user, addToast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const activeProjects = projects.filter(p => p.status === 'Active').length;
    const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
    const pendingApprovalsCount = pendingTimesheets.length + pendingExpenses.length;
    
    const userMap = React.useMemo(() => new Map(personnel.map(u => [u.id, u.name])), [personnel]);

    const handleUpdateTimesheetStatus = async (timesheetId: number, status: TimesheetStatus) => {
        // This logic can be expanded with a rejection reason prompt if needed
        try {
            await api.updateTimesheetStatus(timesheetId, status, user.id);
            addToast(`Timesheet ${status.toLowerCase()}.`, 'success');
            fetchData(); // Refresh data
        } catch (error) {
            addToast("Failed to update timesheet.", 'error');
        }
    };

    // FIX: Changed expenseId type to `number | string` to match the Expense type and fix TypeScript error.
    const handleUpdateExpenseStatus = async (expenseId: number | string, status: ExpenseStatus) => {
        try {
            await api.updateExpenseStatus(expenseId, status, user.id);
            addToast(`Expense ${status.toLowerCase()}.`, 'success');
            fetchData(); // Refresh data
        } catch (error) {
            addToast("Failed to update expense.", 'error');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Welcome back, {user.name.split(' ')[0]}!</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KpiCard title="Active Projects" value={activeProjects.toString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>} />
                <KpiCard title="Total Budget" value={`£${(totalBudget / 1_000_000).toFixed(1)}M`} subtext="Across all projects" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                <KpiCard title="Pending Approvals" value={pendingApprovalsCount.toString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <h2 className="font-semibold text-lg mb-4">Projects Overview</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Project Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Health</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Budget Used</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                                {projects.map(p => (
                                    <tr key={p.id} onClick={() => onSelectProject(p)} className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                                        <td className="px-4 py-3 font-medium">{p.name}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{p.status}</td>
                                        <td className="px-4 py-3 text-sm"><ProjectHealthIndicator project={p} /></td>
                                        <td className="px-4 py-3 text-right text-sm">{(p.actualCost / p.budget * 100).toFixed(0)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card>
                    <h2 className="font-semibold text-lg mb-4">Approvals Queue</h2>
                    {pendingApprovalsCount === 0 ? <p className="text-slate-500 text-center py-8">No pending items.</p> : (
                        <div className="space-y-3">
                            {pendingTimesheets.map(ts => (
                                <div key={`ts-${ts.id}`} className="p-2 border-b dark:border-slate-700">
                                    <p className="text-sm font-medium">{userMap.get(ts.userId)}</p>
                                    <p className="text-xs text-slate-500">Timesheet - {format(new Date(ts.clockIn), 'MMM d, yyyy')}</p>
                                    <div className="flex justify-end gap-2 mt-1">
                                        <Button size="sm" variant="success" onClick={() => handleUpdateTimesheetStatus(ts.id, TimesheetStatus.APPROVED)}>Approve</Button>
                                        <Button size="sm" variant="danger" onClick={() => handleUpdateTimesheetStatus(ts.id, TimesheetStatus.REJECTED)}>Reject</Button>
                                    </div>
                                </div>
                            ))}
                             {pendingExpenses.map(ex => (
                                <div key={`ex-${ex.id}`} className="p-2 border-b dark:border-slate-700">
                                    <p className="text-sm font-medium">{userMap.get(ex.userId)}</p>
                                    <p className="text-xs text-slate-500">Expense - £{ex.amount}</p>
                                    <div className="flex justify-end gap-2 mt-1">
                                        <Button size="sm" variant="success" onClick={() => handleUpdateExpenseStatus(ex.id, ExpenseStatus.APPROVED)}>Approve</Button>
                                        <Button size="sm" variant="danger" onClick={() => handleUpdateExpenseStatus(ex.id, ExpenseStatus.REJECTED)}>Reject</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
