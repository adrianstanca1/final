import { api } from './mockApi';
import { computeProjectPortfolioSummary } from '../utils/projectPortfolio';
import { withRetry, DEFAULT_RETRY_CONFIGS } from '../utils/errorHandling';
import { getStorage } from '../utils/storage';
import {
  AuditLog,
  BackendConnectionState,
  DashboardSnapshot,
  OperationalInsights,
  Project,
  ResourceAssignment,
  SafetyIncident,
  Todo,
  User,
  Expense,
  Role,
  Equipment,
} from '../types';
import {
  getAuthConnectionInfo,
  subscribeToAuthClientChanges,
} from './authClient';

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

class BackendUnavailableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

type SnapshotParams = {
  userId: string;
  companyId: string;
  signal?: AbortSignal;
  forceRefresh?: boolean;
};

const ensureLeadingSlash = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const sortActivityLog = (logs: AuditLog[]): AuditLog[] =>
  [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

const filterOperationalTeam = (users: User[]): User[] =>
  users.filter(user => user.role !== Role.PRINCIPAL_ADMIN);

const filterEquipmentUsingAssignments = (
  assignments: ResourceAssignment[],
  equipment: Equipment[],
) => {
  const assignedIds = new Set(
    assignments
      .filter(assignment => assignment.resourceType === 'equipment')
      .map(assignment => assignment.resourceId),
  );

  if (assignedIds.size === 0) {
    return equipment;
  }

  return equipment.filter(item => assignedIds.has(item.id));
};

const nowIso = () => new Date().toISOString();

class BackendGateway {
  private static instance: BackendGateway | null = null;

  private connectionInfo = getAuthConnectionInfo();
  private state: BackendConnectionState = {
    mode: this.connectionInfo.mode,
    baseUrl: this.connectionInfo.baseUrl,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    pendingMutations: 0,
    lastSync: null,
  };

  private readonly listeners = new Set<(state: BackendConnectionState) => void>();

  private failureCount = 0;
  private lastFailureAt: number | null = null;
  private readonly CIRCUIT_BREAK_THRESHOLD = 3;
  private readonly CIRCUIT_BREAK_WINDOW_MS = 30_000; // 30s window
  private readonly CIRCUIT_OPEN_MS = 15_000; // half-open after 15s

  private constructor() {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    subscribeToAuthClientChanges(() => this.refreshConnectionInfo());
  }

  static getInstance(): BackendGateway {
    if (!BackendGateway.instance) {
      BackendGateway.instance = new BackendGateway();
    }
    return BackendGateway.instance;
  }

  static resetForTests() {
    if (BackendGateway.instance) {
      BackendGateway.instance.dispose();
    }
    BackendGateway.instance = null;
  }

  getState(): BackendConnectionState {
    return { ...this.state };
  }

  subscribe(listener: (state: BackendConnectionState) => void): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getState());
    } catch (error) {
      console.error('[backendGateway] listener threw on subscribe', error);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  async getDashboardSnapshot(params: SnapshotParams): Promise<DashboardSnapshot> {
    const { userId, companyId, signal } = params;

    if (!userId || !companyId) {
      throw new Error('Both userId and companyId are required to load dashboard data.');
    }

    let snapshot: DashboardSnapshot | null = null;
    let fetchedFromBackend = false;

    if (this.connectionInfo.mode === 'backend' && this.connectionInfo.baseUrl && this.state.online) {
      try {
        const query = new URLSearchParams({ userId, companyId }).toString();
        const remote = await withRetry(
          () => this.fetchFromBackend<partialDashboardSnapshot>(
            `/app/dashboard/snapshot?${query}`,
            { method: 'GET', signal },
          ),
          {
            ...DEFAULT_RETRY_CONFIGS.api,
            maxAttempts: 3,
          },
          {
            operation: 'fetch_dashboard_snapshot',
            component: 'backendGateway',
            timestamp: new Date().toISOString(),
            metadata: { userId, companyId },
          }
        );
        if (remote && Array.isArray(remote.projects)) {
          snapshot = this.normaliseRemoteSnapshot(remote);
          fetchedFromBackend = true;
        }
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        this.setOnlineState(false);

        if (!this.connectionInfo.allowMockFallback) {
          throw new BackendUnavailableError(
            'The live operations service is currently unreachable. Please try again shortly.',
            error,
          );
        }
        console.warn('[backendGateway] Falling back to local mock snapshot.', error);
      }
    }

    if (!snapshot) {
      snapshot = await this.loadFromMock(params);
      snapshot.metadata.usedFallback = this.connectionInfo.mode === 'backend';
      snapshot.metadata.source = fetchedFromBackend ? 'backend' : 'mock';
    } else {
      snapshot.metadata.source = 'backend';
      snapshot.metadata.usedFallback = false;
    }

    this.setOnlineState(true);
    this.updateLastSync();
    return snapshot;
  }

  private async fetchFromBackend<T>(path: string, init: RequestInit): Promise<T> {
    if (!this.connectionInfo.baseUrl) {
      throw new BackendUnavailableError('No backend base URL configured.');
    }

    // Simple circuit-breaker: if multiple recent failures, short-circuit briefly
    const now = Date.now();
    if (this.failureCount >= this.CIRCUIT_BREAK_THRESHOLD && this.lastFailureAt) {
      const since = now - this.lastFailureAt;
      if (since < this.CIRCUIT_OPEN_MS) {
        throw new BackendUnavailableError('Backend temporarily unavailable (circuit open).');
      }
    }

    const url = `${this.connectionInfo.baseUrl}${ensureLeadingSlash(path)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const headers = new Headers(init.headers ?? {});
    // Inject Authorization token if present
    try {
      const storage = getStorage();
      const token = storage.getItem('token');
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch {/* ignore storage issues */}
    let response: Response;
    try {
      response = await fetch(url, { ...init, headers, signal: (init as any).signal ?? controller.signal });
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        this.failureCount++;
        this.lastFailureAt = now;
        clearTimeout(timeout);
        throw new BackendUnavailableError('Backend request timed out.', error);
      }
      this.failureCount++;
      this.lastFailureAt = now;
      clearTimeout(timeout);
      throw new BackendUnavailableError('Unable to reach the backend service.', error);
    }

    clearTimeout(timeout);
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let message = `Request failed with status ${response.status}`;
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        message = data?.message || data?.error || message;
      } else {
        const text = await response.text();
        if (text) {
          message = text;
        }
      }
      this.failureCount++;
      this.lastFailureAt = now;
      throw new BackendUnavailableError(message);
    }

    // success path: reset failure counters and online state
    this.failureCount = 0;
    this.setOnlineState(true);
    return response.json() as Promise<T>;
  }

  private async loadFromMock(params: SnapshotParams): Promise<DashboardSnapshot> {
    const { userId, companyId, signal } = params;

    const [projects, users, equipment, assignments, logs, insights] = await Promise.all([
      api.getProjectsByManager(userId, { signal }),
      api.getUsersByCompany(companyId, { signal }),
      api.getEquipmentByCompany(companyId, { signal }),
      api.getResourceAssignments(companyId, { signal }),
      api.getAuditLogsByCompany(companyId, { signal }),
      api.getOperationalInsights(companyId, { signal }),
    ]);

    const team = filterOperationalTeam(users);
    const activeProjectIds = new Set(
      projects
        .filter(project => (project.status ?? '').toString().toUpperCase() === 'ACTIVE')
        .map(project => project.id),
    );

    const tasks = await api.getTodosByProjectIds(Array.from(activeProjectIds), { signal });
    const focusedEquipment = filterEquipmentUsingAssignments(assignments, equipment);

    const [incidents, expenses] = await Promise.all([
      api.getSafetyIncidentsByCompany(companyId, { signal }),
      api.getExpensesByCompany(companyId, { signal }),
    ]);

    const portfolioSummary = computeProjectPortfolioSummary(projects);

    const metadata = {
      generatedAt: nowIso(),
      source: 'mock' as const,
      usedFallback: this.connectionInfo.mode === 'backend',
      projectCount: projects.length,
    };

    return {
      projects,
      team,
      equipment: focusedEquipment,
      tasks,
      activityLog: sortActivityLog(logs),
      operationalInsights: insights as OperationalInsights | null,
      incidents,
      expenses,
      portfolioSummary,
      metadata,
    };
  }

  private normaliseRemoteSnapshot(snapshot: partialDashboardSnapshot): DashboardSnapshot {
    const projects = Array.isArray(snapshot.projects) ? (snapshot.projects as Project[]) : [];
    const team = Array.isArray(snapshot.team) ? (snapshot.team as User[]) : [];
    const equipment = Array.isArray(snapshot.equipment) ? (snapshot.equipment as Equipment[]) : [];
    const tasks = Array.isArray(snapshot.tasks) ? (snapshot.tasks as Todo[]) : [];
    const activityLog = Array.isArray(snapshot.activityLog) ? (snapshot.activityLog as AuditLog[]) : [];
    const incidents = Array.isArray(snapshot.incidents) ? (snapshot.incidents as SafetyIncident[]) : [];
    const expenses = Array.isArray(snapshot.expenses) ? (snapshot.expenses as Expense[]) : [];

    return {
      projects,
      team: filterOperationalTeam(team as User[]),
      equipment,
      tasks,
      activityLog: sortActivityLog(activityLog),
      operationalInsights: (snapshot.operationalInsights as OperationalInsights) ?? null,
      incidents,
      expenses,
      portfolioSummary: snapshot.portfolioSummary ?? computeProjectPortfolioSummary(projects),
      metadata: {
        generatedAt: snapshot.metadata?.generatedAt ?? nowIso(),
        usedFallback: false,
        source: 'backend',
        projectCount: snapshot.metadata?.projectCount ?? projects.length,
      },
    };
  }

  private refreshConnectionInfo() {
    this.connectionInfo = getAuthConnectionInfo();
    this.state.mode = this.connectionInfo.mode;
    this.state.baseUrl = this.connectionInfo.baseUrl;
    this.emitState();
  }

  private updateLastSync() {
    this.state.lastSync = nowIso();
    this.emitState();
  }

  private setOnlineState(online: boolean) {
    if (this.state.online !== online) {
      this.state.online = online;
      this.emitState();
    }
  }

  private emitState() {
    const snapshot = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('[backendGateway] listener threw during emit', error);
      }
    });
  }

  private readonly handleOnline = () => {
    this.setOnlineState(true);
  };

  private readonly handleOffline = () => {
    this.setOnlineState(false);
  };

  private dispose() {
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
  }
}

type partialDashboardSnapshot = {
  projects?: Project[];
  team?: User[];
  equipment?: Equipment[];
  tasks?: Todo[];
  activityLog?: AuditLog[];
  operationalInsights?: OperationalInsights | null;
  incidents?: SafetyIncident[];
  expenses?: Expense[];
  portfolioSummary?: ReturnType<typeof computeProjectPortfolioSummary>;
  metadata?: {
    generatedAt?: string;
    projectCount?: number;
  };
};

export let backendGateway = BackendGateway.getInstance();

export const __resetBackendGatewayForTests = () => {
  BackendGateway.resetForTests();
  backendGateway = BackendGateway.getInstance();
};
