import React, { useEffect, useMemo, useState } from 'react';
import { User, Invoice, Expense, PurchaseOrder } from '../../types';
import { api } from '../../services/mockApi';

export const FinancialReports: React.FC<{ user: User; addToast: (m: string, t?: 'success' | 'error') => void }>
    = ({ user, addToast }) => {
        const [invoices, setInvoices] = useState<Invoice[]>([]);
        const [expenses, setExpenses] = useState<Expense[]>([]);
        const [purchaseOrders, setPOs] = useState<PurchaseOrder[]>([]);

        useEffect(() => {
            (async () => {
                try {
                    const [inv, exp, pos] = await Promise.all([
                        api.getInvoicesByCompany(user.companyId),
                        api.getExpensesByCompany(user.companyId),
                        (api as any).listPurchaseOrders(user.companyId),
                    ]);
                    setInvoices(inv as any); setExpenses(exp as any); setPOs(pos as any);
                } catch {
                    addToast('Failed to load financials', 'error');
                }
            })();
        }, [user.companyId, addToast]);

        const totals = useMemo(() => {
            const revenue = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
            const expense = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
            const committed = purchaseOrders.reduce((s, p) => s + Number(p.totalCost || 0), 0);
            return { revenue, expense, committed, profit: revenue - expense };
        }, [invoices, expenses, purchaseOrders]);

        return (
            <div className="space-y-4">
                <h1 className="text-xl font-semibold">Financial Reports</h1>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded border p-4"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-lg font-semibold">{totals.revenue.toFixed(2)}</p></div>
                    <div className="rounded border p-4"><p className="text-xs text-muted-foreground">Expenses</p><p className="text-lg font-semibold">{totals.expense.toFixed(2)}</p></div>
                    <div className="rounded border p-4"><p className="text-xs text-muted-foreground">Committed (POs)</p><p className="text-lg font-semibold">{totals.committed.toFixed(2)}</p></div>
                    <div className="rounded border p-4"><p className="text-xs text-muted-foreground">Profit</p><p className="text-lg font-semibold">{totals.profit.toFixed(2)}</p></div>
                </div>
            </div>
        );
    };
