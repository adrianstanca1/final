import { Expense, FinancialMetrics, Invoice, InvoiceStatus, SafetyIncident, SafetyMetrics, IncidentStatus, IncidentSeverity } from '../types.js';

/**
 * Calculate safety metrics from safety incident data
 * 
 * @param incidents - Array of safety incidents to analyze
 * @param dateRanges - Optional date ranges for filtering
 * @returns Calculated safety metrics
 */
export const getSafetyMetrics = (
  incidents: SafetyIncident[], 
  dateRanges?: { start: string, end: string }
): SafetyMetrics => {
  const filteredIncidents = dateRanges 
    ? incidents.filter(i => {
        const date = new Date(i.incidentDate);
        return date >= new Date(dateRanges.start) && date <= new Date(dateRanges.end);
      })
    : incidents;
    
  const incidentCount = filteredIncidents.length;
  
  // Calculate severity breakdown
  const severityBreakdown = {
    [IncidentSeverity.LOW]: 0,
    [IncidentSeverity.MEDIUM]: 0,
    [IncidentSeverity.HIGH]: 0,
    [IncidentSeverity.CRITICAL]: 0
  };
  
  filteredIncidents.forEach(incident => {
    if (incident.severity) {
      severityBreakdown[incident.severity]++;
    }
  });
  
  // Calculate resolution rate
  const resolvedIncidents = filteredIncidents.filter(i => i.status === IncidentStatus.RESOLVED);
  const resolutionRate = incidentCount ? resolvedIncidents.length / incidentCount : 0;
  
  // Calculate average resolution time
  const resolutionTimes = resolvedIncidents
    .filter(i => i.resolvedAt && i.incidentDate)
    .map(i => {
      const resolved = new Date(i.resolvedAt!);
      const reported = new Date(i.incidentDate);
      return resolved.getTime() - reported.getTime();
    });
  
  const averageResolutionTime = resolutionTimes.length 
    ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length / (1000 * 60 * 60 * 24) // in days
    : 0;
  
  // Determine trend (simple implementation)
  let incidentTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (dateRanges) {
    const midPoint = new Date((new Date(dateRanges.start).getTime() + new Date(dateRanges.end).getTime()) / 2);
    const firstHalf = filteredIncidents.filter(i => new Date(i.incidentDate) < midPoint).length;
    const secondHalf = filteredIncidents.filter(i => new Date(i.incidentDate) >= midPoint).length;
    
    if (secondHalf > firstHalf * 1.1) incidentTrend = 'increasing';
    else if (secondHalf < firstHalf * 0.9) incidentTrend = 'decreasing';
  }
  
  return {
    incidentCount,
    severityBreakdown,
    resolutionRate,
    averageResolutionTime,
    incidentTrend,
    // Additional properties expected by mockApi.ts
    openIncidents: filteredIncidents.filter(i => i.status !== IncidentStatus.RESOLVED),
    highSeverity: filteredIncidents.filter(i => i.severity === IncidentSeverity.HIGH || i.severity === IncidentSeverity.CRITICAL).length,
    daysSinceLastIncident: filteredIncidents.length > 0 ? 
      Math.floor((Date.now() - Math.max(...filteredIncidents.map(i => new Date(i.incidentDate || i.reportedAt).getTime()))) / (1000 * 60 * 60 * 24)) 
      : null
  };
};

/**
 * Calculate financial metrics from expenses and invoices
 * 
 * @param expenses - Array of expenses to analyze
 * @param invoices - Array of invoices to analyze
 * @param dateRanges - Optional date ranges for filtering
 * @returns Calculated financial metrics
 */
export const getFinancialMetrics = (
  expenses: Expense[],
  invoices: Invoice[],
  dateRanges?: { start: string, end: string }
): FinancialMetrics => {
  const filterByDate = <T extends { date?: string, issueDate?: string }>(items: T[]): T[] => {
    if (!dateRanges) return items;
    
    return items.filter(item => {
      const dateStr = item.date || item.issueDate;
      if (!dateStr) return false;
      
      const date = new Date(dateStr);
      return date >= new Date(dateRanges.start) && date <= new Date(dateRanges.end);
    });
  };
  
  const filteredExpenses = filterByDate(expenses);
  const filteredInvoices = filterByDate(invoices);
  
  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const totalRevenue = filteredInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
  const profit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? profit / totalRevenue : 0;
  
  // Outstanding and overdue invoices
  const outstandingInvoices = filteredInvoices
    .filter(i => i.status !== InvoiceStatus.PAID && i.status !== InvoiceStatus.CANCELLED)
    .reduce((sum, invoice) => sum + (invoice.balance || 0), 0);
    
  const overdueInvoices = filteredInvoices
    .filter(i => i.status === InvoiceStatus.OVERDUE)
    .reduce((sum, invoice) => sum + (invoice.balance || 0), 0);
  
  // Payment time calculation
  const paidInvoices = filteredInvoices.filter(i => 
    i.status === InvoiceStatus.PAID && 
    i.issueDate && 
    i.amountPaid && 
    i.amountPaid > 0
  );
  
  let averagePaymentTime = 0;
  if (paidInvoices.length > 0) {
    const paymentTimes = paidInvoices.map(invoice => {
      const issueDate = new Date(invoice.issueDate!);
      // Assuming the last payment date is when the invoice was fully paid
      const paymentDate = invoice.payments && invoice.payments.length > 0
        ? new Date(invoice.payments[invoice.payments.length - 1].date)
        : new Date(); // Fallback
        
      return (paymentDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24); // in days
    });
    
    averagePaymentTime = paymentTimes.reduce((sum, time) => sum + time, 0) / paymentTimes.length;
  }
  
  return {
    totalExpenses,
    totalRevenue,
    profit,
    margin,
    outstandingInvoices,
    overdueInvoices,
    averagePaymentTime,
    // Additional properties expected by mockApi.ts
    approvedExpensesThisMonth: expenses.filter(e => e.status === 'approved' || e.status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0),
    outstandingReceivables: invoices.filter(inv => (inv as any).status !== 'paid').reduce((sum, inv) => sum + ((inv as any).amount || 0), 0)
  };
};