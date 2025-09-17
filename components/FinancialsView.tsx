import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, FinancialKPIs, MonthlyFinancials, CostBreakdown, Invoice, Quote, Client, Project, Permission, Expense, ExpenseStatus, InvoiceStatus, QuoteStatus } from '../types';

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

const formatCurrency = (amount: number, currency: string = 'GBP') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);




 const formatSignedPercentage = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0%';
  }
  const rounded = Number(value.toFixed(1));
  const prefix = rounded > 0 ? '+' : '';
  return `${prefix}${rounded}%`;
};

 



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
    } catch (error) {
      addToast('Failed to save client.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
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
  addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ invoiceToEdit, isReadOnly = false, onClose, onSuccess, user, clients, projects, addToast }) => {
  const [clientId, setClientId] = useState<string>(invoiceToEdit?.clientId?.toString() || '');
  const [projectId, setProjectId] = useState<string>(invoiceToEdit?.projectId?.toString() || '');
  const [issuedAt, setIssuedAt] = useState(new Date(invoiceToEdit?.issuedAt || new Date()).toISOString().split('T')[0]);
  const [dueAt, setDueAt] = useState(
    new Date(invoiceToEdit?.dueAt || Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [lineItems, setLineItems] = useState<InvoiceLineItemDraft[]>(() =>
    invoiceToEdit?.lineItems?.length
      ? invoiceToEdit.lineItems.map(mapInvoiceLineItemToDraft)
      : [createLineItemDraft()],
  );
  const [taxRate, setTaxRate] = useState<number | ''>(invoiceToEdit ? invoiceToEdit.taxRate * 100 : 20);
  const [retentionRate, setRetentionRate] = useState<number | ''>(invoiceToEdit ? invoiceToEdit.retentionRate * 100 : 5);
  const [notes, setNotes] = useState(invoiceToEdit?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLineItems(
      invoiceToEdit?.lineItems?.length
        ? invoiceToEdit.lineItems.map(mapInvoiceLineItemToDraft)
        : [createLineItemDraft()],
    );
  }, [invoiceToEdit?.id]);

  const handleLineItemChange = <Field extends EditableInvoiceLineItemField>(
    index: number,
    field: Field,
    value: InvoiceLineItemDraft[Field],
  ) => {
    setLineItems(prevItems => prevItems.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
  };

  const addLineItem = () => setLineItems(prevItems => [...prevItems, createLineItemDraft()]);
  const removeLineItem = (index: number) =>
    setLineItems(prevItems => prevItems.filter((_, itemIndex) => itemIndex !== index));

  const { subtotal, taxAmount, retentionAmount, total } = useMemo(() => {
    const subtotalCalc = lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const taxPercentage = typeof taxRate === 'number' ? taxRate : 0;
    const retentionPercentage = typeof retentionRate === 'number' ? retentionRate : 0;
    const taxAmountCalc = subtotalCalc * (taxPercentage / 100);
    const retentionAmountCalc = subtotalCalc * (retentionPercentage / 100);
    const totalCalc = subtotalCalc + taxAmountCalc - retentionAmountCalc;
    return { subtotal: subtotalCalc, taxAmount: taxAmountCalc, retentionAmount: retentionAmountCalc, total: totalCalc };
  }, [lineItems, taxRate, retentionRate]);

  const amountPaid = invoiceToEdit?.amountPaid || 0;
  const balance = total - amountPaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalLineItems = lineItems.reduce<InvoiceLineItem[]>((acc, item) => {
        const description = item.description.trim();
        const quantity = Math.max(item.quantity, 0);
        const unitPrice = Math.max(item.unitPrice, 0);

        if (!description || quantity <= 0 || unitPrice <= 0) {
          return acc;
        }

        acc.push({
          id: item.id.startsWith('new-') ? String(Date.now() + Math.random()) : item.id,
          description,
          quantity,
          unitPrice,
          rate: unitPrice,
          amount: quantity * unitPrice,
        });

        return acc;
      }, []);

      const invoiceData = {
        clientId,
        projectId,
        issuedAt: new Date(issuedAt).toISOString(),
        dueAt: new Date(dueAt).toISOString(),
        lineItems: finalLineItems,
        taxRate: Number(taxRate) / 100,
        retentionRate: Number(retentionRate) / 100,
        notes,
        subtotal,
        taxAmount,
        retentionAmount,
        total,
        amountPaid,
        balance,
        payments: invoiceToEdit?.payments || [],
        status: invoiceToEdit?.status || InvoiceStatus.DRAFT,
      };

      if (invoiceToEdit) {
        const updated = await api.updateInvoice(
          invoiceToEdit.id,
          { ...invoiceData, invoiceNumber: invoiceToEdit.invoiceNumber },
          user.id,
        );
        addToast(`Invoice ${updated.invoiceNumber} updated.`, 'success');
      } else {
        const created = await api.createInvoice(invoiceData, user.id);
        if (!created.invoiceNumber) {
          throw new Error('Invoice number was not returned by the server.');
        }
        addToast(`Invoice ${created.invoiceNumber} created as draft.`, 'success');
      }
      onSuccess();
      onClose();
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'Failed to save invoice.';
      addToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">
          {invoiceToEdit ? `${isReadOnly ? 'View' : 'Edit'} Invoice ${invoiceToEdit.invoiceNumber}` : 'Create Invoice'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 flex-grow">
          <div className="grid grid-cols-2 gap-4">
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full p-2 border rounded bg-white dark:bg-slate-800"
              required
              disabled={isReadOnly}
            >
              <option value="">Select Client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full p-2 border rounded bg-white dark:bg-slate-800"
              required
              disabled={isReadOnly}
            >
              <option value="">Select Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <div>
              <label className="text-xs">Issued Date</label>
              <input
                type="date"
                value={issuedAt}
                onChange={e => setIssuedAt(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="text-xs">Due Date</label>
              <input
                type="date"
                value={dueAt}
                onChange={e => setDueAt(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={isReadOnly}
              />
            </div>
          </div>
          <div className="border-t pt-2">
            <h4 className="font-semibold">Line Items</h4>
            <div className="grid grid-cols-[1fr,90px,130px,130px,40px] gap-2 items-center mt-1 text-xs text-muted-foreground">
              <span>Description</span>
              <span className="text-right">Quantity</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Amount</span>
            </div>
            {lineItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[1fr,90px,130px,130px,40px] gap-2 items-center mt-2">
                <input
                  type="text"
                  value={item.description}
                  onChange={e => handleLineItemChange(index, 'description', e.target.value)}
                  placeholder="Item or service description"
                  className="p-1 border rounded"
                  disabled={isReadOnly}
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={e => handleLineItemChange(index, 'quantity', parseNumberInputValue(e.target.value))}
                  placeholder="1"
                  className="p-1 border rounded text-right"
                  disabled={isReadOnly}
                />
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={e => handleLineItemChange(index, 'unitPrice', parseNumberInputValue(e.target.value))}
                  placeholder="0.00"
                  className="p-1 border rounded text-right"
                  disabled={isReadOnly}
                />
                <span className="p-1 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</span>
                {!isReadOnly && (
                  <Button type="button" variant="danger" size="sm" onClick={() => removeLineItem(index)}>
                    &times;
                  </Button>
                )}
              </div>
            ))}
            {!isReadOnly && (
              <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={addLineItem}>
                + Add Item
              </Button>
            )}
          </div>
          <div className="border-t pt-4 grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold mb-2">Notes</h4>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Payment details, terms and conditions..."
                rows={6}
                className="p-2 border rounded w-full"
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold mb-2">Totals</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <label htmlFor="taxRate" className="text-sm">
                  Tax (%):
                </label>
                <input
                  id="taxRate"
                  type="number"
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-24 p-1 border rounded text-right"
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tax Amount:</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <label htmlFor="retentionRate" className="text-sm">
                  Retention (%):
                </label>
                <input
                  id="retentionRate"
                  type="number"
                  value={retentionRate}
                  onChange={e => setRetentionRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-24 p-1 border rounded text-right"
                  disabled={isReadOnly}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-600">Retention Held:</span>
                <span className="text-red-600 font-medium">-{formatCurrency(retentionAmount)}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-lg pt-2 border-t">
                <span>Total Due:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {invoiceToEdit && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span>Amount Paid:</span>
                    <span>-{formatCurrency(amountPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-lg text-green-600">
                    <span>Balance:</span>
                    <span>{formatCurrency(balance)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </form>
        <div className="flex justify-end gap-2 pt-4 border-t mt-4 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!isReadOnly && (
            <Button type="submit" isLoading={isSaving} onClick={handleSubmit}>
              Save Invoice
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

const PaymentModal: React.FC<{
  invoice: Invoice;
  balance: number;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ invoice, balance, onClose, onSuccess, user, addToast }) => {
  const [amount, setAmount] = useState<number | ''>(balance > 0 ? balance : '');
  const [method, setMethod] = useState<'CREDIT_CARD' | 'BANK_TRANSFER' | 'CASH'>('BANK_TRANSFER');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    const numericAmount = Number(amount);
    if (amount === '' || numericAmount <= 0) {
      addToast('Invalid amount', 'error');
      return;
    }
    if (numericAmount > balance) {
      addToast('Amount exceeds the outstanding balance', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await api.recordPaymentForInvoice(invoice.id, { amount: numericAmount, method }, user.id);
      addToast('Payment recorded.', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      addToast('Failed to record payment.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Record Payment for {invoice.invoiceNumber}</h3>
        <p className="text-sm text-muted-foreground mb-4">Current balance: {formatCurrency(balance)}</p>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={`Enter amount (up to ${balance.toFixed(2)})`}
          className="w-full p-2 border rounded mt-4"
          max={balance}
        />
        <select
          value={method}
          onChange={e => setMethod(e.target.value as typeof method)}
          className="w-full p-2 border rounded mt-2 bg-white"
        >
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CREDIT_CARD">Card</option>
          <option value="CASH">Cash</option>
        </select>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSaving}>
            Record Payment
          </Button>
        </div>
      </Card>
    </div>
  );
};

const BarChart: React.FC<{ data: { label: string; value: number }[]; barColor: string }> = ({ data, barColor }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  return (
    <div className="w-full h-64 flex items-end justify-around p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
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
