import React, { useState, useEffect } from 'react';
import { User, AuditLog } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../services/mockApi';

interface AuditLogViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ user, addToast }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const result = await api.getAuditLogs?.() || [];
        setLogs(result);
      } catch (error) {
        addToast('Failed to load audit logs', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [addToast]);

  const exportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + logs.map(log => `${log.timestamp},${log.action},${log.userId || 'System'}`).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "audit_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <Card>Loading audit logs...</Card>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <Button onClick={exportLogs}>Export CSV</Button>
      </div>

      <Card>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Timestamp</th>
                  <th className="text-left py-2">Action</th>
                  <th className="text-left py-2">User</th>
                  <th className="text-left py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 100).map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="py-2">{new Date(log.timestamp).toLocaleDateString()}</td>
                    <td className="py-2">{log.action}</td>
                    <td className="py-2">{log.userId || 'System'}</td>
                    <td className="py-2">{log.details || '-'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">
                      No audit logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};
