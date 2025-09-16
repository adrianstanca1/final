import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, FinancialKPIs, MonthlyFinancials, CostBreakdown, Invoice, Quote, Client, Project, Permission, Expense, ExpenseStatus, InvoiceStatus, QuoteStatus } from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { InvoiceStatusBadge, QuoteStatusBadge } from './ui/StatusBadge';
import { hasPermission } from '../services/auth';
import { Tag } from './ui/Tag';
import { ExpenseModal } from './ExpenseModal';
import ClientModal from './financials/ClientModal';
import InvoiceModal from './financials/InvoiceModal';
import PaymentModal from './financials/PaymentModal';
import BarChart from './financials/BarChart';
import { formatCurrency } from '../utils/finance';

type FinancialsTab = 'dashboard' | 'invoices' | 'expenses' | 'clients';

// --- Main View ---

export const FinancialsView: React.FC<{ user: User; addToast: (message: string, type: 'success' | 'error') => void; }> = ({ user, addToast }) => {
    const [activeTab, setActiveTab] = useState<FinancialsTab>('dashboard');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        kpis: null as FinancialKPIs | null,
        monthly: [] as MonthlyFinancials[],
        costs: [] as CostBreakdown[],
        invoices: [] as Invoice[],
        quotes: [] as Quote[],
        expenses: [] as Expense[],
        clients: [] as Client[],
        projects: [] as Project[],
        users: [] as User[],
    });

    const [modal, setModal] = useState<'client' | 'invoice' | 'payment' | 'expense' | null>(null);
    const [selectedItem, setSelectedItem] = useState<Client | Invoice | Expense | null>(null);

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
            setData({ kpis: kpiData, monthly: monthlyData, costs: costsData, invoices: invoiceData, quotes: quoteData, expenses: expenseData, clients: clientData, projects: projectData, users: usersData });
        } catch (error) {
            addToast("Failed to load financial data", 'error');
        } finally {
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const { projectMap, clientMap, userMap } = useMemo(() => ({
        projectMap: new Map(data.projects.map(p => [p.id, p.name])),
        clientMap: new Map(data.clients.map(c => [c.id, c.name])),
        userMap: new Map(data.users.map(u => [u.id, `${u.firstName} ${u.lastName}`]))
    }), [data.projects, data.clients, data.users]);

    const getInvoiceFinancials = (invoice: Invoice) => {
        const subtotal = (invoice.lineItems || []).reduce((acc, item) => acc + (item.quantity || 0) * (item.unitPrice || item.rate || 0), 0);
        const taxAmount = subtotal * (invoice.taxRate || 0);
        const retentionAmount = subtotal * (invoice.retentionRate || 0);
        const total = subtotal + taxAmount - retentionAmount;
        const paid = (invoice.payments || []).reduce((acc, p) => acc + p.amount, 0);
        return { total, paid, balance: total - paid };
    }

    const getDerivedStatus = (invoice: Invoice, balance: number): InvoiceStatus => {
        if (invoice.status === InvoiceStatus.SENT && new Date(invoice.dueAt) < new Date() && balance > 0) {
            return InvoiceStatus.OVERDUE;
        }
        return invoice.status;
    };

    const handleUpdateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
        if (status === InvoiceStatus.CANCELLED) {
            if (!window.confirm("Are you sure you want to cancel this invoice? This action cannot be undone.")) {
                return;
            }
        }
        try {
            const invoice = data.invoices.find(i => i.id === invoiceId);
            if (!invoice) throw new Error("Invoice not found");
            await api.updateInvoice(invoiceId, { ...invoice, status }, user.id);
            addToast(`Invoice marked as ${status.toLowerCase()}.`, 'success');
            fetchData();
        } catch (error) {
            addToast("Failed to update invoice status.", "error");
        }
    };

    const renderDashboard = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card><p className="text-sm text-slate-500">Profitability</p><p className="text-3xl font-bold">{data.kpis?.profitability || 0}%</p></Card>
                <Card><p className="text-sm text-slate-500">Avg. Project Margin</p><p className="text-3xl font-bold">{data.kpis?.projectMargin || 0}%</p></Card>
                <Card><p className="text-sm text-slate-500">Cash Flow</p><p className="text-3xl font-bold">{formatCurrency(data.kpis?.cashFlow || 0, data.kpis?.currency)}</p></Card>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="font-semibold mb-4">Monthly Performance (Profit)</h3>
                    <BarChart data={data.monthly.map(m => ({ label: m.month, value: m.profit }))} barColor="bg-green-500" />
                </Card>
                 <Card>
                    <h3 className="font-semibold mb-4">Cost Breakdown</h3>
                    <BarChart data={data.costs.map(c => ({ label: c.category, value: c.amount }))} barColor="bg-sky-500" />
                </Card>
            </div>
        </div>
    );

     const renderInvoicesAndQuotes = () => (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">Invoices</h3>
                    {canManageFinances && <Button onClick={()=>{ setSelectedItem(null); setModal('invoice'); }}>Create Invoice</Button>}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted"><tr><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Number</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Client</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Project</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Total</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Balance Due</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th></tr></thead>
                        <tbody className="bg-card divide-y divide-border">
                            {data.invoices.map(invoice => {
                                const { total, balance } = getInvoiceFinancials(invoice);
                                const derivedStatus = getDerivedStatus(invoice, balance);
                                
                                return (
                                <tr key={invoice.id} className="hover:bg-accent">
                                    <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                                    <td className="px-4 py-3">{clientMap.get(invoice.clientId)}</td>
                                    <td className="px-4 py-3">{projectMap.get(invoice.projectId)}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(total)}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(balance)}</td>
                                    <td className="px-4 py-3"><InvoiceStatusBadge status={derivedStatus} /></td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        {canManageFinances && invoice.status === InvoiceStatus.DRAFT && (
                                            <>
                                                <Button size="sm" variant="success" onClick={() => handleUpdateInvoiceStatus(invoice.id, InvoiceStatus.SENT)}>Send</Button>
                                                <Button size="sm" variant="secondary" onClick={() => { setSelectedItem(invoice); setModal('invoice'); }}>Edit</Button>
                                            </>
                                        )}
                                        {canManageFinances && (invoice.status === InvoiceStatus.SENT || derivedStatus === InvoiceStatus.OVERDUE) && (
                                             <>
                                                <Button size="sm" onClick={() => { setSelectedItem(invoice); setModal('payment'); }}>Record Payment</Button>
                                                <Button size="sm" variant="danger" onClick={() => handleUpdateInvoiceStatus(invoice.id, InvoiceStatus.CANCELLED)}>Cancel</Button>
                                            </>
                                        )}
                                        {invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED ? (
                                            <Button size="sm" variant="secondary" onClick={() => { setSelectedItem(invoice); setModal('invoice'); }}>View</Button>
                                        ) : null}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </Card>
             <Card>
                <h3 className="font-semibold text-lg mb-4">Quotes</h3>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                         <thead className="bg-muted"><tr><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Client</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Project</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th></tr></thead>
                          <tbody className="bg-card divide-y divide-border">
                            {data.quotes.map(quote => (<tr key={quote.id}><td className="px-4 py-3">Client Name</td><td className="px-4 py-3">Project Name</td><td className="px-4 py-3"><QuoteStatusBadge status={quote.status} /></td></tr>))}
                          </tbody>
                    </table>
                 </div>
            </Card>
        </div>
    );

    const renderExpenses = () => (
        <Card>
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Expenses</h3>
                <Button onClick={() => { setSelectedItem(null); setModal('expense'); }}>Submit Expense</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted"><tr><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Date</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Submitted By</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Project</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Description</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Amount</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th></tr></thead>
                    <tbody className="bg-card divide-y divide-border">
                        {data.expenses.map(exp => (
                            <tr key={exp.id}>
                                <td className="px-4 py-3">{new Date(exp.submittedAt).toLocaleDateString()}</td>
                                <td className="px-4 py-3">{userMap.get(exp.userId)}</td>
                                <td className="px-4 py-3">{projectMap.get(exp.projectId)}</td>
                                <td className="px-4 py-3">{exp.description}</td>
                                <td className="px-4 py-3 text-right">{formatCurrency(exp.amount)}</td>
                                <td className="px-4 py-3"><Tag label={exp.status} color={exp.status === 'APPROVED' ? 'green' : exp.status === 'REJECTED' ? 'red' : 'yellow'} /></td>
                                <td className="px-4 py-3 text-right">{exp.status === 'REJECTED' && <Button size="sm" variant="secondary" onClick={() => { setSelectedItem(exp); setModal('expense'); }}>Edit & Resubmit</Button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    const renderClients = () => (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Clients</h2>
                {canManageFinances && <Button onClick={() => { setSelectedItem(null); setModal('client');}}>Add Client</Button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.clients.map(client => (
                    <Card key={client.id} className="cursor-pointer hover:shadow-lg" onClick={() => { setSelectedItem(client); setModal('client');}}>
                        <h3 className="text-lg font-semibold">{client.name}</h3>
                        <p className="text-sm text-muted-foreground">{client.contactEmail}</p>
                    </Card>
                ))}
            </div>
        </div>
    );


    if (loading) return <Card>Loading financials...</Card>;

    const selectedInvoice = modal === 'invoice' || modal === 'payment' ? (selectedItem as Invoice) : null;
    const isInvoiceReadOnly = !canManageFinances || selectedInvoice?.status === InvoiceStatus.PAID || selectedInvoice?.status === InvoiceStatus.CANCELLED;

    return (
        <div className="space-y-6">
            {modal === 'client' && <ClientModal clientToEdit={selectedItem as Client} onClose={() => setModal(null)} onSuccess={fetchData} user={user} addToast={addToast} />}
            {modal === 'invoice' && <InvoiceModal invoiceToEdit={selectedInvoice} isReadOnly={isInvoiceReadOnly} onClose={() => setModal(null)} onSuccess={fetchData} user={user} clients={data.clients} projects={data.projects} addToast={addToast} />}
            {modal === 'payment' && selectedInvoice && <PaymentModal invoice={selectedInvoice} balance={getInvoiceFinancials(selectedInvoice).balance} onClose={() => setModal(null)} onSuccess={fetchData} user={user} addToast={addToast} />}
            {modal === 'expense' && <ExpenseModal expenseToEdit={selectedItem as Expense} onClose={() => setModal(null)} onSuccess={fetchData} user={user} projects={data.projects} addToast={addToast} />}
            
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Financials</h2>
            </div>
             <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {(['dashboard', 'invoices', 'expenses', 'clients'] as FinancialsTab[]).map(tab => (
                         <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'invoices' && renderInvoicesAndQuotes()}
            {activeTab === 'expenses' && renderExpenses()}
            {activeTab === 'clients' && renderClients()}
        </div>
    );
};