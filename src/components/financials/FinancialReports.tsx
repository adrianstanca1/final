import React, { useEffect, useMemo, useState } from 'react';
import { User, Invoice, Expense, PurchaseOrder, Project } from '../../types';
import { api } from '../../services/mockApi';

export const FinancialReports: React.FC<{ user: User; addToast: (m: string, t?: 'success' | 'error') => void }>
    = ({ user, addToast }) => {
        const [projects, setProjects] = useState<Project[]>([]);
        const [invoices, setInvoices] = useState<Invoice[]>([]);
        const [expenses, setExpenses] = useState<Expense[]>([]);
        const [purchaseOrders, setPOs] = useState<PurchaseOrder[]>([]);
        const [projectFilter, setProjectFilter] = useState<string>('all');
        const [dateFrom, setDateFrom] = useState<string>('');
        const [dateTo, setDateTo] = useState<string>('');

        useEffect(() => {
            (async () => {
                try {
                    const [ps, inv, exp, pos] = await Promise.all([
                        api.getProjectsByCompany(user.companyId),
                        api.getInvoicesByCompany(user.companyId),
                        api.getExpensesByCompany(user.companyId),
                        (api as any).listPurchaseOrders(user.companyId),
                    ]);
                    setProjects(ps as any);
                    setInvoices(inv as any); setExpenses(exp as any); setPOs(pos as any);
                } catch {
                    addToast('Failed to load financials', 'error');
                }
            })();
        }, [user.companyId, addToast]);

        const filtered = useMemo(() => {
            const pf = projectFilter;
            const from = dateFrom ? new Date(dateFrom) : null;
            const to = dateTo ? new Date(dateTo) : null;
            const inProject = (projectId: string) => pf === 'all' || String(projectId) === String(pf);
            const inRange = (dateISO: string) => {
                const d = new Date(dateISO);
                if (Number.isNaN(d.getTime())) return true;
                if (from && d < from) return false;
                if (to) {
                    const end = new Date(to);
                    end.setHours(23, 59, 59, 999);
                    if (d > end) return false;
                }
                return true;
            };
            return {
                invoices: invoices.filter(i => inProject(i.projectId) && (inRange(i.issueDate) || inRange(i.issuedAt))),
                expenses: expenses.filter(e => inProject(e.projectId) && inRange(e.date)),
                pos: purchaseOrders.filter(p => (p.projectId ? inProject(p.projectId) : true) && inRange(p.date || p.createdAt)),
            };
        }, [invoices, expenses, purchaseOrders, projectFilter, dateFrom, dateTo]);

        const totals = useMemo(() => {
            const revenue = filtered.invoices.reduce((s, i) => s + Number(i.total || 0), 0);
            const expense = filtered.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
            const committed = filtered.pos.reduce((s, p) => s + Number(p.totalCost || 0), 0);
            return { revenue, expense, committed, profit: revenue - expense };
        }, [filtered]);

        const monthlyTrend = useMemo(() => {
            const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const map = new Map<string, { revenue: number; expense: number }>();
            filtered.invoices.forEach(i => {
                const d = new Date(i.issueDate || i.issuedAt || i.createdAt);
                const key = monthKey(d);
                const entry = map.get(key) || { revenue: 0, expense: 0 };
                entry.revenue += Number(i.total || 0);
                map.set(key, entry);
            });
            filtered.expenses.forEach(e => {
                const d = new Date(e.date || e.createdAt);
                const key = monthKey(d);
                const entry = map.get(key) || { revenue: 0, expense: 0 };
                entry.expense += Number(e.amount || 0);
                map.set(key, entry);
            });
            // sort by month
            const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
            return sorted.map(([label, v]) => ({ label, ...v, net: v.revenue - v.expense }));
        }, [filtered]);

        const toCSV = (rows: any[], headers: string[]) => {
            const esc = (v: any) => {
                const s = String(v ?? '');
                if (s.includes('"') || s.includes(',') || s.includes('\n')) {
                    return '"' + s.replace(/"/g, '""') + '"';
                }
                return s;
            };
            return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
        };

        const handleExportCSV = () => {
            const summaryRows = [{ metric: 'Revenue', amount: totals.revenue }, { metric: 'Expenses', amount: totals.expense }, { metric: 'Committed', amount: totals.committed }, { metric: 'Profit', amount: totals.profit }];
            const detailInvoices = filtered.invoices.map(i => ({ type: 'Invoice', id: i.id, projectId: i.projectId, date: i.issueDate || i.issuedAt, amount: i.total }));
            const detailExpenses = filtered.expenses.map(e => ({ type: 'Expense', id: e.id, projectId: e.projectId, date: e.date, amount: e.amount }));
            const detailPOs = filtered.pos.map(p => ({ type: 'PO', id: p.id, projectId: p.projectId || '', date: (p as any).date || p.createdAt, amount: p.totalCost }));

            const summaryCSV = toCSV(summaryRows, ['metric', 'amount']);
            const detailCSV = toCSV([...detailInvoices, ...detailExpenses, ...detailPOs], ['type', 'id', 'projectId', 'date', 'amount']);
            const blob = new Blob([summaryCSV + '\n\n' + detailCSV], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'financial-report.csv';
            link.click();
            URL.revokeObjectURL(url);
        };

        return (
            <div className="space-y-4">
                <h1 className="text-xl font-semibold">Financial Reports</h1>
                <div className="flex flex-wrap items-center gap-3">
                    <select aria-label="Project filter" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="rounded border px-2 py-1 text-sm">
                        <option value="all">All projects</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <label className="text-sm text-muted-foreground">From <input aria-label="From date" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="ml-1 rounded border px-2 py-1 text-sm" /></label>
                    <label className="text-sm text-muted-foreground">To <input aria-label="To date" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="ml-1 rounded border px-2 py-1 text-sm" /></label>
                    <button onClick={handleExportCSV} className="ml-auto rounded border px-3 py-1 text-sm">Export CSV</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded border p-4"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-lg font-semibold">{totals.revenue.toFixed(2)}</p></div>
                    <div className="rounded border p-4"><p className="text-xs text-muted-foreground">Expenses</p><p className="text-lg font-semibold">{totals.expense.toFixed(2)}</p></div>
                    <div className="rounded border p-4"><p className="text-xs text-muted-foreground">Committed (POs)</p><p className="text-lg font-semibold">{totals.committed.toFixed(2)}</p></div>
                    <div className="rounded border p-4"><p className="text-xs text-muted-foreground">Profit</p><p className="text-lg font-semibold">{totals.profit.toFixed(2)}</p></div>
                </div>
                {monthlyTrend.length > 0 && (
                    <div className="rounded border p-4">
                        <p className="text-sm font-medium mb-2">Monthly Cash-Flow</p>
                        <table className="w-full text-sm">
                            <thead className="text-muted-foreground">
                                <tr>
                                    <th className="text-left p-2">Month</th>
                                    <th className="text-right p-2">Revenue</th>
                                    <th className="text-right p-2">Expenses</th>
                                    <th className="text-right p-2">Net</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyTrend.map(m => (
                                    <tr key={m.label} className="border-t">
                                        <td className="p-2">{m.label}</td>
                                        <td className="p-2 text-right">{m.revenue.toFixed(2)}</td>
                                        <td className="p-2 text-right">{m.expense.toFixed(2)}</td>
                                        <td className="p-2 text-right">{m.net.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };
