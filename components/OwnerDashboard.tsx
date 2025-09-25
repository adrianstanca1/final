// Fixed OwnerDashboard.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  User,
  Project,
  FinancialKPIs,
  MonthlyFinancials,
  CostBreakdown,
  Invoice,
  Expense,
  SafetyIncident,
  Timesheet,
  View,
  FinancialForecast,
  OperationalInsights,
  InvoiceStatus,
} from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Tag } from './ui/Tag';
import './ownerDashboard.css';
import { ViewHeader } from './layout/ViewHeader';
import { getDerivedStatus, getInvoiceFinancials } from '../utils/finance';
import { generateFinancialForecast } from '../services/ai';
import { useOfflineSync } from '../hooks/useOfflineSync';
import {
  usePortfolioCalculations,
  useFinancialCalculations,
  useSafetyCalculations,
  useWorkforceCalculations,
  useChartCalculations
} from '../hooks/useOwnerDashboardCalculations';

interface OwnerDashboardProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onSelectProject: (project: Project) => void;
  setActiveView?: (view: View) => void;
}

interface OwnerDashboardData {
  projects: Project[];
  kpis: FinancialKPIs | null;
  monthly: MonthlyFinancials[];
  costs: CostBreakdown[];
  invoices: Invoice[];
  expenses: Expense[];
  incidents: SafetyIncident[];
  timesheets: Timesheet[];
  forecasts: FinancialForecast[];
  companyName: string | null;
  users: User[];
  operationalInsights: OperationalInsights | null;

}

const formatCurrency = (value: number, currency: string = 'GBP') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);

const clampPercentage = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const renderMarkdownSummary = (summary: string) =>
  summary
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => (
      <p
        key={`${line}-${index}`}
        className="text-sm text-muted-foreground"
        dangerouslySetInnerHTML={{
          __html: line
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
            .replace(/^[-•]\s+/, '• '),
        }}
      />
    ));

const MiniBarChart: React.FC<{
  data: Array<{ label: string; value: number }>;
  accent?: 'primary' | 'emerald' | 'amber';
  emptyLabel: string;
}> = ({ data, accent = 'primary', emptyLabel }) => {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const max = Math.max(...data.map((item) => item.value), 1);
  let color: string;
  if (accent === 'emerald') {
    color = 'bg-emerald-500';
  } else if (accent === 'amber') {
    color = 'bg-amber-500';
  } else {
    color = 'bg-primary';
  }
  return (
    <div className="flex items-end gap-2">
      {data.map((item) => (
        <div className="flex flex-1 flex-col items-center gap-1" key={item.label}>
          <div className="text-xs font-semibold text-muted-foreground">{item.label}</div>
          <div className="flex h-32 w-full items-end overflow-hidden rounded bg-muted/60">
            <div
              className={`${color} chart-bar`}
              style={{
                '--bar-height': `${Math.max(6, (item.value / max) * 100)}%`
              } as React.CSSProperties}
              title={`${item.label}: ${item.value.toLocaleString()}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const CostBreakdownList: React.FC<{ data: CostBreakdown[]; currency: string }> = ({ data, currency }) => {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">No approved costs recorded.</p>;
  }
  const total = data.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 1;
  return (
    <div className="space-y-3">
      {data.map((entry) => {
        const share = Math.round(((entry.amount || 0) / total) * 100);
        return (
          <div className="space-y-1" key={entry.category}>
            <div className="flex items-center justify-between text-sm font-semibold text-foreground">
              <span>{entry.category}</span>
              <span>{formatCurrency(entry.amount || 0, currency)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-muted">
              <div
                className="progress-bar-fill"
                style={{
                  '--progress-width': `${share}%`
                } as React.CSSProperties}
              />
            </div>
            <p className="text-xs text-muted-foreground">{share}% of tracked spend</p>
          </div>
        );
      })}
    </div>
  );
};

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  user,
  addToast,
  onSelectProject,
  setActiveView,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OwnerDashboardData>({
    projects: [],
    kpis: null,
    monthly: [],
    costs: [],
    invoices: [],
    expenses: [],
    incidents: [],
    timesheets: [],
    forecasts: [],
    companyName: null,
    users: [],
    operationalInsights: null,
  });
  const [briefError, setBriefError] = useState<string | null>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [selectedHorizon, setSelectedHorizon] = useState(3);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { isOnline } = useOfflineSync(addToast);

  const currency = data.kpis?.currency ?? 'GBP';

  const fetchData = useCallback(async () => {
    if (!user.companyId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;
    setLoading(true);
    try {
      const [
        projects,
        kpis,
        monthly,
        costs,
        invoices,
        expenses,
        users,
        timesheets,
        forecasts,
        operationalInsights,
        companies,
      ] = await Promise.all([
        api.getProjectsByCompany(user.companyId, { signal: controller.signal }),
        api.getFinancialKPIsForCompany(user.companyId, { signal: controller.signal }),
        api.getMonthlyFinancials(user.companyId, { signal: controller.signal }),
        api.getCostBreakdown(user.companyId, { signal: controller.signal }),
        api.getInvoicesByCompany(user.companyId, { signal: controller.signal }),
        api.getExpensesByCompany(user.companyId, { signal: controller.signal }),
        api.getUsersByCompany(user.companyId, { signal: controller.signal }),
        api.getTimesheetsByCompany(user.companyId, user.id, { signal: controller.signal }),
        api.getFinancialForecasts(user.companyId, { signal: controller.signal }),
        api.getOperationalInsights(user.companyId, { signal: controller.signal }),
        api.getCompanies({ signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;

      const incidents = await api.getSafetyIncidentsByCompany(user.companyId);
      if (controller.signal.aborted) return;

      const companyName = companies.find((company) => company.id === user.companyId)?.name ?? null;

      setData({
        projects,
        kpis,
        monthly,
        costs,
        invoices,
        expenses,
        incidents,
        timesheets,
        forecasts,
        companyName,
        users,
        operationalInsights,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('Failed to load owner dashboard', error);
      addToast('Unable to load the executive dashboard right now.', 'error');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [user.companyId, user.id, addToast]);

  useEffect(() => {
    fetchData();
    return () => abortControllerRef.current?.abort();
  }, [fetchData]);

  const {
    portfolioSummary,
    atRiskProjects
  } = usePortfolioCalculations(data);

  const {
    outstandingReceivables,
    overdueReceivables,
    invoicePipeline,
    approvedExpenseTotal,
    fallbackApprovedExpenseTotal
  } = useFinancialCalculations(data.invoices, data.expenses);

  const {
    openIncidents,
    fallbackHighSeverityIncidents
  } = useSafetyCalculations(data.incidents);

  const {
    complianceRate
  } = useWorkforceCalculations(data.timesheets);

  const {
    revenueTrend,
    profitTrend
  } = useChartCalculations(data.monthly);

  const operationalInsights = data.operationalInsights;
  const financialCurrency = operationalInsights?.financial.currency ?? currency;
  const openIncidentsCount = operationalInsights?.safety.openIncidents ?? openIncidents.length;
  const highSeverityCount = operationalInsights?.safety.highSeverity ?? fallbackHighSeverityIncidents.length;
  const daysSinceLastIncident = operationalInsights?.safety.daysSinceLastIncident ?? null;
  const approvedExpenseRunRate = operationalInsights?.financial.approvedExpensesThisMonth ?? fallbackApprovedExpenseTotal;
  const burnRatePerProject = operationalInsights?.financial.burnRatePerActiveProject ?? null;
  const crewOnShift = operationalInsights?.workforce.activeTimesheets ?? 0;
  const pendingTimesheetApprovals = operationalInsights?.workforce.pendingApprovals ?? 0;
  const approvalsClearedThisWeek = operationalInsights?.workforce.approvedThisWeek ?? 0;
  const overtimeHours = operationalInsights?.workforce.overtimeHours ?? null;
  const operationalAlerts = operationalInsights?.alerts ?? [];

  const latestForecast = data.forecasts[0] ?? null;
  const previousForecasts = data.forecasts.slice(1, 4);

  const handleGenerateBrief = useCallback(
    async (horizon: number) => {
      if (!user.companyId) return;
      setIsGeneratingBrief(true);
      setBriefError(null);
      try {
        const forecast = await generateFinancialForecast({
          companyName: data.companyName ?? 'Portfolio',
          currency,
          horizonMonths: horizon,
          kpis: data.kpis,
          monthly: data.monthly,
          costs: data.costs,
          invoices: data.invoices,
          expenses: data.expenses,
        });
        const saved = await api.createFinancialForecast(
          {
            companyId: user.companyId,
            summary: forecast.summary,
            horizonMonths: horizon,
            metadata: { ...forecast.metadata, source: 'owner-dashboard' },
            model: forecast.model,
          },
          user.id
        );
        setData((prev) => ({ ...prev, forecasts: [saved, ...prev.forecasts] }));
        addToast('Executive outlook refreshed.', 'success');
      } catch (error) {
        console.error('Failed to generate financial forecast', error);
        setBriefError('Unable to generate the AI outlook right now.');
        addToast('Could not generate the AI briefing.', 'error');
      } finally {
        setIsGeneratingBrief(false);
      }
    },
    [user.companyId, user.id, data.companyName, data.kpis, data.monthly, data.costs, data.invoices, data.expenses, currency, addToast]
  );

  if (loading) return <>Loading executive overview…</>;

  return (
    <div className="space-y-6">
      <ViewHeader
        title="Executive control centre"
        description="Monitor the commercial pulse and operational risk across the portfolio."
        isOnline={isOnline}
        actions={
          setActiveView
            ? (
              <Button variant="secondary" onClick={() => setActiveView('financials')}>
                Open financial workspace
              </Button>
            )
            : undefined
        }
        meta={[
          {
            label: 'Portfolio value',
            value: formatCurrency(portfolioSummary.pipelineValue, currency),
            helper: `${portfolioSummary.totalProjects} active engagements`,
          },
          {
            label: 'At-risk projects',
            value: `${atRiskProjects.length}`,
            helper: `${portfolioSummary.atRiskProjects} budget alerts` +
              (portfolioSummary.overdueProjects ? ` • ${portfolioSummary.overdueProjects} overdue` : ''),
            indicator:
              portfolioSummary.atRiskProjects > 0 || portfolioSummary.overdueProjects > 0 ? 'warning' : 'positive',
          },
          {
            label: 'Outstanding receivables',
            value: formatCurrency(outstandingReceivables, currency),
            helper: overdueReceivables > 0 ? `${formatCurrency(overdueReceivables, currency)} overdue` : 'All current',
            indicator: outstandingReceivables > 0 ? 'warning' : 'positive',
          },
          {
            label: 'Workforce',
            value: `${data.users.length}`,
            helper: (() => {
              if (complianceRate > 0) {
                const baseText = `${complianceRate}% approvals`;
                const crewText = crewOnShift ? ` • ${crewOnShift} clocked in` : '';
                return baseText + crewText;
              } else if (crewOnShift) {
                return `${crewOnShift} team members clocked in`;
              } else {
                return 'No approvals submitted';
              }
            })(),
            indicator: (() => {
              if (complianceRate < 80) return 'warning';
              if (crewOnShift > 0) return 'positive';
              return 'neutral';
            })(),
          },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">{/* rest of content */}
        <Card className="space-y-6 p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">Financial pulse</h2>
            <p className="text-sm text-muted-foreground">
              Revenue momentum and profitability signals over the last six months.
            </p>
          </div>
          <MiniBarChart data={revenueTrend} accent="primary" emptyLabel="No revenue history captured." />
          <MiniBarChart data={profitTrend} accent="emerald" emptyLabel="No profit history captured." />
        </Card>
        <Card className="space-y-4 p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">Operational signals</h2>
            <p className="text-sm text-muted-foreground">Live risk and workforce telemetry.</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Open incidents</span>
              <span className="font-semibold text-foreground">
                {openIncidentsCount}
                {highSeverityCount > 0 && (
                  <span className="text-xs font-medium text-destructive"> • {highSeverityCount} high</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Days since last incident</span>
              <span className="font-semibold text-foreground">
                {(() => {
                  if (daysSinceLastIncident === null) return '—';
                  if (daysSinceLastIncident === 0) return 'Today';
                  return `${daysSinceLastIncident} day${daysSinceLastIncident === 1 ? '' : 's'}`;
                })()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Approved expense run rate</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(approvedExpenseTotal, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Timesheet compliance</span>
              <span className={`font-semibold ${complianceRate < 80 ? 'text-amber-600' : 'text-foreground'}`}>
                {complianceRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending approvals</span>
              <span className="font-semibold text-foreground">{pendingTimesheetApprovals}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Approved cost this month</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(approvedExpenseRunRate, financialCurrency)}
              </span>

              <span className="font-semibold text-foreground">{complianceRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Invoice pipeline</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(invoicePipeline, financialCurrency)}
              </span>
            </div>
          </div>
          {operationalInsights && (
            <p className="text-xs text-muted-foreground">
              Burn per active project: {formatCurrency(burnRatePerProject ?? 0, financialCurrency)}
              {overtimeHours && overtimeHours > 0 ? ` • ${overtimeHours.toFixed(1)} overtime hrs` : ''}
            </p>
          )}
          {operationalAlerts.length > 0 && (
            <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Action items</p>
              <ul className="space-y-1 text-sm text-foreground">
                {operationalAlerts.map(alert => (
                  <li key={alert.id} className="flex items-start gap-2">
                    <span
                      className={`mt-1 h-2 w-2 rounded-full ${(() => {
                        if (alert.severity === 'critical') return 'bg-destructive';
                        if (alert.severity === 'warning') return 'bg-amber-500';
                        return 'bg-primary';
                      })()}`}
                    />
                    <span className="text-muted-foreground">{alert.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Approved cost mix</h3>
            <CostBreakdownList data={data.costs} currency={financialCurrency} />
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Focus projects</h2>
              <p className="text-sm text-muted-foreground">Jobs with the highest commercial or delivery risk.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveView?.('projects')}>
              View all
            </Button>
          </div>
          {atRiskProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">All live projects are currently steady.</p>
          ) : (
            <div className="space-y-4">
              {atRiskProjects.map(({ project, budget, actual, progress }) => (
                <div key={project.id} className="space-y-2 rounded-lg border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.location?.city ?? project.location?.address}</p>
                    </div>
                    <Tag
                      label={project.status.replace(/_/g, ' ')}
                      color={(() => {
                        if (project.status === 'ACTIVE') return 'green';
                        if (project.status === 'ON_HOLD') return 'yellow';
                        return 'red';
                      })()}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p>Budget</p>
                      <p className="font-semibold text-foreground">{formatCurrency(budget, currency)}</p>
                    </div>
                    <div>
                      <p>Actual</p>
                      <p className="font-semibold text-foreground">{formatCurrency(actual, currency)}</p>
                    </div>
                    <div>
                      <p>Progress</p>
                      <p className="font-semibold text-foreground">{clampPercentage(progress)}%</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => onSelectProject(project)}>
                    Inspect project
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">Upcoming deadlines</h2>
          {portfolioSummary.upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No delivery deadlines in the next few weeks.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {portfolioSummary.upcomingDeadlines.map(deadline => {
                const dueDate = new Date(deadline.endDate);
                const label = `${dueDate.toLocaleDateString()} • ${deadline.isOverdue ? 'Overdue' : 'Due soon'}`;
                return (
                  <li key={deadline.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{deadline.name}</p>
                      <p className={`text-xs ${deadline.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>{label}</p>
                    </div>
                    <Tag label={`${clampPercentage(deadline.daysRemaining < 0 ? 0 : deadline.daysRemaining)}d`} color={deadline.isOverdue ? 'red' : 'blue'} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">Collections</h2>
          {data.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices have been raised yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {data.invoices
                .filter(invoice => getDerivedStatus(invoice) !== InvoiceStatus.PAID)
                .sort((a, b) => getInvoiceFinancials(b).balance - getInvoiceFinancials(a).balance)
                .slice(0, 4)
                .map(invoice => {
                  const { balance } = getInvoiceFinancials(invoice);
                  const derivedStatus = getDerivedStatus(invoice);
                  return (
                    <li key={invoice.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{invoice.invoiceNumber ?? invoice.id}</p>
                        <p className="text-xs text-muted-foreground">{invoice.clientId}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatCurrency(balance, currency)}</p>
                        <p className={`text-xs ${derivedStatus === InvoiceStatus.OVERDUE ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {derivedStatus}
                        </p>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card className="space-y-4 p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">AI executive briefing</h2>
            <p className="text-sm text-muted-foreground">
              Summarise the commercial outlook using Gemini with live ledger data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="owner-brief-horizon">
              Horizon
            </label>
            <select
              id="owner-brief-horizon"
              value={selectedHorizon}
              onChange={event => setSelectedHorizon(Number(event.target.value))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isGeneratingBrief}
            >
              <option value={3}>Next 3 months</option>
              <option value={6}>Next 6 months</option>
              <option value={12}>Next 12 months</option>
            </select>
            <Button onClick={() => handleGenerateBrief(selectedHorizon)} isLoading={isGeneratingBrief} disabled={isGeneratingBrief}>
              {latestForecast ? 'Refresh briefing' : 'Generate briefing'}
            </Button>
          </div>
          {briefError && <p className="text-sm text-destructive">{briefError}</p>}
          {latestForecast ? (
            <div className="space-y-4">
              <div className="space-y-2">{renderMarkdownSummary(latestForecast.summary)}</div>
              <p className="text-xs text-muted-foreground">
                Generated {new Date(latestForecast.createdAt).toLocaleString()}
                {latestForecast.model ? ` • ${latestForecast.model}` : ''}
                {latestForecast.metadata?.['isFallback'] ? ' • Offline summary' : ''}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Run the assistant to get an actionable runway and profitability update for leadership.
            </p>
          )}
          {previousForecasts.length > 0 && (
            <details className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm">
              <summary className="cursor-pointer font-semibold text-muted-foreground">Previous briefings</summary>
              <div className="mt-3 space-y-3 max-h-40 overflow-y-auto pr-1">
                {previousForecasts.map(forecast => (
                  <div key={forecast.id} className="rounded border border-border/60 bg-background/80 p-3">
                    <p className="text-xs text-muted-foreground">
                      {new Date(forecast.createdAt).toLocaleString()}
                      {forecast.model ? ` • ${forecast.model}` : ''}
                    </p>
                    <div className="mt-2 space-y-1">{renderMarkdownSummary(forecast.summary)}</div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </Card>
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">Workforce snapshot</h2>
          {operationalInsights && (
            <p className="text-xs text-muted-foreground">
              {approvalsClearedThisWeek} approvals cleared this week • {pendingTimesheetApprovals} awaiting sign-off
            </p>
          )}

          {data.users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members recorded for this company.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {data.users.slice(0, 6).map(member => (
                <li key={member.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{`${member.firstName} ${member.lastName}`}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                  <Tag
                    label={member.availability ?? 'Unknown'}
                    color={(() => {
                      if (member.availability === 'ON_PROJECT') return 'blue';
                      if (member.availability === 'ON_LEAVE') return 'gray';
                      return 'green';
                    })()}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
};
