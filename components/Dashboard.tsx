import React, { useEffect, useCallback } from 'react';
import {
    User,
    View,
    Project,
    AvailabilityStatus,
} from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { useProjectAI } from '../hooks/useProjectAI';
import './dashboard.css';

import { Avatar } from './ui/Avatar';
import { EquipmentStatusBadge } from './ui/StatusBadge';
import { Tag } from './ui/Tag';
import { ViewHeader } from './layout/ViewHeader';
import { generateProjectHealthSummary } from '../services/ai';

interface DashboardProps {
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
    activeView: View;
    setActiveView: (view: View) => void;
    onSelectProject: (project: Project) => void;
}

const KpiCard: React.FC<{ title: string; value: string; subtext?: string; icon: React.ReactNode }> = ({ title, value, subtext, icon }) => (
    <Card className="flex items-center gap-4 animate-card-enter">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-muted text-muted-foreground">
            {icon}
        </div>
        <div>
            <h3 className="font-semibold text-muted-foreground">{title}</h3>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {subtext && <p className="text-sm text-muted-foreground">{subtext}</p>}
        </div>
    </Card>
);

const BarChart: React.FC<{ data: { label: string, value: number }[], barColor: string }> = ({ data, barColor }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1); // Ensure maxValue is at least 1 to avoid division by zero
    return (
        <div className="bar-chart-container">
            {data.map((item, index) => (
                <div key={`bar-${item.label}-${index}`} className="bar-chart-item group">
                    <div className="bar-chart-value">{item.value}</div>
                    <div
                        className={`${barColor} bar-chart-bar`}
                        style={{ height: `${(item.value / maxValue) * 90}%` }}
                        title={`${item.label}: ${item.value}`}
                    ></div>
                    <span className="bar-chart-label">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

const renderMarkdownSummary = (summary: string) =>
    summary
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
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

const formatCurrency = (value: number, currency: string = 'GBP') =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);

const clampPercentage = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const availabilityTagColor: Record<AvailabilityStatus, 'green' | 'blue' | 'gray'> = {
    [AvailabilityStatus.AVAILABLE]: 'green',
    [AvailabilityStatus.ON_PROJECT]: 'blue',
    [AvailabilityStatus.ON_LEAVE]: 'gray',
};

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

export const Dashboard: React.FC<DashboardProps> = ({ user, addToast, setActiveView, onSelectProject }) => {
    const { isOnline } = useOfflineSync(addToast);

    // Use custom hooks to reduce complexity
    const {
        projects,
        team,
        equipment,
        tasks,
        activityLog,
        incidents,
        expenses,
        operationalInsights,
        loading
    } = useDashboardData({ user, addToast });

    const metrics = useDashboardMetrics({
        projects,
        tasks,
        team,
        incidents,
        expenses,
        operationalInsights
    });

    const ai = useProjectAI({
        projects,
        tasks: tasks,
        incidents: incidents,
        expenses: expenses,
        addToast
    });

    // Create userMap for activity log
    const userMap = new Map(team.map(u => [u.id, u]));

    // Set initial AI selected project
    useEffect(() => {
        if (!ai.aiSelectedProjectId && projects.length > 0) {
            const activeProject = projects.find(p => p.status === 'ACTIVE');
            const firstProject = activeProject || projects[0];
            if (firstProject) {
                ai.setAiSelectedProjectId(firstProject.id);
            }
        }
    }, [projects, ai.aiSelectedProjectId, ai.setAiSelectedProjectId]);

    // Data loading is now handled by custom hooks

    // All calculations now handled by useDashboardMetrics hook

    ai.handleGenerateProjectBrief();

    if (loading) return <Card>Loading project manager dashboard…</Card>;

    return (
        <div className="space-y-6">
            <ViewHeader
                title={`Welcome back, ${user.firstName}!`}
                description="Your live delivery and commercial snapshot."
                isOnline={isOnline}
                actions={<Button variant="secondary" onClick={() => setActiveView('projects')}>Open projects workspace</Button>}
                meta={[
                    {
                        label: 'Active projects',
                        value: metrics.kpiData.activeProjectsCount.toString(),
                        helper: `${metrics.portfolioSummary.completedProjects} completed`,
                        indicator: metrics.kpiData.activeProjectsCount > 0 ? 'positive' : 'neutral',
                    },
                    {
                        label: 'At-risk',
                        value: `${metrics.kpiData.atRisk}`,
                        helper: metrics.atRiskProjects.length > 0 ? 'See priority list below' : 'All projects steady',
                        indicator: metrics.kpiData.atRisk > 0 ? 'warning' : 'positive',
                    },
                    {
                        label: 'Open incidents',
                        value: `${metrics.kpiData.openIncidents}`,
                        helper: metrics.operationalMetrics.highSeverityCount > 0 ? `${metrics.operationalMetrics.highSeverityCount} high severity` : 'No critical alerts',
                        indicator: metrics.kpiData.openIncidents > 0 ? 'warning' : 'positive',
                    },
                    {
                        label: 'Team',
                        value: metrics.kpiData.teamSize.toString(),
                        helper: 'Across org',
                        indicator: 'positive',
                    },
                    {
                        label: 'Budget utilisation',
                        value: `${metrics.kpiData.budgetUtilization}%`,
                        helper: 'Across active projects',
                        indicator: Number(metrics.kpiData.budgetUtilization) > 90 ? 'warning' : 'positive',
                    },
                ]}
            />

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <KpiCard
                    title="Active projects"
                    value={metrics.kpiData.activeProjectsCount.toString()}
                    subtext={`${metrics.portfolioSummary.totalProjects} in portfolio`}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
                />
                <KpiCard
                    title="Team size"
                    value={metrics.kpiData.teamSize.toString()}
                    subtext="Across your organisation"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
                <KpiCard
                    title="Budget utilisation"
                    value={`${metrics.kpiData.budgetUtilization}%`}
                    subtext="Across active projects"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                />
                <KpiCard
                    title="Approved spend"
                    value={formatCurrency(metrics.operationalMetrics.approvedExpenseThisMonth)}
                    subtext="Approved or paid expenses"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M9 6h6m-3-2v2m0 12v2m7-5a9 9 0 11-14 0" /></svg>}
                />
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
                <Card className="space-y-4 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Focus projects</h2>
                            <p className="text-sm text-muted-foreground">Highest-risk delivery or budget positions.</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setActiveView('projects')}>View all</Button>
                    </div>
                    {metrics.atRiskProjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground">All monitored projects are currently stable.</p>
                    ) : (
                        <div className="space-y-4">
                            {metrics.atRiskProjects.map(({ project, budget, actual, progress, overdue }) => (
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
                                            <p className="font-semibold text-foreground">{formatCurrency(budget)}</p>
                                        </div>
                                        <div>
                                            <p>Actual</p>
                                            <p className="font-semibold text-foreground">{formatCurrency(actual)}</p>
                                        </div>
                                        <div>
                                            <p>Progress</p>
                                            <p className="font-semibold text-foreground">{clampPercentage(progress)}%</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{overdue ? '⚠️ Overdue milestone' : 'On schedule'}</span>
                                        <Button size="sm" variant="secondary" onClick={() => onSelectProject(project)}>Open</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
                <Card className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold text-foreground">Upcoming deadlines</h2>
                    {metrics.portfolioSummary.upcomingDeadlines.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No due dates in the next few weeks.</p>
                    ) : (
                        <ul className="space-y-3 text-sm">
                            {metrics.portfolioSummary.upcomingDeadlines.map(deadline => (
                                <li key={deadline.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-foreground">{deadline.name}</p>
                                        <p className={`text-xs ${deadline.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                            {new Date(deadline.endDate).toLocaleDateString()} • {deadline.isOverdue ? 'Overdue' : `Due in ${Math.max(0, deadline.daysRemaining)} day(s)`}
                                        </p>
                                    </div>
                                    <Tag
                                        label={deadline.status.replace(/_/g, ' ')}
                                        color={deadline.isOverdue ? 'red' : 'blue'}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <Card className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold text-foreground">Operational snapshot</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Open incidents</span>
                            <span className="font-semibold text-foreground">
                                {metrics.operationalMetrics.openIncidentsCount}
                                {metrics.operationalMetrics.highSeverityCount > 0 && (
                                    <span className="text-xs font-medium text-destructive"> • {metrics.operationalMetrics.highSeverityCount} high</span>
                                )}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Tasks due next 7 days</span>
                            <span className={`font-semibold ${metrics.operationalMetrics.tasksDueSoon > 5 ? 'text-amber-600' : 'text-foreground'}`}>{metrics.operationalMetrics.tasksDueSoon}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Overdue tasks</span>
                            <span className={`font-semibold ${metrics.operationalMetrics.overdueTasks > 0 ? 'text-destructive' : 'text-foreground'}`}>{metrics.operationalMetrics.overdueTasks}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Active tasks</span>
                            <span className="font-semibold text-foreground">{metrics.operationalMetrics.scheduleInProgress}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Pending approvals</span>
                            <span className="font-semibold text-foreground">{metrics.operationalMetrics.pendingApprovals}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Avg hours / shift</span>
                            <span className="font-semibold text-foreground">{metrics.operationalMetrics.averageHours.toFixed(1)}h</span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Burn per active project {formatCurrency(metrics.operationalMetrics.burnPerProject, metrics.operationalMetrics.operationalCurrency)}
                        {metrics.operationalMetrics.overtimeHours > 0 ? ` • ${metrics.operationalMetrics.overtimeHours.toFixed(1)} overtime hrs` : ''}
                    </p>
                    {metrics.operationalMetrics.operationalAlerts.length > 0 && (
                        <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Alerts</p>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                {metrics.operationalMetrics.operationalAlerts.slice(0, 3).map(alert => (
                                    <li key={alert.id} className="flex items-start gap-2">
                                        <span
                                            className={`mt-1 h-2 w-2 rounded-full ${(() => {
                                                if (alert.severity === 'critical') return 'bg-destructive';
                                                if (alert.severity === 'warning') return 'bg-amber-500';
                                                return 'bg-primary';
                                            })()}`}
                                        />
                                        <span>{alert.message}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Card>
                <Card className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold text-foreground">Operational snapshot</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Open incidents</span>
                            <span className="font-semibold text-foreground">{metrics.operationalMetrics.openIncidentsCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">High severity</span>
                            <span className="font-semibold text-destructive">{metrics.operationalMetrics.highSeverityCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Active tasks</span>
                            <span className="font-semibold text-foreground">{metrics.operationalMetrics.scheduleInProgress}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Approved spend</span>
                            <span className="font-semibold text-foreground">{formatCurrency(metrics.operationalMetrics.approvedExpenseThisMonth)}</span>
                        </div>
                    </div>

                </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[2fr,1fr]">
                <Card className="space-y-4 p-6">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-lg font-semibold text-foreground">AI project briefing</h2>
                        <p className="text-sm text-muted-foreground">Generate a Gemini-powered health summary for any live job.</p>
                    </div>
                    {metrics.activeProjects.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Add an active project to run an AI briefing.</p>
                    ) : (
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                aria-label="Select project for analysis"
                                value={ai.aiSelectedProjectId ?? ''}
                                onChange={event => ai.setAiSelectedProjectId(event.target.value || null)}
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                disabled={ai.isGeneratingAiSummary}
                            >
                                {metrics.activeProjects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                            <Button onClick={ai.handleGenerateProjectBrief} isLoading={ai.isGeneratingAiSummary} disabled={ai.isGeneratingAiSummary || !ai.aiSelectedProjectId}>
                                {ai.aiSummary && ai.aiSummaryProjectId === ai.aiSelectedProjectId ? 'Refresh brief' : 'Generate brief'}
                            </Button>
                        </div>
                    )}
                    {ai.aiError && <p className="text-sm text-destructive">{ai.aiError}</p>}
                    {ai.aiSummary && ai.aiSummaryProjectId === ai.aiSelectedProjectId ? (
                        <div className="space-y-3">
                            <div className="space-y-1">{renderMarkdownSummary(ai.aiSummary.summary)}</div>
                            <p className="text-xs text-muted-foreground">
                                {ai.aiSummary.isFallback ? 'Offline insight' : 'AI insight'}
                                {ai.aiSummary.model ? ` • ${ai.aiSummary.model}` : ''}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Run the assistant to receive targeted recommendations.</p>
                    )}
                </Card>
                <Card className="space-y-4 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Team availability</h2>
                            <p className="text-sm text-muted-foreground">Crew status across the organisation.</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setActiveView('users')}>Manage team</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {metrics.operationalMetrics.complianceRate}% timesheets approved • {metrics.operationalMetrics.pendingApprovals} pending
                    </p>

                    <div className="space-y-3 text-sm">
                        {Object.entries(metrics.availabilityBreakdown).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between">
                                <span className="text-muted-foreground">{status}</span>
                                <span className="font-semibold text-foreground">{count}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <Card className="p-6">
                    <h2 className="text-lg font-semibold text-foreground">Tasks completed this week</h2>
                    <BarChart data={metrics.weeklyTaskData} barColor="bg-primary" />
                </Card>
                <Card className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold text-foreground">People on deck</h2>
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                        {team.slice(0, 10).map(member => (
                            <div key={member.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-accent">
                                <Avatar name={`${member.firstName} ${member.lastName}`} imageUrl={member.avatar} className="h-9 w-9" />
                                <div className="flex-grow">
                                    <p className="text-sm font-semibold text-foreground">{`${member.firstName} ${member.lastName}`}</p>
                                    <p className="text-xs text-muted-foreground">{member.role}</p>
                                </div>
                                <Tag label={member.availability ?? 'Unknown'} color={availabilityTagColor[member.availability || AvailabilityStatus.AVAILABLE]} />
                            </div>
                        ))}
                    </div>
                </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <Card className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold text-foreground">Equipment summary</h2>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-2">
                        {equipment.map(item => (
                            <div key={item.id} className="flex items-center justify-between rounded-md p-2 hover:bg-accent">
                                <span className="text-sm font-medium text-foreground">{item.name}</span>
                                <EquipmentStatusBadge status={item.status} />
                            </div>
                        ))}
                    </div>
                </Card>
                <Card className="space-y-4 p-6">
                    <h2 className="text-lg font-semibold text-foreground">Task activity log</h2>
                    <div className="space-y-3 max-h-52 overflow-y-auto pr-2">
                        {activityLog.slice(0, 12).map(log => {
                            const actor = userMap.get(log.actorId);
                            const actorName = actor ? `${actor.firstName} ${actor.lastName}` : '?';
                            return (
                                <div key={log.id} className="flex items-start gap-3">
                                    <Avatar name={actorName} className="h-8 w-8 text-xs" />
                                    <div>
                                        <p className="text-sm text-foreground">
                                            <span className="font-semibold">{actorName}</span> {log.action.replace(/_/g, ' ')}
                                            {log.target?.name ? `: "${log.target.name}"` : ''}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </section>
        </div>
    );
};