import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
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
  QuoteStatus,
  FinancialForecast,
} from '../types';
import { getDerivedStatus, getInvoiceFinancials } from '../utils/finance';
import { api } from '../services/mockApi';
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

type FinancialsTab = 'dashboard' | 'invoices' | 'expenses' | 'clients';

const formatCurrency = (amount: number, currency: string = 'GBP') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const createLineItemDraft = (): InvoiceLineItemDraft => ({
  id: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  description: '',
  quantity: 1,
  unitPrice: 0,
});

const mapInvoiceLineItemToDraft = (item: InvoiceLineItem): InvoiceLineItemDraft => {
  const safeQuantity = Number.isFinite(item.quantity) ? Math.max(item.quantity, 0) : 0;
  const safeRate = Number.isFinite(item.rate) ? Math.max(item.rate, 0) : 0;
  const safeUnitPrice = Number.isFinite(item.unitPrice) ? Math.max(item.unitPrice, 0) : safeRate;

  return {
    id: item.id,
    description: item.description,
    quantity: safeQuantity,
    unitPrice: safeUnitPrice > 0 ? safeUnitPrice : safeRate,
  };
};

const parseNumberInputValue = (value: string): number => {
  if (value.trim() === '') {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type EditableInvoiceLineItemField = Exclude<keyof InvoiceLineItemDraft, 'id'>;

const ClientModal: React.FC<{
  clientToEdit?: Client | null;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ clientToEdit, onClose, onSuccess, user, addToast }) => {
  const [name, setName] = useState(clientToEdit?.name || '');
  const [email, setEmail] = useState(clientToEdit?.contactEmail || '');
  const [phone, setPhone] = useState(clientToEdit?.contactPhone || '');
  const [address, setAddress] = useState(clientToEdit?.billingAddress || '');
  const [terms, setTerms] = useState(clientToEdit?.paymentTerms || 'Net 30');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const clientData = {
        name,
        contactEmail: email,
        contactPhone: phone,
        billingAddress: address,
        paymentTerms: terms,
      };
      if (clientToEdit) {
        await api.updateClient(clientToEdit.id, clientData, user.id);
        addToast('Client updated.', 'success');
      } else {
        await api.createClient(clientData, user.id);
        addToast('Client added.', 'success');
      }
      onSuccess();
      onClose();
    } catch {
      addToast('Failed to save client.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">{clientToEdit ? 'Edit Client' : 'Add New Client'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Client Name"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Contact Email"
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Contact Phone"
            className="w-full p-2 border rounded"
            required
          />
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Billing Address"
            className="w-full p-2 border rounded"
            rows={3}
            required
          />
          <input
            type="text"
            value={terms}
            onChange={e => setTerms(e.target.value)}
            placeholder="Payment Terms (e.g., Net 30)"
            className="w-full p-2 border rounded"
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Save Client
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};



const BarChart: React.FC<{ data: { label: string; value: number }[]; barColor: string }> = ({ data, barColor }) => {
  const maxValue = Math.max(...data.map(entry => entry.value), 0);

  return (
    <div className="w-full h-64 flex items-end justify-around gap-2 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/40">
      {data.map(entry => (
        <div key={entry.label} className="flex flex-col items-center justify-end h-full w-full">
          <div
            className={`w-3/4 rounded-t-md transition-all ${barColor}`}
            style={{ height: `${maxValue > 0 ? Math.round((entry.value / maxValue) * 100) : 0}%` }}
            title={formatCurrency(entry.value)}
          />
          <span className="text-xs mt-2 text-slate-600 dark:text-slate-300">{entry.label}</span>
        </div>
      ))}
    </div>
  );
};

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
    companyName: null as string | null,
  });
  const [modal, setModal] = useState<'client' | 'invoice' | 'payment' | 'expense' | null>(null);
  const [selectedItem, setSelectedItem] = useState<Client | Invoice | Expense | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const canManageFinances = hasPermission(user, Permission.MANAGE_FINANCES);

  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    if (!user.companyId) {
      setData(prev => ({ ...prev, invoices: [], expenses: [], clients: [], projects: [], forecasts: [] }));
      setLoading(false);
      return;
    }

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
      ]);

      if (controller.signal.aborted) return;

      const companyRecord = companyData.find(entry => entry.id === user.companyId) as { name?: string } | undefined;

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
      });
      setForecastError(null);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('Failed to load financial data', error);
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
  }, [fetchData]);

  const projectMap = useMemo(() => new Map(data.projects.map(project => [project.id, project.name])), [data.projects]);
  const clientMap = useMemo(() => new Map(data.clients.map(client => [client.id, client.name])), [data.clients]);

  const approvedExpenses = useMemo(
    () => data.expenses.filter(expense => expense.status === ExpenseStatus.APPROVED || expense.status === ExpenseStatus.PAID),
    [data.expenses],
  );
  const approvedExpenseTotal = useMemo(
    () => approvedExpenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0),
    [approvedExpenses],
  );

  const invoiceMetrics = useMemo(() => {
    return data.invoices.reduce(
      (
        acc,
        invoice,
      ) => {
        const financials = getInvoiceFinancials(invoice);
        const derivedStatus = getDerivedStatus(invoice);
        acc.pipeline += financials.total;
        if (derivedStatus !== InvoiceStatus.PAID && derivedStatus !== InvoiceStatus.CANCELLED) {
          acc.outstanding += financials.balance;
        }
        if (derivedStatus === InvoiceStatus.OVERDUE) {
          acc.overdue += financials.balance;
        }
        return acc;
      },
      { pipeline: 0, outstanding: 0, overdue: 0 },
    );
  }, [data.invoices]);

  const latestForecast = data.forecasts[0] ?? null;
  const previousForecasts = data.forecasts.slice(1, 4);

  const revenueTrend = useMemo(() => data.monthly.map(entry => ({ label: entry.month, value: entry.revenue })), [data.monthly]);
  const profitTrend = useMemo(() => data.monthly.map(entry => ({ label: entry.month, value: entry.profit })), [data.monthly]);
  const costBreakdown = useMemo(() => data.costs.map(entry => ({ label: entry.category, value: entry.amount })), [data.costs]);

  const quoteSummary = useMemo(() => {
    return data.quotes.reduce(
      (acc, quote) => {
        acc.total += 1;
        acc[quote.status] = (acc[quote.status] ?? 0) + 1;
        return acc;
      },
      { total: 0 } as Record<'total' | QuoteStatus, number>,
    );
  }, [data.quotes]);

  const handleGenerateForecast = useCallback(
    async (horizonMonths: number) => {
      if (!user.companyId) {
        addToast('A company is required to generate forecasts.', 'error');
        return;
      }

      setIsGeneratingForecast(true);
      setForecastError(null);
      try {
        const invoice = data.invoices.find(i => i.id === invoiceId);
        if (!invoice) throw new Error('Invoice not found');
        await api.updateInvoice(invoiceId, { ...invoice, status }, user.id);
        addToast(`Invoice marked as ${status.toLowerCase()}.`, 'success');
        fetchData();
      } catch {
        addToast('Failed to update invoice status.', 'error');
      }
    },
    [data.invoices, user.id, addToast, fetchData],
  );

  const handleCreateInvoice = useCallback(() => {
    setSelectedItem(null);
    setModal('invoice');
  }, []);

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
};
