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

const InvoiceModal: React.FC<{
  invoiceToEdit?: Invoice | null;
  isReadOnly?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
  clients: Client[];
  projects: Project[];
  users: User[];
  forecasts: FinancialForecast[];
  companyName: string | null;
}> = ({ invoiceToEdit, isReadOnly = false, onClose, onSuccess, user, clients, projects }) => {
  // Implementation would go here
  return null; // Placeholder
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

const InvoiceModal: React.FC<{ invoiceToEdit?: Invoice | null, isReadOnly?: boolean, onClose: () => void, onSuccess: () => void, user: User, clients: Client[], projects: Project[], addToast: (m:string,t:'success'|'error')=>void }> = ({ invoiceToEdit, isReadOnly = false, onClose, onSuccess, user, clients, projects, addToast }) => {
    const [clientId, setClientId] = useState<string>(invoiceToEdit?.clientId.toString() || '');
    const [projectId, setProjectId] = useState<string>(invoiceToEdit?.projectId.toString() || '');
    const [issuedAt, setIssuedAt] = useState(new Date(invoiceToEdit?.issuedAt || new Date()).toISOString().split('T')[0]);
    const [dueAt, setDueAt] = useState(new Date(invoiceToEdit?.dueAt || Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [lineItems, setLineItems] = useState<Partial<InvoiceLineItem>[]>(invoiceToEdit?.lineItems || [{ id: `new-${Date.now()}`, description: '', quantity: 1, unitPrice: 0 }]);
    const [taxRate, setTaxRate] = useState<number | ''>(invoiceToEdit ? invoiceToEdit.taxRate * 100 : 20);
    const [retentionRate, setRetentionRate] = useState<number | ''>(invoiceToEdit ? invoiceToEdit.retentionRate * 100 : 5);
    const [notes, setNotes] = useState(invoiceToEdit?.notes || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleLineItemChange = (index: number, field: keyof Omit<InvoiceLineItem, 'id'|'amount'|'rate'>, value: string | number) => {
        const newItems = [...lineItems];
        (newItems[index] as any)[field] = value;
        setLineItems(newItems);
    };

    const addLineItem = () => setLineItems([...lineItems, { id: `new-${Date.now()}`, description: '', quantity: 1, unitPrice: 0 }]);
    const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));

    const { subtotal, taxAmount, retentionAmount, total } = useMemo(() => {
        const subtotalCalc = lineItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
        const taxAmountCalc = subtotalCalc * (Number(taxRate) / 100);
        const retentionAmountCalc = subtotalCalc * (Number(retentionRate) / 100);
        const totalCalc = subtotalCalc + taxAmountCalc - retentionAmountCalc;
        return { subtotal: subtotalCalc, taxAmount: taxAmountCalc, retentionAmount: retentionAmountCalc, total: totalCalc };
    }, [lineItems, taxRate, retentionRate]);
    
    const amountPaid = invoiceToEdit?.amountPaid || 0;
    const balance = total - amountPaid;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const finalLineItems = lineItems
                .filter(li => li.description && li.quantity! > 0 && li.unitPrice! > 0)
                .map(li => ({
                    id: li.id!.toString().startsWith('new-') ? String(Date.now() + Math.random()) : li.id!,
                    description: li.description!,
                    quantity: Number(li.quantity),
                    unitPrice: Number(li.unitPrice),
                    amount: Number(li.quantity) * Number(li.unitPrice)
                }));
            
            const invoiceData = {
                clientId: clientId,
                projectId: projectId,
                issuedAt: new Date(issuedAt).toISOString(),
                dueAt: new Date(dueAt).toISOString(),
                lineItems: finalLineItems,
                taxRate: Number(taxRate) / 100,
                retentionRate: Number(retentionRate) / 100,
                notes,
                subtotal, taxAmount, retentionAmount, total, amountPaid, balance,
                payments: invoiceToEdit?.payments || [],
                status: invoiceToEdit?.status || InvoiceStatus.DRAFT,
                invoiceNumber: invoiceToEdit?.invoiceNumber || `INV-${Math.floor(Math.random() * 9000) + 1000}`,
            };
            if(invoiceToEdit) {
                 await api.updateInvoice(invoiceToEdit.id, invoiceData, user.id);
                 addToast("Invoice updated.", "success");
            } else {
                 await api.createInvoice(invoiceData, user.id);
                 addToast("Invoice created as draft.", "success");
            }
            onSuccess();
            onClose();
        } catch(e) {
            addToast("Failed to save invoice.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">{invoiceToEdit ? `${isReadOnly ? 'View' : 'Edit'} Invoice ${invoiceToEdit.invoiceNumber}` : 'Create Invoice'}</h3>
                <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
                    <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
                        <div className="grid grid-cols-2 gap-4">
                            <select value={clientId} onChange={e=>setClientId(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-slate-800" required disabled={isReadOnly}><option value="">Select Client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                            <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="w-full p-2 border rounded bg-white dark:bg-slate-800" required disabled={isReadOnly}><option value="">Select Project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
                            <div><label className="text-xs">Issued Date</label><input type="date" value={issuedAt} onChange={e=>setIssuedAt(e.target.value)} className="w-full p-2 border rounded" disabled={isReadOnly}/></div>
                            <div><label className="text-xs">Due Date</label><input type="date" value={dueAt} onChange={e=>setDueAt(e.target.value)} className="w-full p-2 border rounded" disabled={isReadOnly}/></div>
                        </div>
                        <div className="border-t pt-2">
                            <h4 className="font-semibold">Line Items</h4>
                            <div className="grid grid-cols-[1fr,90px,130px,130px,40px] gap-2 items-center mt-1 text-xs text-muted-foreground">
                                <span>Description</span>
                                <span className="text-right">Quantity</span>
                                <span className="text-right">Unit Price</span>
                                <span className="text-right">Amount</span>
                            </div>
                            {lineItems.map((item, i) => (
                                <div key={item.id} className="grid grid-cols-[1fr,90px,130px,130px,40px] gap-2 items-center mt-2">
                                    <input type="text" value={item.description} onChange={e=>handleLineItemChange(i, 'description', e.target.value)} placeholder="Item or service description" className="p-1 border rounded" disabled={isReadOnly}/>
                                    <input type="number" value={item.quantity} onChange={e=>handleLineItemChange(i, 'quantity', Number(e.target.value))} placeholder="1" className="p-1 border rounded text-right" disabled={isReadOnly}/>
                                    <input type="number" value={item.unitPrice} onChange={e=>handleLineItemChange(i, 'unitPrice', Number(e.target.value))} placeholder="0.00" className="p-1 border rounded text-right" disabled={isReadOnly}/>
                                    <span className="p-1 text-right font-medium">{formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}</span>
                                    {!isReadOnly && <Button type="button" variant="danger" size="sm" onClick={() => removeLineItem(i)}>&times;</Button>}
                                </div>
                            ))}
                            {!isReadOnly && <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={addLineItem}>+ Add Item</Button>}
                        </div>
                        <div className="border-t pt-4 grid grid-cols-2 gap-8">
                            <div>
                                 <h4 className="font-semibold mb-2">Notes</h4>
                                <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Payment details, terms and conditions..." rows={6} className="p-2 border rounded w-full" disabled={isReadOnly}/>
                            </div>
                            <div className="space-y-2">
                                 <h4 className="font-semibold mb-2">Totals</h4>
                                <div className="flex justify-between items-center"><span className="text-sm">Subtotal:</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                                <div className="flex justify-between items-center"><label htmlFor="taxRate" className="text-sm">Tax (%):</label><input id="taxRate" type="number" value={taxRate} onChange={e=>setTaxRate(e.target.value === '' ? '' : Number(e.target.value))} className="w-24 p-1 border rounded text-right" disabled={isReadOnly}/></div>
                                 <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Tax Amount:</span><span>{formatCurrency(taxAmount)}</span></div>
                                 <div className="flex justify-between items-center"><label htmlFor="retentionRate" className="text-sm">Retention (%):</label><input id="retentionRate" type="number" value={retentionRate} onChange={e=>setRetentionRate(e.target.value === '' ? '' : Number(e.target.value))} className="w-24 p-1 border rounded text-right" disabled={isReadOnly}/></div>
                                <div className="flex justify-between items-center"><span className="text-sm text-red-600">Retention Held:</span><span className="text-red-600 font-medium">-{formatCurrency(retentionAmount)}</span></div>
                                <div className="flex justify-between items-center font-bold text-lg pt-2 border-t"><span >Total Due:</span><span>{formatCurrency(total)}</span></div>
                                {invoiceToEdit && (
                                    <>
                                     <div className="flex justify-between items-center text-sm"><span >Amount Paid:</span><span>-{formatCurrency(amountPaid)}</span></div>
                                     <div className="flex justify-between items-center font-bold text-lg text-green-600"><span >Balance:</span><span>{formatCurrency(balance)}</span></div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t mt-4 flex-shrink-0">
                        <Button type="button" variant="secondary" onClick={onClose}>{isReadOnly ? 'Close' : 'Cancel'}</Button>
                        {!isReadOnly && <Button type="submit" isLoading={isSaving}>Save Invoice</Button>}
                    </div>
                </form>
            </Card>
        </div>
    );
const forecastSummaryToElements = (summary: string) =>
  summary
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => (
      <p key={`${line}-${index}`} className="text-sm whitespace-pre-wrap leading-relaxed">
        {line}
      </p>
    ));

const expenseStatusColour = (status: ExpenseStatus): 'green' | 'blue' | 'red' | 'gray' | 'yellow' => {
  switch (status) {
    case ExpenseStatus.APPROVED:
      return 'green';
    case ExpenseStatus.PAID:
      return 'blue';
    case ExpenseStatus.REJECTED:
      return 'red';
    default:
      return 'yellow';
  }
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="space-y-1 p-4">
          <p className="text-sm text-muted-foreground">Profitability</p>
          <p className="text-3xl font-semibold">
            {typeof data.kpis?.profitability === 'number' ? `${data.kpis.profitability.toFixed(1)}%` : '—'}
          </p>
        </Card>
        <Card className="space-y-1 p-4">
          <p className="text-sm text-muted-foreground">Project margin</p>
          <p className="text-3xl font-semibold">
            {typeof data.kpis?.projectMargin === 'number' ? `${data.kpis.projectMargin.toFixed(1)}%` : '—'}
          </p>
        </Card>
        <Card className="space-y-1 p-4">
          <p className="text-sm text-muted-foreground">Cash flow</p>
          <p className="text-3xl font-semibold">{formatCurrency(data.kpis?.cashFlow ?? 0, currency)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Revenue momentum</h2>
            <p className="text-sm text-muted-foreground">Trailing performance for the last reporting periods.</p>
          </div>
          {revenueTrend.length > 0 ? (
            <BarChart data={revenueTrend} barColor="bg-blue-500" />
          ) : (
            <p className="text-sm text-muted-foreground">No revenue history captured yet.</p>
          )}
        </Card>
        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Profit trend</h2>
            <p className="text-sm text-muted-foreground">Observed profit trajectory across the same period.</p>
          </div>
          {profitTrend.length > 0 ? (
            <BarChart data={profitTrend} barColor="bg-emerald-500" />
          ) : (
            <p className="text-sm text-muted-foreground">No profit figures recorded.</p>
          )}
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Cash outlook</h2>
            <p className="text-sm text-muted-foreground">Generate and review medium-term forecasts.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground" htmlFor="forecast-horizon">
              Horizon (months)
            </label>
            <select
              id="forecast-horizon"
              className="border rounded px-2 py-1 text-sm bg-white dark:bg-slate-900"
              value={forecastHorizon}
              onChange={event => setForecastHorizon(Number(event.target.value))}
            >
              {[3, 6, 9, 12].map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Button onClick={() => handleGenerateForecast(forecastHorizon)} isLoading={isGeneratingForecast}>
              Generate forecast
            </Button>
          </div>
        </div>
        {forecastError && <p className="text-sm text-destructive">{forecastError}</p>}
        {latestForecast ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-semibold">Latest forecast</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(latestForecast.createdAt).toLocaleString()} • {latestForecast.horizonMonths}-month outlook
                </p>
              </div>
              {latestForecast.model && (
                <Tag label={latestForecast.model} color="blue" statusIndicator="blue" />
              )}
            </div>
            <div className="space-y-2">{forecastSummaryToElements(latestForecast.summary)}</div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Generate your first forecast to project runway and cash position.</p>
        )}
        {previousForecasts.length > 0 && (
          <details className="pt-2">
            <summary className="cursor-pointer text-sm text-muted-foreground">Previous runs</summary>
            <div className="mt-3 space-y-3 max-h-48 overflow-y-auto pr-2">
              {previousForecasts.map(entry => (
                <Card key={entry.id} className="p-3 space-y-1 bg-muted">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {new Date(entry.createdAt).toLocaleString()} • {entry.horizonMonths}-month horizon
                    </span>
                    {entry.model && <span>{entry.model}</span>}
                  </div>
                  <div className="space-y-1">{forecastSummaryToElements(entry.summary)}</div>
                </Card>
              ))}
            </div>
          </details>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-2">
          <h3 className="text-lg font-semibold">Invoice pipeline</h3>
          <p className="text-3xl font-semibold">{formatCurrency(invoiceMetrics.pipeline, currency)}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(invoiceMetrics.outstanding, currency)} outstanding • {formatCurrency(invoiceMetrics.overdue, currency)}
            {' '}overdue
          </p>
        </Card>
        <Card className="p-6 space-y-2">
          <h3 className="text-lg font-semibold">Approved expenses</h3>
          <p className="text-3xl font-semibold">{formatCurrency(approvedExpenseTotal, currency)}</p>
          <p className="text-sm text-muted-foreground">{approvedExpenses.length} approved or paid expenses</p>
        </Card>
        <Card className="p-6 space-y-2">
          <h3 className="text-lg font-semibold">Quote status</h3>
          <p className="text-sm text-muted-foreground">{quoteSummary.total} quotes tracked</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {([QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.ACCEPTED, QuoteStatus.REJECTED] as QuoteStatus[]).map(status => (
              <Tag key={status} label={`${status.toLowerCase()}: ${quoteSummary[status] ?? 0}`} />
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-3">
        <h3 className="text-lg font-semibold">Cost allocation</h3>
        {costBreakdown.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {costBreakdown.map(entry => (
              <li key={entry.label} className="flex items-center justify-between bg-muted rounded px-3 py-2">
                <span>{entry.label}</span>
                <span className="font-medium">{formatCurrency(entry.value, currency)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No cost breakdown recorded.</p>
        )}
      </Card>
    </div>
  </div>
));

DashboardTab.displayName = 'DashboardTab';

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
