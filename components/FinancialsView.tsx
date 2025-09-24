import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    User,
    FinancialKPIs,
    MonthlyFinancials,
    CostBreakdown,
    Invoice,
    Quote,
    Client,
    Project,
    Permission,
    Expense,
    InvoiceStatus,
    QuoteStatus,
    InvoiceLineItem,
    InvoiceLineItemDraft,

  User,
  FinancialKPIs,
  MonthlyFinancials,
  CostBreakdown,
  Invoice,
  Quote,
  Client,
  Project,
  Permission,
  Expense,
  ExpenseStatus,
  InvoiceStatus,
  InvoiceLineItem,
  InvoiceLineItemDraft,
  FinancialForecast,
 
} from '../types';
import { getDerivedStatus, getInvoiceFinancials } from '../utils/finance';
import { api } from '../services/mockApi';
import { generateFinancialForecast } from '../services/ai';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { InvoiceStatusBadge, QuoteStatusBadge } from './ui/StatusBadge';
import './ui/barChartBar.css';
import { hasPermission } from '../services/auth';
import { Tag } from './ui/Tag';
import { ExpenseModal } from './ExpenseModal';
import ClientModal from './financials/ClientModal';
import InvoiceModal from './financials/InvoiceModal';
import PaymentModal from './financials/PaymentModal';
import { formatCurrency } from '../utils/finance';

type FinancialsTab = 'dashboard' | 'invoices' | 'expenses' | 'clients';


        </div>
      ))}
    </div>
  );
export const FinancialsView: React.FC<{ user: User; addToast: (message: string, type: 'success' | 'error') => void }> = ({
  user,
  addToast,
}) => {
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
    forecasts: [] as FinancialForecast[],
  });
  const [modal, setModal] = useState<'client' | 'invoice' | 'payment' | 'expense' | null>(null);
  const [selectedItem, setSelectedItem] = useState<Client | Invoice | Expense | null>(null);
  const [isGeneratingForecast, setIsGeneratingForecast] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const canManageFinances = hasPermission(user, Permission.MANAGE_FINANCES);

  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    if (!user.companyId) return;
    setLoading(true);
    try {
      const [
        kpiData,
        monthlyData,
        costsData,
        invoiceData,
        quoteData,
        expenseData,
        clientData,
        projectData,
        usersData,
        forecastData,
        companyData,

        forecastsData,
      ] = await Promise.all([
        api.getFinancialKPIsForCompany(user.companyId, { signal: controller.signal }),
        api.getMonthlyFinancials(user.companyId, { signal: controller.signal }),
        api.getCostBreakdown(user.companyId, { signal: controller.signal }),
        api.getInvoicesByCompany(user.companyId, { signal: controller.signal }),
        api.getQuotesByCompany(user.companyId, { signal: controller.signal }),
        api.getExpensesByCompany(user.companyId, { signal: controller.signal }),
        api.getClientsByCompany(user.companyId, { signal: controller.signal }),
        api.getProjectsByCompany(user.companyId, { signal: controller.signal }),
        api.getUsersByCompany(user.companyId, { signal: controller.signal }),
        api.getFinancialForecasts(user.companyId, { signal: controller.signal }),
        api.getCompanies({ signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      const companyRecord = companyData.find((company: { id?: string }) => company.id === user.companyId) as
        | { name?: string }
        | undefined;

      if (controller.signal.aborted) return;

      setData({
        kpis: kpiData,
        monthly: monthlyData,
        costs: costsData,
        invoices: invoiceData,
        quotes: quoteData,
        expenses: expenseData,
        clients: clientData,
        projects: projectData,
        users: usersData,
        forecasts: forecastData,
        companyName: companyRecord?.name ?? null,

        forecasts: forecastsData,
 
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      addToast('Failed to load financial data', 'error');
    } finally {
      if (controller.signal.aborted) return;
      setLoading(false);
    }
  }, [user.companyId, addToast]);

  useEffect(() => {
    fetchData();
    return () => {
      abortControllerRef.current?.abort();
    };
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
                                    <td className="px-4 py-3">{clientMap.get(invoice.clientId) || 'Client unavailable'}</td>
                                    <td className="px-4 py-3">{projectMap.get(invoice.projectId) || 'Project unavailable'}</td>
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
                            {data.quotes.map(quote => {
                                const clientName = clientMap.get(quote.clientId);
                                const projectName = projectMap.get(quote.projectId);

                                return (
                                    <tr key={quote.id} className="hover:bg-accent">
                                        <td className="px-4 py-3">{clientName || 'Client unavailable'}</td>
                                        <td className="px-4 py-3">{projectName || 'Project unavailable'}</td>
                                        <td className="px-4 py-3"><QuoteStatusBadge status={quote.status} /></td>
                                    </tr>
                                );
                            })}
                          </tbody>
                    </table>
                 </div>
            </Card>
        </div>
    );

    const handleUpdateInvoiceStatus = useCallback(
    async (invoiceId: string, status: InvoiceStatus) => {
      if (status === InvoiceStatus.CANCELLED) {
        if (!window.confirm('Are you sure you want to cancel this invoice? This action cannot be undone.')) {
          return;
        }
      }
      try {
        const invoice = data.invoices.find(i => i.id === invoiceId);
        if (!invoice) throw new Error('Invoice not found');
        await api.updateInvoice(invoiceId, { ...invoice, status }, user.id);
        addToast(`Invoice marked as ${status.toLowerCase()}.`, 'success');
        fetchData();
      } catch (error) {
        addToast('Failed to update invoice status.', 'error');
      }
    },
    [data.invoices, user.id, addToast, fetchData],
  );

  const handleGenerateForecast = useCallback(
    async (horizonMonths: number) => {
      if (!user.companyId) {
        return;
      }

        );

        setData(prev => ({ ...prev, forecasts: [storedForecast, ...prev.forecasts] }));
        addToast('Financial forecast updated.', 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate financial forecast.';
        setForecastError(message);
        addToast('Failed to generate financial forecast.', 'error');
      } finally {
        setIsGeneratingForecast(false);
      }
    },
    [
      user.companyId,
      user.id,
      data.companyName,
      data.kpis,
      data.monthly,
      data.costs,
      data.invoices,
      data.expenses,
      addToast,
    ],
  );

  const handleCreateInvoice = useCallback(() => {
    setSelectedItem(null);
    setModal('invoice');
  }, []);

  const handleOpenInvoice = useCallback((invoice: Invoice) => {
    setSelectedItem(invoice);
    setModal('invoice');
  }, []);

  const handleRecordPayment = useCallback((invoice: Invoice) => {
    setSelectedItem(invoice);
    setModal('payment');
  }, []);

  const handleCreateExpense = useCallback(() => {
    setSelectedItem(null);
    setModal('expense');
  }, []);

  const handleEditExpense = useCallback((expense: Expense) => {
    setSelectedItem(expense);
    setModal('expense');
  }, []);

  const handleAddClient = useCallback(() => {
    setSelectedItem(null);
    setModal('client');
  }, []);

  const handleEditClient = useCallback((client: Client) => {
    setSelectedItem(client);
    setModal('client');
  }, []);

  if (loading) return <Card>Loading financials...</Card>;

  const selectedInvoice = modal === 'invoice' || modal === 'payment' ? (selectedItem as Invoice) : null;
  const isInvoiceReadOnly =
    !canManageFinances ||
    selectedInvoice?.status === InvoiceStatus.PAID ||
    selectedInvoice?.status === InvoiceStatus.CANCELLED;

  return (
    <div className="space-y-6">
      <div className="text-center p-6">
        <h1 className="text-2xl font-bold">Financials</h1>
        <p className="text-muted-foreground">Financial data will be displayed here...</p>
      </div>
    </div>
  );



interface DashboardTabProps {
  kpis: FinancialKPIs | null;
  monthly: MonthlyFinancials[];
  costs: CostBreakdown[];
  forecasts: FinancialForecast[];
  onGenerateForecast: (horizon: number) => void;
  isGeneratingForecast: boolean;
  forecastError: string | null;
}

const DashboardTab = React.memo(
  ({
    kpis,
    monthly,
    costs,
    forecasts,
    onGenerateForecast,
    isGeneratingForecast,
    forecastError,
  }: DashboardTabProps) => {
    const [selectedHorizon, setSelectedHorizon] = useState(3);

    const renderSummary = useCallback(
      (summary: string, keyPrefix: string) =>
        summary
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map((line, index) => (
            <p
              key={`${keyPrefix}-${index}`}
              dangerouslySetInnerHTML={{
                __html: line
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                  .replace(/^[-•]\s+/, '• '),
              }}
            />
          )),
      [],
    );

    const latestForecast = forecasts[0] ?? null;
    const metadata = (latestForecast?.metadata ?? {}) as Record<string, unknown>;
    const currencyValue = metadata['currency'];
    const currency = typeof currencyValue === 'string' ? currencyValue : kpis?.currency ?? 'GBP';
    const toNumber = (value: unknown): number | undefined =>
      typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    const averageProfit = toNumber(metadata['averageMonthlyProfit']);
    const projectedCash = toNumber(metadata['projectedCash']);
    const profitTrend = toNumber(metadata['profitTrendPct']);
    const openInvoiceBalance = toNumber(metadata['openInvoiceBalance']);
    const burnRate = toNumber(metadata['approvedExpenseRunRate']);
    const tags: { label: string; value: string }[] = [];

    const displayHorizon =
      typeof latestForecast?.horizonMonths === 'number'
        ? latestForecast.horizonMonths
        : toNumber(metadata['horizonMonths']) ?? selectedHorizon;

    if (typeof averageProfit === 'number') {
      tags.push({ label: 'Avg monthly profit', value: formatCurrency(averageProfit, currency) });
    }
    if (typeof projectedCash === 'number') {
      tags.push({ label: `${displayHorizon} mo cash`, value: formatCurrency(projectedCash, currency) });
    }
    if (typeof profitTrend === 'number') {
      tags.push({ label: 'Trend', value: formatSignedPercentage(profitTrend) });
    }
    if (typeof openInvoiceBalance === 'number') {
      tags.push({ label: 'Open invoices', value: formatCurrency(openInvoiceBalance, currency) });
    }
    if (typeof burnRate === 'number') {
      tags.push({ label: 'Spend/mo', value: formatCurrency(burnRate, currency) });
    }
    if (metadata['isFallback'] === true) {
      tags.push({ label: 'Mode', value: 'Offline summary' });
    }

    const previousForecasts = forecasts.slice(1, 5);

    return (
        </div>
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
        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-lg">AI Cash Flow Outlook</h3>
                <p className="text-sm text-muted-foreground">
                  Generate a Gemini-powered forecast from recent invoices, expenses, and KPIs.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedHorizon}
                  onChange={event => setSelectedHorizon(Number(event.target.value))}
                  className="border border-input rounded-md px-2 py-1 text-sm bg-background"
                  disabled={isGeneratingForecast}
                >
                  <option value={3}>Next 3 months</option>
                  <option value={6}>Next 6 months</option>
                  <option value={12}>Next 12 months</option>
                </select>
                <Button
                  onClick={() => onGenerateForecast(selectedHorizon)}
                  isLoading={isGeneratingForecast}
                  disabled={isGeneratingForecast}
                >
                  {latestForecast ? 'Refresh Outlook' : 'Generate Outlook'}
                </Button>
              </div>
            </div>
            {forecastError && <p className="text-sm text-destructive">{forecastError}</p>}
            {latestForecast ? (
              <>
                <div className="text-sm space-y-1 whitespace-pre-wrap">
                  {renderSummary(latestForecast.summary, 'latest-forecast')}
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span
                        key={`${tag.label}-${tag.value}`}
                        className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                      >
                        {tag.label}: {tag.value}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Generated {new Date(latestForecast.createdAt).toLocaleString()}
                  {latestForecast.model ? ` • ${latestForecast.model}` : ''}
                  {metadata['isFallback'] === true ? ' • offline summary' : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run the assistant to model upcoming cash flow and profitability using live platform data.
              </p>
            )}
            {previousForecasts.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">Previous forecasts</summary>
                <div className="mt-2 space-y-3 max-h-56 overflow-y-auto pr-1">
                  {previousForecasts.map(forecast => {
                    const entryMetadata = (forecast.metadata ?? {}) as Record<string, unknown>;
                    return (
                      <div key={forecast.id} className="border border-border rounded-md p-3 bg-background/60">
                        <p className="text-xs text-muted-foreground">
                          {new Date(forecast.createdAt).toLocaleString()}
                          {forecast.model ? ` • ${forecast.model}` : ''}
                          {entryMetadata['isFallback'] === true ? ' • offline summary' : ''}
                        </p>
                        <div className="text-xs space-y-1 whitespace-pre-wrap mt-1">
                          {renderSummary(forecast.summary, forecast.id)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        </Card>
      </div>
    );
  },
);


interface InvoicesTabProps {
  invoices: Invoice[];
  quotes: Quote[];
  canManageFinances: boolean;
  clientMap: Map<string, string>;
  projectMap: Map<string, string>;
  onCreateInvoice: () => void;
  onOpenInvoice: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
  onUpdateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
}

const InvoicesTab = React.memo(
  ({ invoices, quotes, canManageFinances, clientMap, projectMap, onCreateInvoice, onOpenInvoice, onRecordPayment, onUpdateInvoiceStatus }: InvoicesTabProps) => (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Invoices</h3>
          {canManageFinances && <Button onClick={onCreateInvoice}>Create Invoice</Button>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Number</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Client</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Project</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Total</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Balance Due</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {invoices.map(invoice => {
                const { total, balance } = getInvoiceFinancials(invoice);
                const derivedStatus = getDerivedStatus(invoice);
                return (
                  <tr key={invoice.id} className="hover:bg-accent">
                    <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3">{clientMap.get(invoice.clientId)}</td>
                    <td className="px-4 py-3">{projectMap.get(invoice.projectId)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(total)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(balance)}</td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={derivedStatus} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {canManageFinances && invoice.status === InvoiceStatus.DRAFT && (
                        <>
                          <Button size="sm" variant="success" onClick={() => onUpdateInvoiceStatus(invoice.id, InvoiceStatus.SENT)}>
                            Send
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => onOpenInvoice(invoice)}>
                            Edit
                          </Button>
                        </>
                      )}
                      {canManageFinances &&
                        (invoice.status === InvoiceStatus.SENT || derivedStatus === InvoiceStatus.OVERDUE) && (
                          <>
                            <Button size="sm" onClick={() => onRecordPayment(invoice)}>
                              Record Payment
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => onUpdateInvoiceStatus(invoice.id, InvoiceStatus.CANCELLED)}>
                              Cancel
                            </Button>
                          </>
                        )}
                      {(invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) && (
                        <Button size="sm" variant="secondary" onClick={() => onOpenInvoice(invoice)}>
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold text-lg mb-4">Quotes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Client</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Project</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {quotes.map(quote => (
                <tr key={quote.id}>
                  <td className="px-4 py-3">{clientMap.get(quote.id) ?? 'Client'}</td>
                  <td className="px-4 py-3">{projectMap.get(quote.id) ?? 'Project'}</td>
                  <td className="px-4 py-3">
                    <QuoteStatusBadge status={quote.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  ),
);

InvoicesTab.displayName = 'InvoicesTab';

interface ExpensesTabProps {
  expenses: Expense[];
  userMap: Map<string, string>;
  projectMap: Map<string, string>;
  onCreateExpense: () => void;
  onEditExpense: (expense: Expense) => void;
}

const ExpensesTab = React.memo(({ expenses, userMap, projectMap, onCreateExpense, onEditExpense }: ExpensesTabProps) => (
  <Card>
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-semibold text-lg">Expenses</h3>
      <Button onClick={onCreateExpense}>Submit Expense</Button>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Submitted By</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Project</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Description</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Amount</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {expenses.map(exp => (
            <tr key={exp.id}>
              <td className="px-4 py-3">{new Date(exp.submittedAt).toLocaleDateString()}</td>
              <td className="px-4 py-3">{userMap.get(exp.userId)}</td>
              <td className="px-4 py-3">{projectMap.get(exp.projectId)}</td>
              <td className="px-4 py-3">{exp.description}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(exp.amount)}</td>
              <td className="px-4 py-3">
                <Tag
                  label={exp.status}
                  color={
                    exp.status === ExpenseStatus.APPROVED
                      ? 'green'
                      : exp.status === ExpenseStatus.REJECTED
                      ? 'red'
                      : 'yellow'
                  }
                />
              </td>
              <td className="px-4 py-3 text-right">
                {exp.status === ExpenseStatus.REJECTED && (
                  <Button size="sm" variant="secondary" onClick={() => onEditExpense(exp)}>
                    Edit &amp; Resubmit
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Card>
));

ExpensesTab.displayName = 'ExpensesTab';

interface ClientsTabProps {
  clients: Client[];
  canManageFinances: boolean;
  onAddClient: () => void;
  onEditClient: (client: Client) => void;
}

const ClientsTab = React.memo(({ clients, canManageFinances, onAddClient, onEditClient }: ClientsTabProps) => (
  <div>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Clients</h2>
      {canManageFinances && <Button onClick={onAddClient}>Add Client</Button>}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clients.map(client => (
        <Card key={client.id} className="cursor-pointer hover:shadow-lg" onClick={() => onEditClient(client)}>
          <h3 className="text-lg font-semibold">{client.name}</h3>
          <p className="text-sm text-muted-foreground">{client.contactEmail}</p>
        </Card>
      ))}
    </div>
  </div>
));

ClientsTab.displayName = 'ClientsTab';

export default FinancialsView;
};
