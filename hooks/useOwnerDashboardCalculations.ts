import { useMemo } from 'react';
import { 
  Project, 
  Invoice, 
  Expense, 
  SafetyIncident, 
  Timesheet,
  ProjectPortfolioSummary,
  InvoiceStatus,
  ExpenseStatus,
  IncidentStatus,
  IncidentSeverity,
  TimesheetStatus
} from '../types';
import { 
  computeProjectPortfolioSummary
} from '../utils/projectPortfolio';
import { 
  getInvoiceFinancials,
  getDerivedStatus
} from '../utils/finance';

const clampPercentage = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

interface OwnerDashboardData {
  projects: Project[];
  invoices: Invoice[];
  expenses: Expense[];
  incidents: SafetyIncident[];
  timesheets: Timesheet[];
  monthly: Array<{ month: string; revenue: number; profit: number; }>;
}

export const usePortfolioCalculations = (data: OwnerDashboardData) => {
  const portfolioSummary: ProjectPortfolioSummary = useMemo(
    () => computeProjectPortfolioSummary(data.projects),
    [data.projects]
  );

  const atRiskProjects = useMemo(() => {
    return data.projects
      .map((project) => {
        const budget = project.budget ?? 0;
        const actual = project.actualCost ?? project.spent ?? 0;
        const progress = project.progress ?? 0;
        const isOverBudget = budget > 0 ? actual / budget > 1.05 : false;
        const riskScore =
          (isOverBudget ? 1.2 : 1) *
          (project.status === 'ON_HOLD' ? 1.3 : 1) *
          (project.status === 'CANCELLED' ? 0 : 1) *
          (progress < 40 ? 1.2 : 1) *
          (portfolioSummary.upcomingDeadlines.some((d) => d.id === project.id && d.isOverdue) ? 1.3 : 1);
        return { project, budget, actual, progress, riskScore };
      })
      .filter((entry) => entry.project.status !== 'COMPLETED' && entry.project.status !== 'CANCELLED')
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 4);
  }, [data.projects, portfolioSummary.upcomingDeadlines]);

  return {
    portfolioSummary,
    atRiskProjects
  };
};

export const useFinancialCalculations = (invoices: Invoice[], expenses: Expense[]) => {
  const { outstandingReceivables, overdueReceivables, invoicePipeline } = useMemo(() => {
    return invoices.reduce(
      (acc, invoice) => {
        const { balance, total } = getInvoiceFinancials(invoice);
        acc.outstandingReceivables += balance;
        acc.invoicePipeline += total;
        const derivedStatus = getDerivedStatus(invoice);
        if (derivedStatus === InvoiceStatus.OVERDUE) acc.overdueReceivables += balance;
        return acc;
      },
      { outstandingReceivables: 0, overdueReceivables: 0, invoicePipeline: 0 }
    );
  }, [invoices]);

  const approvedExpenses = useMemo(
    () => expenses.filter((expense) => expense.status === 'APPROVED' || expense.status === 'PAID'),
    [expenses]
  );

  const approvedExpenseTotal = useMemo(
    () => approvedExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
    [approvedExpenses]
  );

  const fallbackApprovedExpenseTotal = useMemo(
    () =>
      expenses
        .filter((expense) => expense.status === 'APPROVED' || expense.status === 'PAID')
        .reduce((sum, expense) => sum + (expense.amount || 0), 0),
    [expenses]
  );

  return {
    outstandingReceivables,
    overdueReceivables,
    invoicePipeline,
    approvedExpenses,
    approvedExpenseTotal,
    fallbackApprovedExpenseTotal
  };
};

export const useSafetyCalculations = (incidents: SafetyIncident[]) => {
  const openIncidents = useMemo(
    () => incidents.filter((incident) => incident.status !== IncidentStatus.RESOLVED),
    [incidents]
  );

  const fallbackHighSeverityIncidents = useMemo(
    () => openIncidents.filter((i) => i.severity === IncidentSeverity.HIGH || i.severity === IncidentSeverity.CRITICAL),
    [openIncidents]
  );

  return {
    openIncidents,
    fallbackHighSeverityIncidents
  };
};

export const useWorkforceCalculations = (timesheets: Timesheet[]) => {
  const complianceRate = useMemo(() => {
    const submitted = timesheets.filter((ts) => ts.status !== TimesheetStatus.DRAFT);
    if (!submitted.length) return 0;
    const approved = submitted.filter((ts) => ts.status === TimesheetStatus.APPROVED).length;
    return clampPercentage((approved / submitted.length) * 100);
  }, [timesheets]);

  return {
    complianceRate
  };
};

export const useChartCalculations = (monthly: Array<{ month: string; revenue: number; profit: number; }>) => {
  const revenueTrend = useMemo(
    () => monthly.slice(-6).map((entry) => ({ label: entry.month, value: entry.revenue })),
    [monthly]
  );

  const profitTrend = useMemo(
    () => monthly.slice(-6).map((entry) => ({ label: entry.month, value: entry.profit })),
    [monthly]
  );

  return {
    revenueTrend,
    profitTrend
  };
};