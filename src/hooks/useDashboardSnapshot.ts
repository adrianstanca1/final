import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const query = useQuery<DashboardSnapshot, Error>({
    queryKey: ['dashboard', user?.id],
    enabled: Boolean(user?.id && user?.companyId) && options.enabled !== false,
    staleTime: 60_000,
    queryFn: ({ signal }) => {
      if (!user?.id || !user.companyId) {
        throw new Error('A user with an associated company is required to load dashboard data.');
      }
      return backendGateway.getDashboardSnapshot({
        userId: user.id,
        companyId: user.companyId,
        signal,
      });
    },
  });

  const refresh = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id || !user.companyId) {
        return;
      }

      if (forceRefresh) {
        const data = await backendGateway.getDashboardSnapshot({
          userId: user.id,
          companyId: user.companyId,
          forceRefresh,
        });
        queryClient.setQueryData(['dashboard', user.id], data);
        return;
      }

      await query.refetch();
    },
    [query, queryClient, user?.id, user?.companyId],
  );

  return {
    snapshot: query.data ?? null,
    loading: query.isInitialLoading,
    error: query.error ?? null,
    refresh,
  };
};
