import React, { useEffect, useState } from 'react';
import { User, Budget, Project } from '../../types';
import { api } from '../../services/mockApi';

export const AccountsDashboard: React.FC<{ user: User; addToast: (m: string, t?: 'success' | 'error') => void }>
    = ({ user, addToast }) => {
        const [projects, setProjects] = useState<Project[]>([]);
        const [rows, setRows] = useState<Array<{ project: Project; budget: number; spent: number }>>([]);

        useEffect(() => {
            (async () => {
                try {
                    const ps = await api.getProjectsByCompany(user.companyId);
                    setProjects(ps as any);
                    setRows(ps.map((p: any) => ({ project: p, budget: p.budget ?? 0, spent: p.spent ?? 0 })));
                } catch {
                    addToast('Failed to load budgets', 'error');
                }
            })();
        }, [user.companyId, addToast]);

        return (
            <div className="space-y-4">
                <h1 className="text-xl font-semibold">Accounts: Budgets</h1>
                <table className="w-full text-sm border rounded overflow-hidden">
                    <thead className="bg-muted text-foreground">
                        <tr>
                            <th className="text-left p-2">Project</th>
                            <th className="text-right p-2">Budget</th>
                            <th className="text-right p-2">Spent</th>
                            <th className="text-right p-2">Variance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.project.id} className="border-t">
                                <td className="p-2">{r.project.name}</td>
                                <td className="p-2 text-right">{r.budget.toFixed(2)}</td>
                                <td className="p-2 text-right">{r.spent.toFixed(2)}</td>
                                <td className="p-2 text-right">{(r.budget - r.spent).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };
