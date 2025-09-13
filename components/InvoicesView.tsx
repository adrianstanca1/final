// full contents of components/InvoicesView.tsx

import React from 'react';
import { Invoice, InvoiceStatus } from '../types';
import { Card } from './ui/Card';
import { InvoiceStatusBadge } from './ui/StatusBadge';

interface InvoicesViewProps {
  invoices: Invoice[];
  // FIX: Changed id type to `number | string` to match Project and Invoice types.
  findProjectName: (id: number | string) => string;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

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
                        {invoices.map(invoice => (
                            <tr key={invoice.id}>
                                <td className="px-6 py-4 font-medium">{invoice.invoiceNumber}</td>
                                <td className="px-6 py-4">{findProjectName(invoice.projectId)}</td>
                                <td className="px-6 py-4">{new Date(invoice.dueAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right font-semibold">{formatCurrency(invoice.total - invoice.amountPaid)}</td>
                                <td className="px-6 py-4"><InvoiceStatusBadge status={invoice.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};
