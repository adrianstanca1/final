// full contents of components/Dashboard.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Project, Permission, View, Timesheet, TimesheetStatus, AuditLog, Role, CompanyHealthStats, PendingApproval, ExpenseStatus } from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface DashboardProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  activeView: View;
  setActiveView: (view: View) => void;
  onSelectProject: (project: Project) => void;
}

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color?: string; children?: React.ReactNode }> = ({ title, value, icon, color = 'bg-slate-100 text-slate-600', children }) => (
    <Card className="flex flex-col">
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-slate-600">{title}</h3>
                <p className="text-3xl font-bold text-slate-800">{value}</p>
            </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
    </Card>
);

const ToolCard: React.FC<{ title: string; icon: React.ReactNode; onClick: () => void; }> = ({ title, icon, onClick }) => (
    <button
        onClick={onClick}
        className="group flex flex-col justify-between p-4 bg-white rounded-xl cursor-pointer hover:bg-slate-50 transition-all border border-slate-200/80 shadow-sm hover:shadow-lg dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 min-h-28 text-left"
    >
        <div className="text-slate-500 group-hover:text-sky-600 transition-colors dark:text-slate-400 dark:group-hover:text-sky-400">
           {icon}
        </div>
        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{title}</p>
    </button>
);

const ActivityIcon: React.FC<{ action: string }> = ({ action }) => {
    const iconMap: { [key: string]: React.ReactNode } = {
        completed_task: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>,
        approved_timesheet: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-500" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm10 4a1 1 0 10-2 0v.01a1 1 0 102 0V9zm-4 0a1 1 0 10-2 0v.01a1 1 0 102 0V9zm2 2a1 1 0 100 2h.01a1 1 0 100-2H12zm-4 0a1 1 0 100 2h.01a1 1 0 100-2H8z" clipRule="evenodd" /></svg>,
        reported_safety_incident: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
        uploaded_document: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.414l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L13 9.414V13h-1.5z" /><path d="M9 13h2v5a1 1 0 11-2 0v-5z" /></svg>,
        added_comment_to_task: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.083-3.25A8.84 8.84 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM4.832 14.168L5.92 11.25A6.983 6.983 0 004 10c0-2.651 2.46-5 6-5s6 2.349 6 5-2.46 5-6 5a7.03 7.03 0 00-2.25-.332z" clipRule="evenodd" /></svg>,
        created_project: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>,
    };
    const defaultIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>;
    
    return iconMap[action] || defaultIcon;
};

const formatDistanceToNow = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;
    return `${Math.floor(seconds)}s ago`;
};

const ActivityFeedItem: React.FC<{ log: AuditLog; users: Map<number, User> }> = ({ log, users }) => {
    const actorName = users.get(log.actorId)?.name || 'Unknown User';
    const formattedAction = log.action.replace(/_/g, ' ');
    const targetType = log.target?.type.toLowerCase() || '';

    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-1">
                <ActivityIcon action={log.action} />
            </div>
            <div className="text-sm">
                <p className="text-slate-700">
                    <span className="font-semibold">{actorName}</span> {formattedAction}
                    {log.target && ` ${targetType} `}
                    {log.target && <span className="font-semibold text-slate-800">"{log.target.name}"</span>}
                </p>
                <p className="text-xs text-slate-400">{formatDistanceToNow(log.timestamp)}</p>
            </div>
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ user, addToast, setActiveView, onSelectProject }) => {
    const [loading, setLoading] = useState(true);
    const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
    const [users, setUsers] = useState<Map<number, User>>(new Map());
    const [healthStats, setHealthStats] = useState<CompanyHealthStats | null>(null);
    const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);

    const isAdmin = user.role === Role.ADMIN;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            
            const usersPromise = api.getUsersByCompany(user.companyId);
            const activityPromise = api.getDashboardActivityLogs(user.companyId);
            const healthPromise = isAdmin ? api.getCompanyHealthStats(user.companyId) : Promise.resolve(null);
            const approvalsPromise = isAdmin ? api.getPendingApprovals(user.companyId, user.id) : Promise.resolve([]);

            const [fetchedUsers, fetchedActivity, fetchedHealth, fetchedApprovals] = await Promise.all([
                usersPromise, activityPromise, healthPromise, approvalsPromise
            ]);
                
            setUsers(new Map(fetchedUsers.map(u => [u.id, u])));
            setActivityLogs(fetchedActivity);
            setHealthStats(fetchedHealth);
            setPendingApprovals(fetchedApprovals);

        } catch (error) {
            addToast("Failed to load dashboard data.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, addToast, isAdmin]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleUpdateTimesheetStatus = async (timesheetId: number, status: TimesheetStatus) => {
        try {
            await api.updateTimesheetStatus(timesheetId, status, user.id, status === TimesheetStatus.REJECTED ? 'Rejected from dashboard' : undefined);
            addToast(`Timesheet ${status.toLowerCase()}.`, 'success');
            fetchData(); // Refresh data after action
        } catch(e) {
            addToast('Failed to update timesheet status.', 'error');
        }
    };
    
    // FIX: Changed expenseId to accept number | string to match the type from PendingApproval.
    const handleUpdateExpenseStatus = async (expenseId: number | string, status: ExpenseStatus) => {
        try {
            await api.updateExpenseStatus(expenseId, status, user.id, status === ExpenseStatus.REJECTED ? 'Rejected from dashboard' : undefined);
            addToast(`Expense ${status.toLowerCase()}.`, 'success');
            fetchData(); // Refresh data after action
        } catch(e) {
            addToast('Failed to update expense status.', 'error');
        }
    };

    const availableTools = useMemo(() => {
    return [
      { view: 'projects', label: 'Projects', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>, permission: hasPermission(user, Permission.VIEW_ASSIGNED_PROJECTS) || hasPermission(user, Permission.VIEW_ALL_PROJECTS) },
      { view: 'timesheets', label: 'Timesheets', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>, permission: hasPermission(user, Permission.MANAGE_TIMESHEETS) || hasPermission(user, Permission.VIEW_ALL_TIMESHEETS) },
      { view: 'safety', label: 'Safety', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, permission: hasPermission(user, Permission.VIEW_SAFETY_REPORTS) },
      { view: 'users', label: 'Team', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, permission: hasPermission(user, Permission.VIEW_TEAM) },
      { view: 'documents', label: 'Documents', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, permission: hasPermission(user, Permission.VIEW_DOCUMENTS) },
      { view: 'financials', label: 'Financials', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, permission: hasPermission(user, Permission.VIEW_FINANCES) },
    ].filter(tool => tool.permission);
  }, [user]);

    if (loading) {
        return <Card><p>Loading dashboard...</p></Card>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-slate-800">Welcome back, {user.name.split(' ')[0]}!</h1>
            
            {isAdmin && healthStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <KpiCard title="Total Users" value={healthStats.totalUsers} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
                    <KpiCard title="Active Projects" value={healthStats.activeProjects} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} />
                    <KpiCard title="Storage Usage" value={`${healthStats.storageUsageGB.toFixed(1)} GB`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>}>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${(healthStats.storageUsageGB / healthStats.storageCapacityGB) * 100}%`}}></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 text-right">{healthStats.storageCapacityGB} GB Plan</p>
                    </KpiCard>
                </div>
            )}
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    {isAdmin && (
                        <Card>
                            <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                                {pendingApprovals.map(item => (
                                    <div key={item.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                                        <p className="text-sm">{item.description}</p>
                                        <div className="flex gap-2">
                                            {item.type === 'Timesheet' && item.timesheetId && (
                                                <>
                                                    <Button size="sm" variant="success" onClick={() => handleUpdateTimesheetStatus(item.timesheetId!, TimesheetStatus.APPROVED)}>Approve</Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleUpdateTimesheetStatus(item.timesheetId!, TimesheetStatus.REJECTED)}>Reject</Button>
                                                </>
                                            )}
                                            {item.type === 'Expense' && item.expenseId && (
                                                 <>
                                                    <Button size="sm" variant="success" onClick={() => handleUpdateExpenseStatus(item.expenseId!, ExpenseStatus.APPROVED)}>Approve</Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleUpdateExpenseStatus(item.expenseId!, ExpenseStatus.REJECTED)}>Reject</Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {pendingApprovals.length === 0 && <p className="text-center text-slate-500 py-8">No pending approvals.</p>}
                            </div>
                        </Card>
                    )}
                    <Card>
                        <h2 className="text-xl font-semibold mb-4">Admin Tools</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {availableTools.map(tool => (
                                <ToolCard 
                                    key={tool.view}
                                    title={tool.label} 
                                    icon={tool.icon} 
                                    onClick={() => setActiveView(tool.view as View)}
                                />
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="xl:col-span-1">
                    <Card>
                         <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                         <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-2">
                            {activityLogs.map(log => <ActivityFeedItem key={log.id} log={log} users={users} />)}
                            {activityLogs.length === 0 && <p className="text-center text-slate-500 py-8">No recent activity.</p>}
                         </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};