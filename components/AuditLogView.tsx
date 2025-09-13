import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, AuditLog } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';

interface AuditLogViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

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

const downloadCsv = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            let cell = row[header];
            if (cell === null || cell === undefined) {
                return '';
            }
            if (typeof cell === 'object') {
                cell = JSON.stringify(cell).replace(/"/g, '""');
            }
            const strCell = String(cell);
            if (strCell.includes(',') || strCell.includes('"') || strCell.includes('\n')) {
                return `"${strCell.replace(/"/g, '""')}"`;
            }
            return strCell;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const AuditLogView: React.FC<AuditLogViewProps> = ({ user, addToast }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [users, setUsers] = useState<Map<number, User>>(new Map());
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        user: 'all',
        action: 'all',
        startDate: '',
        endDate: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (!user.companyId) return;
            const [logsData, usersData] = await Promise.all([
                api.getAuditLogsByCompany(user.companyId),
                api.getUsersByCompany(user.companyId),
            ]);
            setLogs(logsData);
            setUsers(new Map(usersData.map(u => [u.id, u])));
        } catch (error) {
            addToast("Failed to load audit logs.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const uniqueActionTypes = useMemo(() => {
        return [...new Set(logs.map(log => log.action))];
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const userMatch = filters.user === 'all' || log.actorId.toString() === filters.user;
            const actionMatch = filters.action === 'all' || log.action === filters.action;
            const date = new Date(log.timestamp);
            const startDateMatch = !filters.startDate || date >= new Date(filters.startDate);
            const endDateMatch = !filters.endDate || date <= new Date(new Date(filters.endDate).setHours(23, 59, 59, 999));
            return userMatch && actionMatch && startDateMatch && endDateMatch;
        });
    }, [logs, filters]);

    const handleExport = () => {
        if (filteredLogs.length === 0) {
            addToast("No logs to export.", "error");
            return;
        }
        
        const dataToExport = filteredLogs.map(log => ({
            timestamp: new Date(log.timestamp).toISOString(),
            actorId: log.actorId,
            actorName: users.get(log.actorId)?.name || 'Unknown',
            action: log.action,
            targetType: log.target?.type || '',
            targetId: log.target?.id || '',
            targetName: log.target?.name || ''
        }));
        
        const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
        downloadCsv(dataToExport, filename);
        addToast("Audit log exported successfully.", "success");
    };

    if (loading) {
        return <Card><p>Loading audit logs...</p></Card>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h2 className="text-3xl font-bold text-slate-800">Audit Log</h2>
                 <Button onClick={handleExport} variant="secondary" disabled={filteredLogs.length === 0}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export to CSV
                </Button>
            </div>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pb-4 border-b">
                    <select value={filters.user} onChange={e => setFilters(f => ({ ...f, user: e.target.value }))} className="w-full p-2 border bg-white rounded-md">
                        <option value="all">All Users</option>
                        {Array.from(users.values()).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} className="w-full p-2 border bg-white rounded-md">
                        <option value="all">All Actions</option>
                        {uniqueActionTypes.map(action => <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>)}
                    </select>
                    <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="w-full p-2 border rounded-md" />
                    <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="w-full p-2 border rounded-md" />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Target</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredLogs.map(log => {
                                const actor = users.get(log.actorId);
                                return (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {actor ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar name={actor.name} className="w-8 h-8 text-xs" />
                                                    <span>{actor.name}</span>
                                                </div>
                                            ) : `User #${log.actorId}`}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap capitalize text-sm">{log.action.replace(/_/g, ' ')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {log.target ? `${log.target.type}: "${log.target.name}"` : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-500" title={new Date(log.timestamp).toLocaleString()}>
                                            {formatDistanceToNow(log.timestamp)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                     {filteredLogs.length === 0 && <p className="text-center py-10 text-slate-500">No logs found matching your criteria.</p>}
                </div>
            </Card>
        </div>
    );
};