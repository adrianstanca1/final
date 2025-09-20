import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  User,
  Project,
  Permission,
  ProjectStatus,
  ProjectPortfolioSummary,
} from '../types';
import { api } from '../services/mockApi';
import { hasPermission } from '../services/auth';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ProjectModal } from './CreateProjectModal';
import { ViewHeader } from './layout/ViewHeader';
import { Tag } from './ui/Tag';
import { computeProjectPortfolioSummary, PROJECT_STATUS_ORDER } from '../utils/projectPortfolio';

interface ProjectsViewProps {
  user: User;
  addToast: (message: string, type: 'success' | 'error') => void;
  onSelectProject: (project: Project) => void;
}

const statusAccent: Record<ProjectStatus, { bg: string; text: string }> = {
  PLANNING: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300' },
  ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300' },
  ON_HOLD: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300' },
  COMPLETED: { bg: 'bg-primary/10', text: 'text-primary dark:text-primary-200' },
  CANCELLED: { bg: 'bg-slate-500/10', text: 'text-slate-500 dark:text-slate-300' },
};

const statusBarColor: Record<ProjectStatus, string> = {
  PLANNING: 'bg-sky-500',
  ACTIVE: 'bg-emerald-500',
  ON_HOLD: 'bg-amber-500',
  COMPLETED: 'bg-primary',
  CANCELLED: 'bg-rose-500',
};

const statusTagColor: Record<ProjectStatus, 'green' | 'blue' | 'red' | 'gray' | 'yellow'> = {
  PLANNING: 'blue',
  ACTIVE: 'green',
  ON_HOLD: 'yellow',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

type SortKey = 'startDate' | 'endDate' | 'name' | 'budget' | 'progress';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'startDate', label: 'Start date' },
  { value: 'endDate', label: 'End date' },
  { value: 'name', label: 'Name' },
  { value: 'budget', label: 'Budget' },
  { value: 'progress', label: 'Progress' },
];

const PROJECT_FILTERS: Array<{ label: string; value: 'ALL' | ProjectStatus }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Planning', value: 'PLANNING' },
  { label: 'On Hold', value: 'ON_HOLD' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value || 0);

const toTitleCase = (value: string): string => value.replace(/\b\w/g, (char) => char.toUpperCase());

const formatStatusLabel = (status: ProjectStatus): string =>
  toTitleCase(status.replace(/_/g, ' ').toLowerCase());

const formatDeadlineLabel = (daysRemaining: number, isOverdue: boolean): string => {
  if (daysRemaining === 0) {
    return 'Due today';
  }

  const absolute = Math.abs(daysRemaining);
  const suffix = absolute === 1 ? 'day' : 'days';

  return isOverdue ? `${absolute} ${suffix} overdue` : `In ${absolute} ${suffix}`;
};

const ProjectCard: React.FC<{ project: Project; onSelect: () => void }> = ({ project, onSelect }) => {
  const budgetUtilization = project.budget > 0 ? (project.actualCost / project.budget) * 100 : 0;
  const statusStyles = statusAccent[project.status] ?? statusAccent.PLANNING;
  const overBudget = budgetUtilization > 100;

  return (
    <Card onClick={onSelect} className="group cursor-pointer space-y-4 transition-all hover:-translate-y-1 hover:shadow-lg animate-card-enter">
      <div className="relative h-40 overflow-hidden rounded-lg bg-muted">
        {project.imageUrl ? (
          <img
            src={project.imageUrl}
            alt={project.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No cover image
          </div>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-2 text-xs font-semibold">
          <Tag label={project.projectType} color="blue" />
          <Tag label={project.workClassification} color="gray" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground line-clamp-2">{project.name}</h3>
            <p className="text-xs text-muted-foreground">{project.location.address}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles.bg} ${statusStyles.text}`}>
            {formatStatusLabel(project.status)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Budget {formatCurrency(project.budget)}</span>
          <span className={overBudget ? 'font-semibold text-rose-500 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}>
            {overBudget ? `+${Math.round(budgetUtilization - 100)}%` : `${Math.round(budgetUtilization)}% used`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`${overBudget ? 'bg-rose-500' : 'bg-emerald-500'} h-full rounded-full transition-all`}
            style={{ width: `${Math.min(100, Math.max(0, budgetUtilization))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Start {new Date(project.startDate).toLocaleDateString()}</span>
          <span>Due {new Date(project.endDate).toLocaleDateString()}</span>
        </div>
      </div>
    </Card>
  );
};

interface ProjectSummaryCardProps {
    project: Project;
    taskCount: number;
    memberCount: number;
    overdueTaskCount: number;
    upcomingMilestone: { name: string; date: Date } | null;
    health: ProjectHealth | null;
    onSelect: () => void;
}

const ProjectSummaryCard: React.FC<ProjectSummaryCardProps> = ({ project, taskCount, memberCount, overdueTaskCount, upcomingMilestone, health, onSelect }) => {
    const progress = project.budget > 0 ? (project.actualCost / project.budget) * 100 : 0;

    return (
        <Card onClick={onSelect} className="cursor-pointer hover:shadow-lg hover:border-sky-500/50 transition-all duration-300 flex flex-col p-0 overflow-hidden animate-card-enter">
            <img src={project.imageUrl} alt={project.name} className="w-full h-40 object-cover" />
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-bold text-lg text-slate-800 flex-grow pr-2">{project.name}</h3>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <ProjectStatusBadge status={project.status} />
                        {health && <ProjectHealthIndicator health={health} />}
                    </div>
                </div>
                <p className="text-sm text-slate-500 mb-4">{project.location.address}</p>

                {/* Key Metrics List */}
                <div className="space-y-3 my-2">
                    <div className="flex items-center text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <span className="text-slate-600">Team Members</span>
                        <span className="ml-auto font-semibold text-slate-800 bg-slate-100 rounded-full px-2.5 py-0.5">{memberCount}</span>
                    </div>
                     <div className="flex items-center text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <span className="text-slate-600">Open Tasks</span>
                        <span className="ml-auto font-semibold text-slate-800 bg-slate-100 rounded-full px-2.5 py-0.5">{taskCount}</span>
                    </div>
                    <div className="flex items-center text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-slate-600">Overdue Tasks</span>
                        <span className={`ml-auto font-bold text-lg ${overdueTaskCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                            {overdueTaskCount}
                        </span>
                    </div>
                </div>

                {/* Upcoming Milestone */}
                <div className="mt-4 flex-grow">
                    {upcomingMilestone ? (
                        <div className="text-sm bg-slate-50 p-3 rounded-md border">
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Next Milestone</p>
                            <div className="flex justify-between items-center mt-1">
                                <p className="font-semibold text-slate-700 truncate pr-2">{upcomingMilestone.name}</p>
                                <p className="text-xs text-slate-600 font-medium flex-shrink-0">{new Date(upcomingMilestone.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm bg-slate-50 p-3 rounded-md border text-center text-slate-500">
                            <p>No upcoming tasks with due dates.</p>
                        </div>
                    )}
                </div>

                {/* Budget */}
                <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between mb-1 text-xs font-medium text-slate-600">
                        <span>Budget Used</span>
                        <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className={`project-budget-bar ${progress > 100 ? 'bg-red-500' : 'bg-sky-500'}`} style={{ '--bar-width': `${Math.min(progress, 100)}%` } as React.CSSProperties}></div>
import './ui/projectBudgetBar.css';
                    </div>
                </div>
            </div>
        </Card>
    );
};
type SortKey = 'name' | 'startDate' | 'budget' | 'status';

export const ProjectsView: React.FC<ProjectsViewProps> = ({ user, addToast, onSelectProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProjectPortfolioSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | ProjectStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('startDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const canCreate = hasPermission(user, Permission.CREATE_PROJECT);
  const isPM = hasPermission(user, Permission.MANAGE_PROJECTS);
  const hasCompanyWideAccess = useMemo(
    () => hasPermission(user, Permission.VIEW_ALL_PROJECTS),
    [user]
  );

  const fetchProjects = useCallback(async () => {
    if (!user.companyId) {
      setProjects([]);
      setSummary(null);
      setSummaryError(null);
      setLoading(false);
      setSummaryLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    setLoading(true);
    setSummaryLoading(true);
    setSummary(null);
    setSummaryError(null);

    try {
      const projectsData = hasCompanyWideAccess
        ? await api.getProjectsByCompany(user.companyId, { signal: controller.signal })
        : await api.getProjectsByUser(user.id, { signal: controller.signal });

      if (controller.signal.aborted) {
        return;
      }

      setProjects(projectsData);

      if (!projectsData.length) {
        return;
      }

      try {
        const summaryData = await api.getProjectPortfolioSummary(user.companyId, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setSummary(summaryData);
        }
      } catch (summaryError) {
        if (!controller.signal.aborted) {
          console.warn('Failed to fetch project portfolio summary:', summaryError);
          setSummaryError('Failed to load portfolio summary');
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Failed to fetch projects:', error);
        addToast('Failed to load projects. Please try again.', 'error');
        setProjects([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setSummaryLoading(false);
      }
    }
  }, [user.companyId, hasCompanyWideAccess, addToast]);

  useEffect(() => {
    fetchProjects();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchProjects]);

  const filteredProjects = useMemo(() => {
    const baseProjects = filter === 'ALL' ? projects : projects.filter((project) => project.status === filter);
    const query = searchQuery.trim().toLowerCase();
    const searchedProjects = query
      ? baseProjects.filter((project) => {
          const fields = [
            project.name,
            project.description || '',
            project.location || '',
            project.client?.name || '',
          ];
          return fields.some((field) => field.toLowerCase().includes(query));
        })
      : baseProjects;

    return searchedProjects.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'startDate':
          aValue = new Date(a.startDate).getTime();
          bValue = new Date(b.startDate).getTime();
          break;
        case 'budget':
          aValue = a.budget;
          bValue = b.budget;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, filter, searchQuery, sortDirection, sortKey]);

  return (
        <div className="space-y-6">
            {isCreateModalOpen && (
                <CreateProjectModal
                    user={user}
                    onClose={() => setIsCreateModalOpen(false)}
                    onProjectCreated={(newProject) => {
                        fetchProjects();
                        onSelectProject(newProject);
                    }}
                    addToast={addToast}
                />
            )}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-3xl font-bold text-slate-800">{isPM ? "Project Manager Dashboard" : "Projects"}</h2>
                {canCreate && (
                    <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <title>Create Project Icon</title>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Project
                    </Button>
                )}
            </div>

            {loading ? (
                <Card>
                    <p>Loading projects...</p>
                </Card>
            ) : (
                <Card>
                    <div className="space-y-4">
                        {filteredProjects.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                                {projects.length === 0 ? 'No projects found.' : 'No projects match your filters.'}
                            </p>
                        ) : (
                            filteredProjects.map(project => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onSelect={() => onSelectProject(project)}
                                />
                            ))
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};
