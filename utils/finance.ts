import { Invoice, InvoiceStatus } from '../types';

export interface InvoiceFinancials {
  subtotal: number;
  taxAmount: number;
  retentionAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  payments: Invoice['payments'];
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const parseDateValue = (value?: string): number | null => {
  if (!value) return null;
  const parsed = new Date(value);
  const timestamp = parsed.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const getDueDateValue = (invoice: Invoice): number | null =>
  parseDateValue(invoice.dueAt || invoice.dueDate);

export const getInvoiceFinancials = (invoice: Invoice): InvoiceFinancials => {
  const lineItems = invoice.lineItems || [];

  const subtotal = lineItems.reduce((acc, item) => {
    const quantity = toNumber(item.quantity);
    const rate = toNumber(item.unitPrice ?? item.rate);
    return acc + quantity * rate;
  }, 0);

  const taxRate = toNumber(invoice.taxRate);
  const retentionRate = toNumber(invoice.retentionRate);

  const taxAmount = subtotal * taxRate;
  const retentionAmount = subtotal * retentionRate;
  const total = subtotal + taxAmount - retentionAmount;

  const payments = invoice.payments || [];
  const paidFromPayments = payments.reduce((acc, payment) => acc + toNumber(payment.amount), 0);
  const recordedPaidAmount = toNumber(invoice.amountPaid);
  const amountPaid = Math.max(recordedPaidAmount, paidFromPayments);
  const balance = Math.max(0, total - amountPaid);

  return { subtotal, taxAmount, retentionAmount, total, amountPaid, balance, payments };
};

export const getDerivedStatus = (invoice: Invoice, now: number = Date.now()): InvoiceStatus => {
  const { balance } = getInvoiceFinancials(invoice);

  if (invoice.status === InvoiceStatus.CANCELLED) return InvoiceStatus.CANCELLED;
  if (invoice.status === InvoiceStatus.DRAFT) return InvoiceStatus.DRAFT;
  if (balance <= 0) return InvoiceStatus.PAID;

  const dueValue = getDueDateValue(invoice);

  if (
    (invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OVERDUE) &&
    dueValue !== null &&
    dueValue < now
  ) {
    return InvoiceStatus.OVERDUE;
  }

  return invoice.status;
};
