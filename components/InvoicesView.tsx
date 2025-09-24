import React, { useState, useEffect } from 'react';
import { User, Invoice, Project, View } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../services/mockApi';

interface InvoicesViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  setActiveView: (view: View) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ user, addToast, setActiveView }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [invoicesResult, projectsResult] = await Promise.all([
          api.getInvoices(),
          api.getProjects()
        ]);
        setInvoices(invoicesResult);
        setProjects(projectsResult);
      } catch (error) {
        addToast('Failed to load invoice data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [addToast]);

  if (loading) return <Card>Loading invoices...</Card>;

  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <Button>Create Invoice</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Pending</h3>
            <p className="text-3xl font-bold text-orange-600">{pendingInvoices.length}</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Paid</h3>
            <p className="text-3xl font-bold text-green-600">{paidInvoices.length}</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Total Amount</h3>
            <p className="text-3xl font-bold text-blue-600">${totalAmount.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Invoices</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Invoice #</th>
                  <th className="text-left py-2">Project</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Due Date</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 10).map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="py-3">#{invoice.number}</td>
                    <td className="py-3">
                      {projects.find(p => p.id === invoice.projectId)?.name || 'Unknown Project'}
                    </td>
                    <td className="py-3">${invoice.amount.toLocaleString()}</td>
                    <td className="py-3">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span 
                        className={`px-2 py-1 rounded text-xs ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 
                          invoice.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <Button variant="secondary" size="sm">View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};
