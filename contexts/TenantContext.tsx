import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TenantDirectoryEntry, Role } from '../types';
import { api } from '../services/mockApi';
import { useAuth } from './AuthContext';

interface TenantContextValue {
  tenants: TenantDirectoryEntry[];
  activeTenantId: string | null;
  activeTenant: TenantDirectoryEntry | null;
  /**
   * The tenant identifier associated with the authenticated user.
   * This is used as a fallback when no explicit tenant has been selected.
   */
  defaultTenantId: string | null;
  /**
   * The effective tenant id that components should scope their requests by.
   * When a tenant has been explicitly selected it is returned, otherwise the
   * authenticated user's company id is used (if available).
   */
  resolvedTenantId: string | null;
  setActiveTenantId: (tenantId: string) => void;
  refreshTenants: () => Promise<void>;
  loading: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenants: [],
  activeTenantId: null,
  activeTenant: null,
  defaultTenantId: null,
  resolvedTenantId: null,
  setActiveTenantId: () => undefined,
  refreshTenants: async () => undefined,
  loading: false,
});

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [tenants, setTenants] = useState<TenantDirectoryEntry[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hydrateTenants = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setTenants([]);
      setActiveTenantId(null);
      return;
    }

    setLoading(true);
    try {
      const directory = await api.getTenantDirectory();
      const accessible = directory.filter(entry => {
        if (user.role === Role.PRINCIPAL_ADMIN) {
          return true;
        }
        if (user.companyId) {
          return entry.companyId === user.companyId;
        }
        return false;
      });

      setTenants(accessible);

      if (accessible.length === 0) {
        setActiveTenantId(null);
        return;
      }

      setActiveTenantId(previous => {
        if (previous && accessible.some(entry => entry.companyId === previous)) {
          return previous;
        }
        if (user.companyId && accessible.some(entry => entry.companyId === user.companyId)) {
          return user.companyId;
        }
        return accessible[0].companyId;
      });
    } catch (error) {
      console.error('Failed to load tenant directory', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    hydrateTenants();
  }, [hydrateTenants]);

  useEffect(() => {
    if (!user) {
      setActiveTenantId(null);
      setTenants([]);
    }
  }, [user]);

  const selectTenant = useCallback(
    (tenantId: string) => {
      setActiveTenantId(previous => {
        if (previous === tenantId) {
          return previous;
        }
        return tenants.some(entry => entry.companyId === tenantId) ? tenantId : previous;
      });
    },
    [tenants]
  );

  const defaultTenantId = user?.companyId ?? null;
  const resolvedTenantId = activeTenantId ?? defaultTenantId;

  const value = useMemo<TenantContextValue>(() => ({
    tenants,
    activeTenantId,
    activeTenant: tenants.find(entry => entry.companyId === activeTenantId) ?? null,
    defaultTenantId,
    resolvedTenantId,
    setActiveTenantId: selectTenant,
    refreshTenants: hydrateTenants,
    loading,
  }), [tenants, activeTenantId, defaultTenantId, resolvedTenantId, selectTenant, hydrateTenants, loading]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => useContext(TenantContext);
