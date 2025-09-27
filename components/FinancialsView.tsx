import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Client,
  CostBreakdown,
  Expense,
  FinancialKPIs,
  Invoice,
  InvoiceStatus,
  MonthlyFinancials,
  Permission,
  Project,
  Quote,
  User,
} from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { formatCurrency, getDerivedStatus, getInvoiceFinancials } from '../utils/finance';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Tag } from './ui/Tag';
import { BarChart } from './ui/BarChart';
import './ui/barChartBar.css';
import { InvoiceStatusBadge, QuoteStatusBadge } from './ui/StatusBadge';
import ClientModal from './financials/ClientModal';
import InvoiceModal from './financials/InvoiceModal';
import PaymentModal from './financials/PaymentModal';
import { ExpenseModal } from './ExpenseModal';

export type FinancialsTab = 'dashboard' | 'invoices' | 'expenses' | 'clients';

interface FinancialsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const currencyLabel = (kpis: FinancialKPIs | null) => kpis?.currency ?? 'GBP';

export const FinancialsView: React.FC<FinancialsViewProps> = ({ user, addToast }) => {
  const [activeTab, setActiveTab] = useState<FinancialsTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [monthly, setMonthly] = useState<MonthlyFinancials[]>([]);
  const [costs, setCosts] = useState<CostBreakdown[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientModalClient, setClientModalClient] = useState<Client | null>(null);
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [invoiceModalState, setInvoiceModalState] = useState<{ invoice: Invoice | null; readOnly: boolean } | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const canManageFinances = hasPermission(user, Permission.MANAGE_FINANCES);

  const fetchData = useCallback(async () => {
    if (!user.companyId) {
      setKpis(null);
      setMonthly([]);
      setCosts([]);
      setInvoices([]);
      setExpenses([]);
      setQuotes([]);
      setClients([]);
      setProjects([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;
    setLoading(true);

    try {
      const [kpiData, monthlyData, costData, invoiceData, expenseData, quoteData, clientData, projectData] = await Promise.all([
        api.getFinancialKPIsForCompany(user.companyId, { signal: controller.signal }),
        api.getMonthlyFinancials(user.companyId, { signal: controller.signal }),
        api.getCostBreakdown(user.companyId, { signal: controller.signal }),
        api.getInvoicesByCompany(user.companyId, { signal: controller.signal }),
        api.getExpensesByCompany(user.companyId, { signal: controller.signal }),
        api.getQuotesByCompany(user.companyId, { signal: controller.signal }),
        api.getClientsByCompany(user.companyId, { signal: controller.signal }),
        api.getProjectsByCompany(user.companyId, { signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return;

      setKpis(kpiData);
      setMonthly(monthlyData);
      setCosts(costData);
      setInvoices(invoiceData);
      setExpenses(expenseData);
      setQuotes(quoteData);
      setClients(clientData);
      setProjects(projectData);
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('[FinancialsView] Failed to load financial data', error);
        addToast('Failed to load financial data', 'error');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [user.companyId, addToast]);

  useEffect(() => {
    fetchData();
    return () => abortControllerRef.current?.abort();
  }, [fetchData]);

  const projectMap = useMemo(() => new Map(projects.map(project => [project.id, project.name])), [projects]);
  const clientMap = useMemo(() => new Map(clients.map(client => [client.id, client.name])), [clients]);

  const totals = useMemo(() => {
    const revenue = monthly.reduce((acc, month) => acc + month.revenue, 0);
    const profit = monthly.reduce((acc, month) => acc + month.profit, 0);
    const outstanding = invoices.reduce((acc, invoice) => acc + getInvoiceFinancials(invoice).balance, 0);
    const expenseTotal = expenses.reduce((acc, expense) => acc + (expense.amount || 0), 0);
    return { revenue, profit, outstanding, expenseTotal };
  }, [monthly, invoices, expenses]);

  const quotesByStatus = useMemo(() => {
    return quotes.reduce<Record<string, number>>((acc, quote) => {
      acc[quote.status] = (acc[quote.status] || 0) + 1;
      return acc;
    }, {});
  }, [quotes]);

  const topClients = useMemo(() => clients.slice(0, 5), [clients]);

  const closeClientModal = () => {
    setClientModalClient(null);
    setClientModalOpen(false);
  };
  const closeInvoiceModal = () => setInvoiceModalState(null);
  const closePaymentModal = () => setPaymentInvoice(null);

  const handleInvoiceStatusChange = useCallback(
    async (invoiceId: string, status: InvoiceStatus) => {
      const invoice = invoices.find(item => item.id === invoiceId);
      if (!invoice) {
        addToast('Invoice not found', 'error');
        return;
      }

      if (status === InvoiceStatus.CANCELLED) {
        const confirmed = window.confirm('Cancel this invoice? This action cannot be undone.');
        if (!confirmed) return;
      }

      try {
        await api.updateInvoice(invoiceId, { ...invoice, status }, user.id);
        addToast(`Invoice marked as ${status.toLowerCase()}.`, 'success');
        fetchData();
      } catch (error) {
        console.error('[FinancialsView] Failed to update invoice status', error);
        addToast('Failed to update invoice status.', 'error');
      }
    },
    [invoices, user.id, addToast, fetchData],
  );

  const handleClientSaved = () => {
    closeClientModal();
    fetchData();
  };

  const handleInvoiceSaved = () => {
    closeInvoiceModal();
    fetchData();
  };

  const handleExpenseSaved = () => {
    setExpenseModalOpen(false);
    setExpenseToEdit(null);
    fetchData();
  };

  const renderDashboard = () => {
    if (loading) {
      return (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Loading financial data…</p>
        </Card>
      );
    }

    if (!user.companyId) {
      return (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            Connect this user to a company to access the financial cockpit.
          </p>
        </Card>
      );
    }

    const currency = currencyLabel(kpis);

    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total revenue (rolling 12 months)</p>
            <p className="text-2xl font-semibold">{formatCurrency(totals.revenue, currency)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Net profit</p>
            <p className="text-2xl font-semibold">{formatCurrency(totals.profit, currency)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Outstanding invoices</p>
            <p className="text-2xl font-semibold text-amber-600">{formatCurrency(totals.outstanding, currency)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Recorded expenses</p>
            <p className="text-2xl font-semibold">{formatCurrency(totals.expenseTotal, currency)}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Monthly performance</h3>
              <Tag label={`${monthly.length} months`} color="blue" />
            </div>
            <BarChart
              data={monthly.map(entry => ({ label: entry.month, value: entry.profit }))}
              barColor="bg-emerald-500"
              formatLabel={value => formatCurrency(value, currency)}
            />
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cost breakdown</h3>
              <Tag label={`${costs.length} categories`} color="yellow" />
            </div>
            <BarChart
              data={costs.map(entry => ({ label: entry.category, value: entry.amount }))}
              barColor="bg-sky-500"
              formatLabel={value => formatCurrency(value, currency)}
            />
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Quotes pipeline</h3>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(quotesByStatus).map(([status, count]) => (
                <Tag key={status} label={`${status} · ${count}`} color="gray" />
              ))}
              {quotes.length === 0 && <Tag label="No quotes issued" color="gray" />}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-4">Client</th>
                  <th className="py-2 pr-4">Project</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(quote => (
                  <tr key={quote.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{clientMap.get(quote.clientId) || 'Client unavailable'}</td>
                    <td className="py-2 pr-4">{projectMap.get(quote.projectId) || 'Project unavailable'}</td>
                    <td className="py-2 pr-4">
                      <QuoteStatusBadge status={quote.status} />
                    </td>
                  </tr>
                ))}
                {quotes.length === 0 && (
                  <tr>
                    <td className="py-4 text-sm text-muted-foreground" colSpan={3}>
                      No quotes generated for this workspace yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Top relationships</h3>
          {topClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add clients to build your relationship dashboard.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topClients.map(client => (
                <Tag key={client.id} label={client.name} color="green" statusIndicator="green" />
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderInvoices = () => (
    <Card className="p-4">
      {invoiceModalState && (
        <InvoiceModal
          invoiceToEdit={invoiceModalState.invoice ?? undefined}
          isReadOnly={invoiceModalState.readOnly}
          onClose={closeInvoiceModal}
          onSuccess={handleInvoiceSaved}
          user={user}
          clients={clients}
          projects={projects}
          addToast={addToast}
        />
      )}
      {paymentInvoice && (
        <PaymentModal
          invoice={paymentInvoice}
          balance={getInvoiceFinancials(paymentInvoice).balance}
          onClose={closePaymentModal}
          onSuccess={() => {
            closePaymentModal();
            fetchData();
          }}
          user={user}
          addToast={addToast}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Invoices</h3>
          <p className="text-sm text-muted-foreground">Track billing status and outstanding balances.</p>
        </div>
        {canManageFinances && (
          <Button type="button" onClick={() => setInvoiceModalState({ invoice: null, readOnly: false })}>
            Create invoice
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading invoices…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-4">Invoice #</th>
                <th className="py-2 pr-4">Client</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4 text-right">Total</th>
                <th className="py-2 pr-4 text-right">Balance</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => {
                const { total, balance } = getInvoiceFinancials(invoice);
                const derivedStatus = getDerivedStatus(invoice);
                const canRecordPayment =
                  canManageFinances && balance > 0 &&
                  (derivedStatus === InvoiceStatus.SENT || derivedStatus === InvoiceStatus.OVERDUE);
                return (
                  <tr key={invoice.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{invoice.invoiceNumber}</td>
                    <td className="py-2 pr-4">{clientMap.get(invoice.clientId) || 'Client unavailable'}</td>
                    <td className="py-2 pr-4">{projectMap.get(invoice.projectId) || 'Project unavailable'}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(total, currencyLabel(kpis))}</td>
                    <td className="py-2 pr-4 text-right font-semibold">{formatCurrency(balance, currencyLabel(kpis))}</td>
                    <td className="py-2 pr-4">
                      <InvoiceStatusBadge status={derivedStatus} />
                    </td>
                    <td className="py-2 pl-4">
                      <div className="flex justify-end gap-2">
                        {canManageFinances && invoice.status === InvoiceStatus.DRAFT && (
                          <Button
                            size="sm"
                            onClick={() => setInvoiceModalState({ invoice, readOnly: false })}
                            variant="secondary"
                          >
                            Edit
                          </Button>
                        )}
                        {canRecordPayment && (
                          <Button size="sm" onClick={() => setPaymentInvoice(invoice)}>
                            Record payment
                          </Button>
                        )}
                        {canManageFinances && derivedStatus !== InvoiceStatus.CANCELLED && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleInvoiceStatusChange(invoice.id, InvoiceStatus.CANCELLED)}
                          >
                            Cancel
                          </Button>
                        )}
                        {(!canManageFinances || derivedStatus === InvoiceStatus.PAID || derivedStatus === InvoiceStatus.CANCELLED) && (
                          <Button size="sm" variant="secondary" onClick={() => setInvoiceModalState({ invoice, readOnly: true })}>
                            View
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {invoices.length === 0 && (
                <tr>
                  <td className="py-4 text-sm text-muted-foreground" colSpan={7}>
                    No invoices recorded. Create one to start billing your clients.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  const renderExpenses = () => (
    <Card className="p-4">
      {expenseModalOpen && (
        <ExpenseModal
          expenseToEdit={expenseToEdit}
          onClose={() => {
            setExpenseModalOpen(false);
            setExpenseToEdit(null);
          }}
          onSuccess={handleExpenseSaved}
          user={user}
          projects={projects}
          addToast={addToast}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Expenses</h3>
          <p className="text-sm text-muted-foreground">Monitor spend across your projects.</p>
        </div>
        {canManageFinances && (
          <Button
            type="button"
            onClick={() => {
              setExpenseModalOpen(true);
              setExpenseToEdit(null);
            }}
          >
            Add expense
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading expenses…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4">Status</th>
                {canManageFinances && <th className="py-2 pl-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => {
                const statusColor =
                  expense.status === 'APPROVED' ? 'green' : expense.status === 'REJECTED' ? 'red' : 'yellow';
                return (
                  <tr key={expense.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="py-2 pr-4">{projectMap.get(expense.projectId) || 'Project unavailable'}</td>
                    <td className="py-2 pr-4">{expense.description}</td>
                    <td className="py-2 pr-4">{expense.category}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(expense.amount, currencyLabel(kpis))}</td>
                    <td className="py-2 pr-4">
                      <Tag label={expense.status} color={statusColor} />
                    </td>
                    {canManageFinances && (
                      <td className="py-2 pl-4">
                        <div className="flex justify-end">
                          <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setExpenseModalOpen(true);
                            setExpenseToEdit(expense);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr>
                  <td className="py-4 text-sm text-muted-foreground" colSpan={canManageFinances ? 7 : 6}>
                    No expenses recorded for this company.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  const renderClients = () => (
    <Card className="p-4">
      {isClientModalOpen && (
        <ClientModal
          clientToEdit={clientModalClient}
          onClose={closeClientModal}
          onSuccess={handleClientSaved}
          user={user}
          addToast={addToast}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Clients</h3>
          <p className="text-sm text-muted-foreground">Manage contacts and payment terms.</p>
        </div>
        {canManageFinances && (
          <Button
            type="button"
            onClick={() => {
              setClientModalClient(null);
              setClientModalOpen(true);
            }}
          >
            Add client
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading clients…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Payment terms</th>
                {canManageFinances && <th className="py-2 pl-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{client.name}</td>
                  <td className="py-2 pr-4">{client.contactEmail || client.email}</td>
                  <td className="py-2 pr-4">{client.contactPhone || client.phone}</td>
                  <td className="py-2 pr-4">{client.paymentTerms || 'Net 30'}</td>
                  {canManageFinances && (
                    <td className="py-2 pl-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setClientModalClient(client);
                            setClientModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td className="py-4 text-sm text-muted-foreground" colSpan={canManageFinances ? 5 : 4}>
                    No clients have been added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Financial cockpit</h2>
          <p className="text-sm text-muted-foreground">
            A consolidated, AI-ready view of revenue, cash flow, quotes, and spend for your workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tag label={`Invoices · ${invoices.length}`} color="blue" />
          <Tag label={`Clients · ${clients.length}`} color="green" />
          <Tag label={`Expenses · ${expenses.length}`} color="yellow" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['dashboard', 'invoices', 'expenses', 'clients'] as FinancialsTab[]).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'dashboard' && 'Overview'}
            {tab === 'invoices' && 'Invoices'}
            {tab === 'expenses' && 'Expenses'}
            {tab === 'clients' && 'Clients'}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'invoices' && renderInvoices()}
      {activeTab === 'expenses' && renderExpenses()}
      {activeTab === 'clients' && renderClients()}
    </div>
  );
};

export default FinancialsView;
