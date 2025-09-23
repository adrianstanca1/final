import React, { useEffect, useMemo, useState } from 'react';
import { User, Budget, Project } from '../../types';
import { api } from '../../services/mockApi';
import { accountsService } from '../../services/accountsService';

export const AccountsDashboard: React.FC<{ user: User; addToast: (m: string, t?: 'success' | 'error') => void }>
    = ({ user, addToast }) => {
        const [projects, setProjects] = useState<Project[]>([]);
        const [rows, setRows] = useState<Array<{ project: Project; budget: number; spent: number; budgetId?: string; currency?: string }>>([]);
        const [editing, setEditing] = useState<{ projectId: string; amount: string; spent: string; currency: string; id?: string } | null>(null);
        const [creatingProjectId, setCreatingProjectId] = useState<string | null>(null);

        useEffect(() => {
            (async () => {
                try {
                    const ps = await api.getProjectsByCompany(user.companyId);
                    setProjects(ps as any);

                    // Try Supabase-backed budgets first
                    let budgets: Budget[] = [];
                    try {
                        budgets = await accountsService.listBudgets(user.companyId);
                    } catch {
                        budgets = [];
                    }

                    if (budgets.length > 0) {
                        const byProject = new Map(budgets.map(b => [b.projectId, b]));
                        setRows(ps.map((p: any) => {
                            const b = byProject.get(p.id);
                            return { project: p, budget: b ? b.amount : (p.budget ?? 0), spent: b ? b.spent : (p.spent ?? 0), budgetId: b?.id, currency: b?.currency || 'USD' };
                        }));
                    } else {
                        // Fallback to project-derived fields
                        setRows(ps.map((p: any) => ({ project: p, budget: p.budget ?? 0, spent: p.spent ?? 0, currency: 'USD' })));
                    }
                } catch {
                    addToast('Failed to load budgets', 'error');
                }
            })();
        }, [user.companyId, addToast]);

        const onEdit = (projectId: string) => {
            const row = rows.find(r => r.project.id === projectId);
            if (!row) return;
            setEditing({ projectId, amount: String(row.budget), spent: String(row.spent), currency: row.currency || 'USD', id: row.budgetId });
            setCreatingProjectId(null);
        };

        const onCreate = (projectId: string) => {
            const row = rows.find(r => r.project.id === projectId);
            if (!row) return;
            setEditing({ projectId, amount: String(row.budget || 0), spent: String(row.spent || 0), currency: row.currency || 'USD' });
            setCreatingProjectId(projectId);
        };

        const onCancel = () => {
            setEditing(null);
            setCreatingProjectId(null);
        };

        const applyOptimistic = (projectId: string, patch: Partial<{ budget: number; spent: number; budgetId?: string; currency?: string }>) => {
            setRows(prev => prev.map(r => r.project.id === projectId ? { ...r, ...patch } : r));
        };

        const onSave = async () => {
            if (!editing) return;
            const amount = Number(editing.amount || 0);
            const spent = Number(editing.spent || 0);
            const currency = editing.currency || 'USD';
            const projectId = editing.projectId;
            const rollback = [...rows];
            try {
                applyOptimistic(projectId, { budget: amount, spent, currency });
                const saved = await accountsService.upsertBudget({
                    id: editing.id,
                    companyId: user.companyId,
                    projectId,
                    amount,
                    spent,
                    currency,
                } as Partial<Budget>);
                applyOptimistic(projectId, { budgetId: saved.id });
                setEditing(null);
                setCreatingProjectId(null);
                addToast('Budget saved', 'success');
            } catch (e: any) {
                setRows(rollback);
                addToast(e?.message || 'Failed to save budget', 'error');
            }
        };

        const onDelete = async (projectId: string, budgetId?: string) => {
            if (!budgetId) return; // nothing to delete
            const rollback = [...rows];
            try {
                applyOptimistic(projectId, { budgetId: undefined });
                await accountsService.deleteBudget(budgetId);
                addToast('Budget deleted', 'success');
            } catch (e: any) {
                setRows(rollback);
                addToast(e?.message || 'Failed to delete budget', 'error');
            }
        };

        const projectById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

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
                            <th className="text-right p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.project.id} className="border-t align-middle">
                                <td className="p-2">{r.project.name}</td>
                                <td className="p-2 text-right">
                                    {editing?.projectId === r.project.id ? (
                                        <input aria-label="Budget amount" className="w-28 rounded border border-border bg-background p-1 text-right" value={editing.amount} onChange={e => setEditing(prev => prev ? { ...prev, amount: e.target.value.replace(/[^0-9.]/g, '') } : prev)} />
                                    ) : (
                                        r.budget.toFixed(2)
                                    )}
                                </td>
                                <td className="p-2 text-right">
                                    {editing?.projectId === r.project.id ? (
                                        <input aria-label="Spent amount" className="w-28 rounded border border-border bg-background p-1 text-right" value={editing.spent} onChange={e => setEditing(prev => prev ? { ...prev, spent: e.target.value.replace(/[^0-9.]/g, '') } : prev)} />
                                    ) : (
                                        r.spent.toFixed(2)
                                    )}
                                </td>
                                <td className="p-2 text-right">{(r.budget - r.spent).toFixed(2)}</td>
                                <td className="p-2 text-right">
                                    {editing?.projectId === r.project.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={onSave} className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Save</button>
                                            <button onClick={onCancel} className="rounded border border-border px-2 py-1 text-xs">Cancel</button>
                                        </div>
                                    ) : r.budgetId ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => onEdit(r.project.id)} className="rounded border border-border px-2 py-1 text-xs">Edit</button>
                                            <button onClick={() => onDelete(r.project.id, r.budgetId)} className="rounded border border-destructive text-destructive px-2 py-1 text-xs">Delete</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => onCreate(r.project.id)} className="rounded border border-dashed px-2 py-1 text-xs">Add</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };
