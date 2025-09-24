import React, { useState, useEffect } from 'react';
import { User, Invoice, Expense } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../services/mockApi';
import { formatCurrency } from '../utils/finance';

interface FinancialsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const FinancialsView: React.FC<FinancialsViewProps> = ({ user, addToast }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [invoicesResult, expensesResult] = await Promise.all([
          api.getInvoices(),
          api.getExpenses()
        ]);
        setInvoices(invoicesResult);
        setExpenses(expensesResult);
      } catch (error) {
        addToast('Failed to load financial data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [addToast]);

  if (loading) return <Card>Loading financials...</Card>;

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
        <Button>Create Invoice</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(totalRevenue, 'USD')}
            </p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Total Expenses</h3>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(totalExpenses, 'USD')}
            </p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Net Profit</h3>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(totalRevenue - totalExpenses, 'USD')}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Invoices</h3>
            <div className="space-y-3">
              {invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Invoice #{invoice.number}</h4>
                    <p className="text-sm text-gray-500">{invoice.status}</p>
                  </div>
                  <p className="font-medium">{formatCurrency(invoice.amount || 0, 'USD')}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Expenses</h3>
            <div className="space-y-3">
              {expenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{expense.description}</h4>
                    <p className="text-sm text-gray-500">{expense.category}</p>
                  </div>
                  <p className="font-medium">{formatCurrency(expense.amount || 0, 'USD')}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
