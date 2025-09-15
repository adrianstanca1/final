// full contents of components/InvoicesView.tsx

import React from 'react';
import { Invoice, InvoiceStatus, InvoiceLineItem, InvoicePayment } from '../types';
import { Card } from './ui/Card';
import { InvoiceStatusBadge } from './ui/StatusBadge';

interface InvoicesViewProps {
  invoices: Invoice[];
  // FIX: Changed id type to `number | string` to match Project and Invoice types.
  findProjectName: (id: string) => string;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

// FIX: Added a helper function to calculate invoice totals dynamically.
const getInvoiceTotals = (invoice: Invoice) => {
    const subtotal = (invoice.lineItems || []).reduce((acc: number, item: InvoiceLineItem) => acc + (item.quantity || 0) * (item.unitPrice || item.rate || 0), 0);
    const taxAmount = subtotal * (invoice.taxRate || 0);
    const retentionAmount = subtotal * (invoice.retentionRate || 0);
    const total = subtotal + taxAmount - retentionAmount;
    const amountPaid = (invoice.payments || []).reduce((acc: number, p: InvoicePayment) => acc + p.amount, 0);
    return { total, amountPaid, balance: total - amountPaid };
};


export const InvoicesView: React.FC<InvoicesViewProps> = ({ invoices, findProjectName }) => {
    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Invoices</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Number</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount Due</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {invoices.map(invoice => {
                            // FIX: Used the helper function to calculate the balance.
                            const { balance } = getInvoiceTotals(invoice);
                            return (
                                <tr key={invoice.id}>
                                    <td className="px-6 py-4 font-medium">{invoice.invoiceNumber}</td>
                                    <td className="px-6 py-4">{findProjectName(invoice.projectId)}</td>
                                    <td className="px-6 py-4">{new Date(invoice.dueAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(balance)}</td>
                                    <td className="px-6 py-4"><InvoiceStatusBadge status={invoice.status} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};