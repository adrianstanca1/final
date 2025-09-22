import { useCallback, useEffect, useRef, useState } from 'react';
import { backendGateway } from '../services/backendGateway';
import { DashboardSnapshot, User } from '../types';

export type UseDashboardSnapshotOptions = {
  enabled?: boolean;
};

export type UseDashboardSnapshotResult = {
  snapshot: DashboardSnapshot | null;
  loading: boolean;
  error: Error | null;
  refresh: (forceRefresh?: boolean) => Promise<void>;
};

export const useDashboardSnapshot = (
  user: User | null | undefined,
  options: UseDashboardSnapshotOptions = {},
): UseDashboardSnapshotResult => {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id || !user.companyId) {
        return;
      }

      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const data = await backendGateway.getDashboardSnapshot({
          userId: user.id,
          companyId: user.companyId,
          signal: controller.signal,
          forceRefresh,
        });
        if (!controller.signal.aborted) {
          setSnapshot(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err as Error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [user?.id, user?.companyId],
  );

  useEffect(() => {
    if (options.enabled === false) {
      return;
    }
    void refresh();
    return () => abortRef.current?.abort();
  }, [options.enabled, refresh]);

  return {
    snapshot,
    loading,
    error,
    refresh,
  };
};

