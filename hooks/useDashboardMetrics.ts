import { useMemo } from 'react';
import { 
  Project, 
  Todo, 
  User, 
  SafetyIncident, 
  Expense, 
  OperationalInsights,
  ProjectPortfolioSummary,
  IncidentStatus,
  ExpenseStatus,
  TodoStatus
} from '../types';
import { computeProjectPortfolioSummary } from '../utils/projectPortfolio';
import { format, eachDayOfInterval, isWithinInterval } from 'date-fns';

// FIX: Local implementation of startOfWeek to resolve module export error.
const startOfWeek = (date: Date, options?: { weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 }): Date => {
  const weekStartsOn = options?.weekStartsOn ?? 0;
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day < weekStartsOn ? day + 7 : day) - weekStartsOn;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const clampPercentage = (value: number): number => Math.max(0, Math.min(100, value));

interface DashboardMetricsInput {
  projects: Project[];
  tasks: Todo[];
  team: User[];
  incidents: SafetyIncident[];
  expenses: Expense[];
  operationalInsights: OperationalInsights | null;
}

export const useDashboardMetrics = ({
  projects,
  tasks,
  team,
  incidents,
  expenses,
  operationalInsights
}: DashboardMetricsInput) => {
  const portfolioSummary: ProjectPortfolioSummary = useMemo(
    () => computeProjectPortfolioSummary(projects),
    [projects]
  );

  const activeProjects = useMemo(() => projects.filter(p => p.status === 'ACTIVE'), [projects]);

  const atRiskProjects = useMemo(() => {
    return activeProjects
      .map(project => {
        const budget = project.budget ?? 0;
        const actual = project.actualCost ?? project.spent ?? 0;
        const progress = project.progress ?? 0;
        const overdue = portfolioSummary.upcomingDeadlines.some(deadline => 
          deadline.id === project.id && deadline.isOverdue);
        const score =
          (budget > 0 ? actual / budget : 1) +
          (project.status === 'ON_HOLD' ? 1 : 0) +
          (progress < 50 ? 0.5 : 0) +
          (overdue ? 0.75 : 0);
        return { project, budget, actual, progress, overdue, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [activeProjects, portfolioSummary.upcomingDeadlines]);

  const openIncidents = useMemo(
    () => incidents.filter(incident => incident.status !== IncidentStatus.RESOLVED),
    [incidents]
  );

  const highSeverityIncidents = useMemo(
    () => openIncidents.filter(incident => incident.severity === 'HIGH' || incident.severity === 'CRITICAL'),
    [openIncidents]
  );

  const approvedExpenses = useMemo(
    () => expenses.filter(expense => expense.status === ExpenseStatus.APPROVED || expense.status === ExpenseStatus.PAID),
    [expenses]
  );

  const approvedExpenseTotal = useMemo(
    () => approvedExpenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0),
    [approvedExpenses]
  );

  const weeklyTaskData = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekInterval = { start: weekStart, end: now };
    const daysOfWeek = eachDayOfInterval(weekInterval);

    return daysOfWeek.map(day => ({
      label: format(day, 'E'),
      value: tasks.filter(t => t.completedAt && 
        isWithinInterval(new Date(t.completedAt), { 
          start: day, 
          end: new Date(day.getTime()).setHours(23, 59, 59, 999) 
        })).length
    }));
  }, [tasks]);

  const availabilityBreakdown = useMemo(() => {
    return team.reduce<Record<string, number>>((acc, member) => {
      const key = member.availability ?? 'Unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [team]);

  const tasksInProgress = useMemo(
    () => tasks.filter(task => task.status !== TodoStatus.DONE).length,
    [tasks]
  );

  const operationalMetrics = useMemo(() => {
    const insight = operationalInsights;
    return {
      complianceRate: clampPercentage(insight?.workforce.complianceRate ?? 0),
      openIncidentsCount: insight?.safety.openIncidents ?? openIncidents.length,
      highSeverityCount: insight?.safety.highSeverity ?? highSeverityIncidents.length,
      pendingApprovals: insight?.workforce.pendingApprovals ?? 0,
      approvedExpenseThisMonth: insight?.financial.approvedExpensesThisMonth ?? approvedExpenseTotal,
      burnPerProject: insight?.financial.burnRatePerActiveProject ?? 0,
      overtimeHours: insight?.workforce.overtimeHours ?? 0,
      averageHours: insight?.workforce.averageHours ?? 0,
      tasksDueSoon: insight?.schedule.tasksDueSoon ?? 0,
      overdueTasks: insight?.schedule.overdueTasks ?? 0,
      scheduleInProgress: insight?.schedule.tasksInProgress ?? tasksInProgress,
      operationalAlerts: insight?.alerts ?? [],
      operationalCurrency: insight?.financial.currency ?? 'GBP'
    };
  }, [operationalInsights, openIncidents.length, highSeverityIncidents.length, approvedExpenseTotal, tasksInProgress]);

  const kpiData = useMemo(() => ({
    activeProjectsCount: activeProjects.length,
    atRisk: atRiskProjects.length,
    openIncidents: operationalMetrics.openIncidentsCount,
    budgetUtilization: Math.round((operationalMetrics.approvedExpenseThisMonth / Math.max(1000000, 1)) * 100),
    teamSize: team.length
  }), [activeProjects.length, atRiskProjects.length, operationalMetrics.openIncidentsCount, operationalMetrics.approvedExpenseThisMonth, team.length]);

  return {
    portfolioSummary,
    activeProjects,
    atRiskProjects,
    openIncidents,
    highSeverityIncidents,
    approvedExpenses,
    approvedExpenseTotal,
    weeklyTaskData,
    availabilityBreakdown,
    tasksInProgress,
    operationalMetrics,
    kpiData
  };
};