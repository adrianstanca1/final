import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  User,
  Project,
  Todo,
  Document,
  Permission,
  TodoStatus,
  TodoPriority,
  SafetyIncident,
  Expense,
  ExpenseStatus,
  ProjectInsight,
} from '../types';
import { api } from '../services/mockApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { hasPermission } from '../services/auth';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { Avatar } from './ui/Avatar';
import { IncidentSeverityBadge, IncidentStatusBadge } from './ui/StatusBadge';
import { ProjectModal } from './CreateProjectModal';
import { ReminderControl } from './ReminderControl';
import { TaskModal } from './TaskModal';
import { Tag } from './ui/Tag';
import { ReminderModal } from './ReminderModal';
import { WhiteboardView } from './WhiteboardView';
import { generateProjectHealthSummary } from '../services/ai';

interface ProjectDetailViewProps {
  project: Project;
  user: User;
  onBack: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  isOnline: boolean;
  onStartChat: (recipient: User) => void;
type DetailTab = 'overview' | 'tasks' | 'whiteboard' | 'documents' | 'team' | 'safety' | 'financials';

}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const ProjectHealthSummary: React.FC<{
  project: Project;
  insights: ProjectInsight[];
  onGenerate: () => void;
  isGenerating: boolean;
  error?: string | null;
  isOnline: boolean;
}> = ({ project, insights, onGenerate, isGenerating, error, isOnline }) => {
  const latestInsight = insights[0] ?? null;

  const renderSummary = (summary: string, keyPrefix: string) =>
    summary
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, index) => (
        <p
          key={`${keyPrefix}-${index}`}
          dangerouslySetInnerHTML={{
            __html: line
              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
              .replace(/^[-•]\s+/, '• '),
          }}
        />
      ));

  const metadata = (latestInsight?.metadata ?? {}) as Record<string, unknown>;
  const totalTasks = typeof metadata.totalTasks === 'number' ? metadata.totalTasks : undefined;
  const completedTasks = typeof metadata.completedTasks === 'number' ? metadata.completedTasks : undefined;
  const averageProgress = typeof metadata.averageProgress === 'number' ? metadata.averageProgress : undefined;
  const budgetUtilisation = typeof metadata.budgetUtilisation === 'number' ? metadata.budgetUtilisation : undefined;
  const openIncidents = typeof metadata.openIncidents === 'number' ? metadata.openIncidents : undefined;
  const expenseTotal = typeof metadata.expenseTotal === 'number' ? metadata.expenseTotal : undefined;
  const isFallback = metadata.isFallback === true;

  const tags: { label: string; value: string }[] = [];
  if (typeof completedTasks === 'number' && typeof totalTasks === 'number' && totalTasks > 0) {
    tags.push({ label: 'Tasks', value: `${completedTasks}/${totalTasks}` });
  }
  if (typeof averageProgress === 'number') {
    tags.push({ label: 'Avg progress', value: `${Math.round(averageProgress)}%` });
  }
  if (typeof budgetUtilisation === 'number') {
    tags.push({ label: 'Budget used', value: `${Math.round(budgetUtilisation)}%` });
  }
  if (typeof openIncidents === 'number') {
    tags.push({ label: 'Open incidents', value: openIncidents.toString() });
  }
  if (typeof expenseTotal === 'number' && expenseTotal > 0) {
    tags.push({ label: 'Logged expenses', value: formatCurrency(expenseTotal) });
  }

  const buttonLabel = latestInsight ? 'Refresh Summary' : 'Generate Summary';

  return (
    <Card className="bg-muted">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-lg">AI Project Health Summary</h3>
        <Button
          size="sm"
          variant="secondary"
          onClick={onGenerate}
          isLoading={isGenerating}
          disabled={!isOnline && !isGenerating}
          title={!isOnline ? 'Go online to regenerate the AI summary.' : undefined}
        >
          {buttonLabel}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive mb-2">{error}</p>}
      {latestInsight ? (
        <>
          <div className="text-sm space-y-1 whitespace-pre-wrap">
            {renderSummary(latestInsight.summary, 'current')}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map(tag => (
                <span
                  key={tag.label}
                  className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  {tag.label}: {tag.value}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Last updated {new Date(latestInsight.createdAt).toLocaleString()}
            {latestInsight.model ? ` • ${latestInsight.model}` : ''}
            {isFallback ? ' • offline summary' : ''}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Click "Generate" to get an AI-powered summary for {project.name}.
        </p>
      )}
      {insights.length > 1 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Previous AI snapshots</summary>
          <div className="mt-2 space-y-3 max-h-60 overflow-y-auto pr-1">
            {insights.slice(1, 5).map(insight => {
              const entryMetadata = (insight.metadata ?? {}) as Record<string, unknown>;
              const entryFallback = entryMetadata.isFallback === true;
              return (
                <div key={insight.id} className="border border-border rounded-md p-2 bg-background">
                  <p className="text-xs text-muted-foreground">
                    {new Date(insight.createdAt).toLocaleString()}
                    {insight.model ? ` • ${insight.model}` : ''}
                    {entryFallback ? ' • offline summary' : ''}
                  </p>
                  <div className="text-xs space-y-1 whitespace-pre-wrap mt-1">
                    {renderSummary(insight.summary, insight.id)}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </Card>
  );
const TaskItem: React.FC<{
  task: Todo;
  allProjectTasks: Todo[];
  team: User[];
  canManage: boolean;
  onUpdate: (taskId: string, updates: Partial<Todo>) => void;
  onEdit: (task: Todo) => void;
  onOpenReminder: (task: Todo) => void;
}> = ({ task, allProjectTasks, team, canManage, onUpdate, onEdit, onOpenReminder }) => {
  const [progress, setProgress] = useState(task.progress ?? 0);
  const assignee = useMemo(() => team.find(u => u.id === task.assigneeId), [team, task.assigneeId]);

  useEffect(() => {
    setProgress(task.progress ?? 0);
  }, [task.progress]);

  const isBlocked = useMemo(() => {
    if (!task.dependsOn || task.dependsOn.length === 0) return false;
    return task.dependsOn.some(depId => {
      const dependency = allProjectTasks.find(t => t.id == depId);
      return dependency && dependency.status !== TodoStatus.DONE;
    });
  }, [task.dependsOn, allProjectTasks]);

  const blockerTasks = useMemo(() => {
    if (!isBlocked || !task.dependsOn) return '';
    return task.dependsOn
      .map(depId => allProjectTasks.find(t => t.id == depId))
      .filter((t): t is Todo => !!t && t.status !== TodoStatus.DONE)
      .map(t => `#${t.id.toString().substring(0, 5)} - ${t.text}`)
      .join('\n');
  }, [isBlocked, task.dependsOn, allProjectTasks]);

  const handleProgressChangeCommit = (newProgress: number) => {
    if (newProgress !== (task.progress ?? 0)) {
      onUpdate(task.id, { progress: newProgress });
    }
  };

  const handleToggleComplete = () => {
    const newProgress = task.status === TodoStatus.DONE ? 0 : 100;
    setProgress(newProgress);
    onUpdate(task.id, { progress: newProgress });
  };

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const formattedDueDate = dueDate && !Number.isNaN(dueDate.getTime())
    ? dueDate.toLocaleDateString()
    : null;

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-6 items-center gap-x-4 gap-y-2 p-3 rounded-md hover:bg-accent border-b border-border last:border-b-0 ${
        isBlocked ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    >
      <div className="md:col-span-3 flex items-start gap-3 group">
        <input
          type="checkbox"
          checked={task.status === TodoStatus.DONE}
          onChange={handleToggleComplete}
          disabled={!canManage || isBlocked}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-ring disabled:cursor-not-allowed"
        />
        {isBlocked && (
          <div className="text-muted-foreground" title={`Blocked by:\n${blockerTasks}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className={task.status === TodoStatus.DONE ? 'line-through text-muted-foreground' : ''}>
            {task.text}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <PriorityDisplay priority={task.priority ?? TodoPriority.MEDIUM} />
            {formattedDueDate && <span>Due {formattedDueDate}</span>}
          </div>
        </div>
        {canManage && <ReminderControl todo={task} onClick={() => onOpenReminder(task)} />}
        {canManage && !isBlocked && (
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/10 text-muted-foreground hover:text-foreground transition-opacity disabled:opacity-50"
            aria-label="Edit task"
            title="Edit Task"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex justify-start md:justify-center">
        {assignee && (
          <Avatar name={`${assignee.firstName} ${assignee.lastName}`} imageUrl={assignee.avatar} className="w-8 h-8 text-xs" />
        )}
      </div>
      <div className="md:col-span-2 flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={e => setProgress(Number(e.target.value))}
          onMouseUp={e => handleProgressChangeCommit(Number(e.currentTarget.value))}
          onTouchEnd={e => handleProgressChangeCommit(Number(e.currentTarget.value))}
          disabled={!canManage || isBlocked}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
        />
        <span className="text-sm font-semibold w-12 text-right">{progress}%</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-800"
            aria-label="Go back"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <p className="text-muted-foreground">Project details will be loaded here...</p>
      </div>
    </div>
  );
export { ProjectDetailView };

