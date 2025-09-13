// full contents of components/FinancialsView.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Corrected import paths to be relative.
import { User, FinancialKPIs, MonthlyFinancials, CostBreakdown, Invoice, Quote, Client, Project, Permission, Expense, ExpenseCategory, ExpenseStatus, InvoiceStatus } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { InvoiceStatusBadge, QuoteStatusBadge } from './ui/StatusBadge';
import { hasPermission } from '../services/auth';

interface FinancialsViewProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
}

type FinancialsTab = 'dashboard' | 'invoices' | 'expenses' | 'clients';

const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const BarChart: React.FC<{ data: { label: string, value: number }[], barColor: string }> = ({ data, barColor }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    return (
        <div className="w-full h-64 flex items-end justify-around p-4 border rounded-lg bg-slate-50">
            {data.map((item, index) => (
                <div key={index} className="flex flex-col items-center justify-end h-full w-full">
                    <div
                        className={`w-3/4 rounded-t-md ${barColor}`}
                        style={{ height: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                        title={formatCurrency(item.value)}
                    ></div>
                    <span className="text-xs mt-2 text-slate-600">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

const ExpenseApprovalModal: React.FC<{ expense: Expense, onClose: () => void, onUpdate: () => void, user: User, addToast: (m:string,t:'success'|'error')=>void }> = ({ expense, onClose, onUpdate, user, addToast }) => {
    const handleUpdateStatus = async (status: ExpenseStatus) => {
        let reason = status === ExpenseStatus.REJECTED ? prompt("Reason for rejection:") : undefined;
        if (status === ExpenseStatus.REJECTED && !reason) return;
        try {
            await api.updateExpenseStatus(expense.id, status, user.id, reason || undefined);
            addToast(`Expense ${status.toLowerCase()}.`, 'success');
            onUpdate();
            onClose();
        } catch (error) {
            addToast("Failed to update expense.", 'error');
        }
    };
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-md" onClick={e=>e.stopPropagation()}>
                <h3 className="text-lg font-bold">Review Expense</h3>
                <p>Amount: {formatCurrency(expense.amount, expense.currency)}</p>
                <p>Category: {expense.category}</p>
                <p>Description: {expense.description}</p>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="danger" onClick={() => handleUpdateStatus(ExpenseStatus.REJECTED)}>Reject</Button>
                    <Button variant="success" onClick={() => handleUpdateStatus(ExpenseStatus.APPROVED)}>Approve</Button>
                </div>
            </Card>
        </div>
    );
};


export const FinancialsView: React.FC<FinancialsViewProps> = ({ user, addToast }) => {
    const [activeTab, setActiveTab] = useState<FinancialsTab>('dashboard');
    const [loading, setLoading] = useState(true);
    // Data states
    const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
    const [monthly, setMonthly] = useState<MonthlyFinancials[]>([]);
    const [costs, setCosts] = useState<CostBreakdown[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

    const canManageFinances = hasPermission(user, Permission.MANAGE_FINANCES);

    const fetchData = useCallback(async () => {
        if (!user.companyId) return;
        setLoading(true);
        try {
            const [kpiData, monthlyData, costsData, invoiceData, quoteData, expenseData, clientData, projectData, usersData] = await Promise.all([
                api.getFinancialKPIsForCompany(user.companyId),
                api.getMonthlyFinancials(user.companyId),
                api.getCostBreakdown(user.companyId),
                api.getInvoicesByCompany(user.companyId),
                api.getQuotesByCompany(user.companyId),
                api.getExpensesByCompany(user.companyId),
                api.getClientsByCompany(user.companyId),
                api.getProjectsByCompany(user.companyId),
                api.getUsersByCompany(user.companyId),
            ]);
            setKpis(kpiData);
            setMonthly(monthlyData);
            setCosts(costsData);
            setInvoices(invoiceData);
            setQuotes(quoteData);
            setExpenses(expenseData);
            setClients(clientData);
            setProjects(projectData);
            setUsers(usersData);
        } catch (error) {
            addToast("Failed to load financial data", 'error');
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

    const renderDashboard = () => (
        <div className="space-y-6">
             {kpis && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card><p className="text-sm text-slate-500">Profitability</p><p className="text-3xl font-bold">{kpis.profitability}%</p></Card>
                <Card><p className="text-sm text-slate-500">Avg. Project Margin</p><p className="text-3xl font-bold">{kpis.projectMargin}%</p></Card>
                <Card><p className="text-sm text-slate-500">Cash Flow</p><p className="text-3xl font-bold">{formatCurrency(kpis.cashFlow, kpis.currency)}</p></Card>
            </div>}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="font-semibold mb-4">Monthly Performance (Profit)</h3>
                    <BarChart data={monthly.map(m => ({ label: m.month, value: m.profit }))} barColor="bg-green-500" />
                </Card>
                 <Card>
                    <h3 className="font-semibold mb-4">Cost Breakdown</h3>
                    <BarChart data={costs.map(c => ({ label: c.category, value: c.amount }))} barColor="bg-sky-500" />
                </Card>
            </div>
        </div>
    );
    
    const renderInvoicesAndQuotes = () => (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Invoices & Quotes</h3>
                {canManageFinances && <Button>Create Invoice</Button>}
            </div>
            <h4 className="font-semibold mt-4">Invoices</h4>
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Balance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map(invoice => (
                        <tr key={invoice.id}>
                            <td className="px-6 py-4 font-medium">{invoice.invoiceNumber}</td>
                            <td className="px-6 py-4">{clientMap.get(invoice.clientId)}</td>
                            <td className="px-6 py-4">{new Date(invoice.dueAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right">{formatCurrency(invoice.total)}</td>
                            <td className="px-6 py-4 text-right font-semibold">{formatCurrency(invoice.total - invoice.amountPaid)}</td>
                            <td className="px-6 py-4"><InvoiceStatusBadge status={invoice.status} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    );

    const renderExpenses = () => {
        const myExpenses = expenses.filter(e => e.userId === user.id);
        const reviewQueue = expenses.filter(e => e.status === ExpenseStatus.PENDING);
        
        return (
            <div className="space-y-6">
                {hasPermission(user, Permission.MANAGE_EXPENSES) && (
                    <Card>
                        <h3 className="font-semibold text-lg mb-2">Expense Review Queue ({reviewQueue.length})</h3>
                        {reviewQueue.map(exp => (
                            <div key={exp.id} className="p-2 border-b flex justify-between items-center">
                                <div>
                                    <p>{userMap.get(exp.userId)} - {formatCurrency(exp.amount, exp.currency)}</p>
                                    <p className="text-sm text-slate-500">{exp.description}</p>
                                </div>
                                <Button size="sm" onClick={() => setSelectedExpense(exp)}>Review</Button>
                            </div>
                        ))}
                         {reviewQueue.length === 0 && <p className="text-slate-500 py-4 text-center">No expenses to review.</p>}
                    </Card>
                )}
                 <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg">My Expenses</h3>
                        {hasPermission(user, Permission.SUBMIT_EXPENSE) && <Button>Submit Expense</Button>}
                    </div>
                     {myExpenses.map(exp => (
                        <div key={exp.id} className="p-2 border-b flex justify-between items-center">
                            <div>
                                <p>{new Date(exp.submittedAt).toLocaleDateString()} - {formatCurrency(exp.amount, exp.currency)}</p>
                                <p className="text-sm text-slate-500">{exp.description}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${exp.status === 'Approved' ? 'bg-green-100 text-green-800' : exp.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{exp.status}</span>
                        </div>
                    ))}
                     {myExpenses.length === 0 && <p className="text-slate-500 py-4 text-center">You have not submitted any expenses.</p>}
                </Card>
            </div>
        );
    };

    const renderClients = () => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map(client => (
                <Card key={client.id}>
                    <h3 className="text-xl font-semibold">{client.name}</h3>
                    <p className="text-sm text-slate-500 mb-4">Client since {new Date(client.createdAt).toLocaleDateString()}</p>
                    <div className="border-t pt-2 space-y-1 text-sm">
                        <p>{client.contactEmail}</p>
                        <p>{client.contactPhone}</p>
                    </div>
                </Card>
            ))}
        </div>
    );


    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return renderDashboard();
            case 'invoices': return renderInvoicesAndQuotes();
            case 'expenses': return renderExpenses();
            case 'clients': return renderClients();
            default: return null;
        }
    };

    if (loading) return <Card><p>Loading financials...</p></Card>

    return (
        <div className="space-y-6">
            {selectedExpense && <ExpenseApprovalModal expense={selectedExpense} onClose={() => setSelectedExpense(null)} onUpdate={fetchData} user={user} addToast={addToast} />}
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-800">Financials</h2>
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6">
                    {(['dashboard', 'invoices', 'expenses', 'clients'] as FinancialsTab[]).map(tab => (
                         <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            {tab === 'invoices' ? 'Invoices & Quotes' : tab}
                        </button>
                    ))}
                </nav>
            </div>
            
            {renderContent()}
        </div>
    )
}