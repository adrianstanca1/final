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
    ExpenseStatus,
    InvoiceStatus,
    InvoiceLineItem,
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
import { formatCurrency } from '../utils/finance';

type FinancialsTab = 'dashboard' | 'invoices' | 'expenses' | 'clients';

const BarChart: React.FC<{ 
  data: { label: string; value: number }[];
  barColor: string;
}> = ({ data, barColor }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  
  return (
    <div className="w-full h-64 flex items-end justify-around p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
      {data.map((item, index) => (
        <div key={index} className="flex flex-col items-center justify-end h-full w-full">
          <div
            className={`w-3/4 rounded-t-md ${barColor} transition-all duration-300`}
            data-height={maxValue > 0 ? (item.value / maxValue) * 100 : 0}
            title={formatCurrency(item.value)}
          />
          <span className="text-xs mt-2 text-slate-600 text-center">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

interface FinancialsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const FinancialsView: React.FC<FinancialsViewProps> = ({ user, addToast }) => {
  const [activeTab, setActiveTab] = useState<FinancialsTab>('dashboard');
  const [loading, setLoading] = useState(true);

  const getExpenseStatusColor = (status: ExpenseStatus): string => {
    if (status === ExpenseStatus.APPROVED) return 'green';
    if (status === ExpenseStatus.REJECTED) return 'red';
    return 'yellow';
  };
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
        forecastsData,
      ] = await Promise.all([
        api.getFinancialKPIs({ signal: controller.signal }),
        api.getUsers({ signal: controller.signal }).then(() => [] as MonthlyFinancials[]), // Mock
        api.getUsers({ signal: controller.signal }).then(() => [] as CostBreakdown[]), // Mock  
        api.getInvoices({ signal: controller.signal }),
        api.getUsers({ signal: controller.signal }).then(() => [] as Quote[]), // Mock
        api.getExpenses({ signal: controller.signal }),
        api.getClients({ signal: controller.signal }),
        api.getProjects({ signal: controller.signal }),
        api.getUsers({ signal: controller.signal }),
        api.getUsers({ signal: controller.signal }).then(() => [] as FinancialForecast[]), // Mock
      ]);

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
        forecasts: forecastsData,
      });
    } catch (error) {
      console.error('Error fetching financial data:', error);
      addToast('Failed to load financial data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user.companyId, addToast]);

  useEffect(() => {
    fetchData();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  const { projectMap, clientMap, userMap } = useMemo(
    () => ({
      projectMap: new Map(data.projects.map(p => [p.id, p.name])),
      clientMap: new Map(data.clients.map(c => [c.id, c.name])),
      userMap: new Map(data.users.map(u => [u.id, u.name])),
    }),
    [data.projects, data.clients, data.users],
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
        
        await api.updateInvoice(invoiceId, { ...invoice, status });
        addToast(`Invoice status updated to ${status.toLowerCase()}.`, 'success');
        fetchData();
      } catch (error) {
        console.error('Error updating invoice status:', error);
        addToast('Failed to update invoice status.', 'error');
      }
    },
    [data.invoices, addToast, fetchData],
  );

  const generateForecast = useCallback(
    async (horizonMonths: number) => {
      if (!user.companyId) return;
      
      setIsGeneratingForecast(true);
      setForecastError(null);
      
      try {
        await generateFinancialForecast({
          companyName: 'Construction Company',
          horizonMonths,
          kpis: data.kpis,
          monthly: data.monthly,
          costs: data.costs,
          invoices: data.invoices,
          expenses: data.expenses,
        });
        
        addToast('Financial forecast generated successfully', 'success');
        fetchData();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate forecast';
        setForecastError(errorMessage);
        addToast('Failed to generate financial forecast', 'error');
      } finally {
        setIsGeneratingForecast(false);
      }
    },
    [user.companyId, data.invoices, data.expenses, data.projects, addToast, fetchData],
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPIs */}
      {data.kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(data.kpis.totalRevenue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">£</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Expenses</p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(data.kpis.totalExpenses)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold">-£</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Net Profit</p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(data.kpis.netProfit)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">%</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Profit Margin</p>
                <p className="text-2xl font-bold text-slate-800">
                  {data.kpis.profitMargin.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">📈</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Monthly Revenue</h3>
          <BarChart
            data={data.monthly.map(m => ({
              label: new Date(2024, m.month - 1).toLocaleDateString('en-US', { month: 'short' }),
              value: m.revenue,
            }))}
            barColor="bg-green-500"
          />
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Cost Breakdown</h3>
          <BarChart
            data={data.costs.map(c => ({
              label: c.category,
              value: c.amount,
            }))}
            barColor="bg-blue-500"
          />
        </Card>
      </div>

      {/* Forecast */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Financial Forecast</h3>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => generateForecast(3)}
              isLoading={isGeneratingForecast}
            >
              3 Month Forecast
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => generateForecast(6)}
              isLoading={isGeneratingForecast}
            >
              6 Month Forecast
            </Button>
          </div>
        </div>

        {forecastError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-800 text-sm">{forecastError}</p>
          </div>
        )}

        {data.forecasts.length > 0 && (
          <BarChart
            data={data.forecasts.map(f => ({
              label: new Date(f.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              value: f.projectedRevenue,
            }))}
            barColor="bg-purple-500"
          />
        )}
      </Card>
    </div>
  );

  const renderInvoices = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Invoices</h3>
          {canManageFinances && (
            <Button onClick={() => { setSelectedItem(null); setModal('invoice'); }}>
              Create Invoice
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Number
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Client
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Project
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                  Total
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                  Balance Due
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {data.invoices.map(invoice => {
                const { total, balance } = getInvoiceFinancials(invoice);
                const derivedStatus = getDerivedStatus(invoice, balance);

                return (
                  <tr key={invoice.id} className="hover:bg-accent">
                    <td className="px-4 py-3 font-medium">
                      {invoice.invoiceNumber || 'Draft'}
                    </td>
                    <td className="px-4 py-3">
                      {clientMap.get(invoice.clientId) || 'Unknown Client'}
                    </td>
                    <td className="px-4 py-3">
                      {projectMap.get(invoice.projectId) || 'Unknown Project'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(total)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(balance)}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={derivedStatus} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {canManageFinances && invoice.status === InvoiceStatus.DRAFT && (
                        <>
                          <Button 
                            size="sm" 
                            variant="success"
                            onClick={() => handleUpdateInvoiceStatus(invoice.id, InvoiceStatus.SENT)}
                          >
                            Send
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => { setSelectedItem(invoice); setModal('invoice'); }}
                          >
                            Edit
                          </Button>
                        </>
                      )}
                      {canManageFinances && (
                        invoice.status === InvoiceStatus.SENT || 
                        derivedStatus === InvoiceStatus.OVERDUE
                      ) && (
                        <>
                          <Button 
                            size="sm"
                            onClick={() => { setSelectedItem(invoice); setModal('payment'); }}
                          >
                            Record Payment
                          </Button>
                          <Button 
                            size="sm" 
                            variant="danger"
                            onClick={() => handleUpdateInvoiceStatus(invoice.id, InvoiceStatus.CANCELLED)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {(
                        invoice.status === InvoiceStatus.PAID || 
                        invoice.status === InvoiceStatus.CANCELLED
                      ) && (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => { setSelectedItem(invoice); setModal('invoice'); }}
                        >
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

      {/* Quotes Section */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Quotes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Client
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Project
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {data.quotes.map(quote => (
                <tr key={quote.id} className="hover:bg-accent">
                  <td className="px-4 py-3">
                    {clientMap.get(quote.clientId) || 'Unknown Client'}
                  </td>
                  <td className="px-4 py-3">
                    {projectMap.get(quote.projectId) || 'Unknown Project'}
                  </td>
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
  );

  const renderExpenses = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Expenses</h3>
          {canManageFinances && (
            <Button onClick={() => { setSelectedItem(null); setModal('expense'); }}>
              Add Expense
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Category
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  User
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Project
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {data.expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-accent">
                  <td className="px-4 py-3">
                    {new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{expense.description}</td>
                  <td className="px-4 py-3">{expense.category}</td>
                  <td className="px-4 py-3">
                    {userMap.get(expense.userId) || 'Unknown User'}
                  </td>
                  <td className="px-4 py-3">
                    {projectMap.get(expense.projectId) || 'No Project'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <Tag
                      label={expense.status}
                      color={getExpenseStatusColor(expense.status)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManageFinances && expense.status === ExpenseStatus.PENDING && (
                      <Button 
                        size="sm"
                        onClick={() => { setSelectedItem(expense); setModal('expense'); }}
                      >
                        Review
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderClients = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Clients</h3>
          {canManageFinances && (
            <Button onClick={() => { setSelectedItem(null); setModal('client'); }}>
              Add Client
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.clients.map(client => (
            <Card key={client.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{client.name}</h4>
                  <p className="text-sm text-slate-600">{client.email}</p>
                  <p className="text-sm text-slate-600">{client.phone}</p>
                </div>
                {canManageFinances && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { setSelectedItem(client); setModal('client'); }}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'invoices', label: 'Invoices' },
          { key: 'expenses', label: 'Expenses' },
          { key: 'clients', label: 'Clients' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as FinancialsTab)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'invoices' && renderInvoices()}
      {activeTab === 'expenses' && renderExpenses()}
      {activeTab === 'clients' && renderClients()}

      {/* Modals */}
      {modal === 'client' && (
        <ClientModal
          client={selectedItem as Client}
          onClose={() => { setModal(null); setSelectedItem(null); }}
          onSuccess={() => {
            fetchData();
            setModal(null);
            setSelectedItem(null);
          }}
          addToast={addToast}
        />
      )}

      {modal === 'invoice' && (
        <InvoiceModal
          invoice={selectedItem as Invoice}
          clients={data.clients}
          projects={data.projects}
          onClose={() => { setModal(null); setSelectedItem(null); }}
          onSuccess={() => {
            fetchData();
            setModal(null);
            setSelectedItem(null);
          }}
          addToast={addToast}
          user={user}
        />
      )}

      {modal === 'payment' && selectedItem && (
        <PaymentModal
          invoice={selectedItem as Invoice}
          onClose={() => { setModal(null); setSelectedItem(null); }}
          onSuccess={() => {
            fetchData();
            setModal(null);
            setSelectedItem(null);
          }}
          addToast={addToast}
          user={user}
        />
      )}

      {modal === 'expense' && (
        <ExpenseModal
          expense={selectedItem as Expense}
          projects={data.projects}
          onClose={() => { setModal(null); setSelectedItem(null); }}
          onSuccess={() => {
            fetchData();
            setModal(null);
            setSelectedItem(null);
          }}
          addToast={addToast}
          user={user}
        />
      )}
    </div>
  );
};