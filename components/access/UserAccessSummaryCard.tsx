import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserAccessSummary } from '../../types';
import { api } from '../../services/mockApi';
import { Card } from '../ui/Card';
import { Tag } from '../ui/Tag';
import { Button } from '../ui/Button';

interface UserAccessSummaryCardProps {
  userId: string;
  companyId?: string | null;
  className?: string;
  title?: string;
}

const accessTagColor = (index: number) => {
  const palette: Array<'green' | 'blue' | 'gray' | 'yellow' | 'red'> = ['green', 'blue', 'yellow', 'gray', 'red'];
  return palette[index % palette.length];
};

export const UserAccessSummaryCard: React.FC<UserAccessSummaryCardProps> = ({
  userId,
  companyId,
  className,
  title = 'Workspace access overview',
}) => {
  const [summary, setSummary] = useState<UserAccessSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(
    async (signal?: AbortSignal) => {
      if (!userId) {
        setSummary(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await api.getUserAccessSummary(userId, companyId ?? undefined, { signal });
        if (!signal?.aborted) {
          setSummary(response);
        }
      } catch (err: any) {
        if (!signal?.aborted) {
          setError(err?.message ?? 'Unable to load access summary.');
          setSummary(null);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [companyId, userId]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadSummary(controller.signal);
    return () => controller.abort();
  }, [loadSummary]);

  const grantedModules = useMemo(() => summary?.modules.filter(module => module.granted) ?? [], [summary]);
  const lockedModules = useMemo(() => summary?.modules.filter(module => !module.granted) ?? [], [summary]);

  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Understand what this user can reach across the workspace and which actions will extend their access safely.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => loadSummary()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading && (
        <p className="mt-4 text-sm text-muted-foreground">Loading access summary...</p>
      )}

      {error && !loading && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <p>{error}</p>
          <Button variant="ghost" size="sm" className="mt-2 h-auto px-0 text-xs font-semibold" onClick={() => loadSummary()}>
            Try again
          </Button>
        </div>
      )}

      {!loading && !error && summary && (
        <div className="mt-6 space-y-6">
          <section>
            <h4 className="text-sm font-semibold text-foreground">Active modules</h4>
            {grantedModules.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {grantedModules.map((module, index) => (
                  <Tag
                    key={module.id}
                    label={module.label}
                    color={accessTagColor(index)}
                    statusIndicator="green"
                    title={module.view ? `Primary view: ${module.view}` : undefined}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                This user has not been granted access to any operational modules yet.
              </p>
            )}
          </section>

          <section>
            <h4 className="text-sm font-semibold text-foreground">Currently locked</h4>
            {lockedModules.length > 0 ? (
              <ul className="mt-2 space-y-2 text-sm">
                {lockedModules.map(module => (
                  <li key={module.id} className="rounded-md border border-dashed border-slate-300/60 p-3 dark:border-slate-700">
                    <div className="font-medium text-foreground">{module.label}</div>
                    {module.reason && <p className="text-xs text-muted-foreground">{module.reason}</p>}
                    {summary.deniedModules.find(gap => gap.id === module.id)?.recommendation && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Action: {summary.deniedModules.find(gap => gap.id === module.id)!.recommendation}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">All platform capabilities are available for this user.</p>
            )}
          </section>

          {summary.recommendedActions.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-foreground">Recommended next steps</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {summary.recommendedActions.map((action, index) => (
                  <li key={`${action}-${index}`}>{action}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">Role:</span> {summary.role.replace(/_/g, ' ')}
            </div>
            <div>
              <span className="font-semibold text-foreground">Permissions granted:</span> {summary.permissions.length}
            </div>
            {summary.availableViews.length > 0 && (
              <div>
                <span className="font-semibold text-foreground">Available views:</span> {summary.availableViews.join(', ')}
              </div>
            )}
          </section>
        </div>
      )}
    </Card>
  );
};

export default UserAccessSummaryCard;
