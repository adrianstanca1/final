import { api } from './mockApi.js';
import { analytics } from './analyticsService.js';
import { apiCache } from './cacheService.js';
import { getStorage } from '../utils/storage.js';
import { computeProjectPortfolioSummary } from '../utils/projectPortfolio.js';
import { ApiError } from './apiErrorHandler.js';
import { getAuthConnectionInfo, subscribeToAuthClientChanges } from './authClient.js';
import { Role } from '../types.js';
const QUEUE_STORAGE_KEY = 'asagents:backend:interaction-queue:v1';
const DASHBOARD_CACHE_TTL = 60 * 1000; // 1 minute
const isAbortError = (error) => error instanceof DOMException && error.name === 'AbortError';
const normaliseStatus = (status) => typeof status === 'string' ? status.toUpperCase() : '';
const asStringId = (value) => {
    if (value == null) {
        return null;
    }
    return String(value);
};
class BackendGateway {
    constructor() {
        this.connectionInfo = getAuthConnectionInfo();
        this.state = {
            mode: this.connectionInfo.mode,
            baseUrl: this.connectionInfo.baseUrl,
            online: typeof navigator === 'undefined' ? true : navigator.onLine,
            pendingMutations: 0,
            lastSync: null,
        };
        this.listeners = new Set();
        this.storage = getStorage();
        this.syncingQueue = false;
        this.handleOnline = () => {
            this.setState({ online: true });
            void this.syncQueuedInteractions();
        };
        this.handleOffline = () => {
            this.setState({ online: false });
        };
        this.queue = this.loadQueue();
        this.state.pendingMutations = this.queue.length;
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('online', this.handleOnline);
            window.addEventListener('offline', this.handleOffline);
        }
        subscribeToAuthClientChanges(() => this.refreshConnectionInfo());
        if (this.state.online && this.connectionInfo.mode === 'backend') {
            void this.syncQueuedInteractions();
        }
    }
    static getInstance() {
        if (!BackendGateway.instance) {
            BackendGateway.instance = new BackendGateway();
        }
        return BackendGateway.instance;
    }
    getState() {
        return { ...this.state };
    }
    subscribe(listener) {
        this.listeners.add(listener);
        try {
            listener({ ...this.state });
        }
        catch (error) {
            console.error('[backendGateway] listener threw during initial emit', error);
        }
        return () => {
            this.listeners.delete(listener);
        };
    }
    async getDashboardSnapshot(params) {
        const { userId, companyId, signal, forceRefresh = false } = params;
        if (!userId || !companyId) {
            throw new Error('Both userId and companyId are required to load dashboard data.');
        }
        const cacheKey = `dashboard:snapshot:${companyId}:${userId}`;
        if (!forceRefresh) {
            const cached = apiCache.get(cacheKey);
            if (cached) {
                return { ...cached, metadata: { ...cached.metadata } };
            }
        }
        const canUseBackend = this.connectionInfo.mode === 'backend' && !!this.connectionInfo.baseUrl;
        let snapshot = null;
        let usedBackend = false;
        let fallbackReason;
        if (canUseBackend && this.state.online) {
            try {
                const query = new URLSearchParams({ companyId, userId }).toString();
                const remote = await this.fetchFromBackend(`/app/dashboard/snapshot?${query}`, { method: 'GET', signal });
                if (remote && Array.isArray(remote.projects)) {
                    const metadata = {
                        projectCount: Array.isArray(remote.projects) ? remote.projects.length : undefined,
                        ...remote.metadata,
                        source: 'backend',
                        generatedAt: remote.metadata?.generatedAt ?? new Date().toISOString(),
                        usedFallback: false,
                    };
                    snapshot = {
                        projects: remote.projects,
                        team: (remote.team ?? []),
                        equipment: (remote.equipment ?? []),
                        tasks: (remote.tasks ?? []),
                        activityLog: (remote.activityLog ?? []),
                        operationalInsights: (remote.operationalInsights ?? null),
                        incidents: (remote.incidents ?? []),
                        expenses: (remote.expenses ?? []),
                        portfolioSummary: remote.portfolioSummary ?? computeProjectPortfolioSummary(remote.projects),
                        metadata,
                    };
                    usedBackend = true;
                }
            }
            catch (error) {
                if (isAbortError(error)) {
                    throw error;
                }
                console.warn('[backendGateway] backend snapshot fetch failed, using local data instead.', error);
                if (error instanceof Error && error.message) {
                    fallbackReason = `Backend request failed: ${error.message}`.slice(0, 200);
                }
                else {
                    fallbackReason = 'Backend request failed due to an unknown error.';
                }
            }
        }
        else if (!canUseBackend) {
            fallbackReason = 'No backend connection configured.';
        }
        else if (!this.state.online) {
            fallbackReason = 'Offline: using locally cached data.';
        }
        if (!snapshot) {
            snapshot = await this.buildLocalSnapshot({ userId, companyId, signal });
        }
        const existingMetadata = snapshot.metadata ?? {};
        snapshot.metadata = {
            ...existingMetadata,
            projectCount: existingMetadata.projectCount ?? snapshot.projects.length,
            generatedAt: existingMetadata.generatedAt ?? new Date().toISOString(),
            source: usedBackend ? 'backend' : 'mock',
            usedFallback: usedBackend ? existingMetadata.usedFallback ?? false : true,
            fallbackReason: usedBackend
                ? existingMetadata.fallbackReason
                : fallbackReason ?? existingMetadata.fallbackReason,
        };
        apiCache.set(cacheKey, snapshot, DASHBOARD_CACHE_TTL);
        this.setState({ lastSync: snapshot.metadata.generatedAt });
        try {
            analytics.track?.('dashboard_snapshot_loaded', {
                source: snapshot.metadata.source,
                project_count: snapshot.metadata.projectCount,
                used_fallback: snapshot.metadata.usedFallback,
                fallback_reason: snapshot.metadata.fallbackReason ?? null,
            });
        }
        catch (error) {
            console.warn('[backendGateway] analytics tracking failed', error);
        }
        return snapshot;
    }
    async recordInteraction(event) {
        const enriched = {
            ...event,
            id: event.id ?? this.generateId(),
            createdAt: event.createdAt ?? new Date().toISOString(),
            attempts: 0,
        };
        if (this.connectionInfo.mode === 'backend' && this.connectionInfo.baseUrl && this.state.online) {
            try {
                await this.sendInteractionToBackend(enriched);
                this.setState({ lastSync: enriched.createdAt ?? new Date().toISOString() });
                analytics.track?.('backend_interaction_sent', {
                    type: enriched.type,
                    queued: false,
                });
                return;
            }
            catch (error) {
                if (isAbortError(error)) {
                    throw error;
                }
                console.warn('[backendGateway] failed to deliver interaction, queueing for retry', error);
            }
        }
        this.queue.push({ ...enriched });
        this.enforceQueueLimit();
        this.persistQueue();
        this.setState({ pendingMutations: this.queue.length });
        analytics.track?.('backend_interaction_queued', {
            type: enriched.type,
            pending: this.queue.length,
        });
        if (this.connectionInfo.mode === 'backend' && this.connectionInfo.baseUrl && this.state.online) {
            void this.syncQueuedInteractions();
        }
    }
    clearInteractionQueue() {
        this.queue = [];
        this.persistQueue();
        this.setState({ pendingMutations: 0 });
    }
    async buildLocalSnapshot(params) {
        const { userId, companyId, signal } = params;
        const safeCall = async (promise, fallback) => {
            try {
                return await promise;
            }
            catch (error) {
                if (isAbortError(error)) {
                    throw error;
                }
                console.warn('[backendGateway] local snapshot call failed, using fallback value.', error);
                return fallback;
            }
        };
        const [projects, users, equipment, assignments, logs, insights,] = await Promise.all([
            safeCall(api.getProjectsByManager(userId, { signal }), []),
            safeCall(api.getUsersByCompany(companyId, { signal }), []),
            safeCall(api.getEquipmentByCompany(companyId, { signal }), []),
            safeCall(api.getResourceAssignments(companyId, { signal }), []),
            safeCall(api.getAuditLogsByCompany(companyId, { signal }), []),
            safeCall(api
                .getOperationalInsights(companyId, { signal })
                .then(result => result), null),
        ]);
        const activeProjectIds = new Set(projects
            .filter(project => normaliseStatus(project.status) === 'ACTIVE')
            .map(project => String(project.id)));
        const projectIds = new Set(projects.map(project => String(project.id)));
        const tasks = activeProjectIds.size
            ? await safeCall(api.getTodosByProjectIds(Array.from(activeProjectIds), { signal }), [])
            : [];
        const [incidents, expenses] = await Promise.all([
            safeCall(api.getSafetyIncidentsByCompany(companyId, { signal }), []),
            safeCall(api.getExpensesByCompany(companyId, { signal }), []),
        ]);
        const equipmentAssignments = assignments.filter(assignment => {
            if (assignment.resourceType !== 'equipment') {
                return false;
            }
            const projectId = asStringId(assignment.projectId);
            return projectId != null && activeProjectIds.has(projectId);
        });
        const assignedEquipmentIds = new Set(equipmentAssignments.map(assignment => String(assignment.resourceId)));
        const filteredEquipment = assignedEquipmentIds.size > 0
            ? equipment.filter(item => assignedEquipmentIds.has(String(item.id)))
            : equipment;
        const filteredTeam = users.filter(user => user.role !== Role.PRINCIPAL_ADMIN);
        const activityLog = logs
            .filter(log => typeof log.action === 'string' && log.action.toLowerCase().includes('task'))
            .sort((a, b) => new Date(b.timestamp ?? '').getTime() - new Date(a.timestamp ?? '').getTime())
            .slice(0, 50);
        const scopedIncidents = incidents.filter(incident => {
            if (incident.companyId) {
                return String(incident.companyId) === companyId;
            }
            if (incident.projectId) {
                return projectIds.has(String(incident.projectId));
            }
            return true;
        });
        const snapshot = {
            projects,
            team: filteredTeam,
            equipment: filteredEquipment,
            tasks,
            activityLog,
            operationalInsights: insights ?? null,
            incidents: scopedIncidents,
            expenses,
            portfolioSummary: computeProjectPortfolioSummary(projects),
            metadata: {
                source: 'mock',
                generatedAt: new Date().toISOString(),
                usedFallback: true,
                projectCount: projects.length,
            },
        };
        return snapshot;
    }
    async fetchFromBackend(path, init = {}) {
        if (!this.connectionInfo.baseUrl) {
            throw new ApiError('No backend configured', 503);
        }
        const url = `${this.connectionInfo.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        const { signal, ...rest } = init;
        const controller = new AbortController();
        const abortListener = () => controller.abort();
        const timeoutId = setTimeout(() => controller.abort(), 30_000);
        if (signal) {
            if (signal.aborted) {
                clearTimeout(timeoutId);
                throw new DOMException('Aborted', 'AbortError');
            }
            signal.addEventListener('abort', abortListener);
        }
        try {
            const response = await fetch(url, {
                ...rest,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(rest.headers ?? {}),
                },
                signal: controller.signal,
            });
            if (!response.ok) {
                let errorBody = null;
                try {
                    errorBody = await response.json();
                }
                catch {
                    // Ignore JSON parsing issues
                }
                throw new ApiError(errorBody?.message || `HTTP ${response.status}`, response.status, errorBody?.code, errorBody);
            }
            if (response.status === 204) {
                return null;
            }
            const text = await response.text();
            if (!text) {
                return null;
            }
            try {
                return JSON.parse(text);
            }
            catch (error) {
                console.warn('[backendGateway] failed to parse backend response as JSON, returning raw text', error);
                return text;
            }
        }
        catch (error) {
            if (isAbortError(error)) {
                throw error;
            }
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError(error instanceof Error ? error.message : 'Failed to reach backend service', 503);
        }
        finally {
            clearTimeout(timeoutId);
            if (signal) {
                signal.removeEventListener('abort', abortListener);
            }
        }
    }
    async sendInteractionToBackend(interaction) {
        const { attempts, lastError, ...payload } = interaction;
        await this.fetchFromBackend('/app/interactions', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
    async syncQueuedInteractions() {
        if (this.syncingQueue) {
            return;
        }
        if (!this.queue.length) {
            return;
        }
        if (this.connectionInfo.mode !== 'backend' || !this.connectionInfo.baseUrl || !this.state.online) {
            return;
        }
        this.syncingQueue = true;
        try {
            while (this.queue.length > 0) {
                const current = this.queue[0];
                try {
                    await this.sendInteractionToBackend(current);
                    this.queue.shift();
                    this.persistQueue();
                    this.setState({ pendingMutations: this.queue.length, lastSync: current.createdAt ?? new Date().toISOString() });
                }
                catch (error) {
                    if (isAbortError(error)) {
                        throw error;
                    }
                    current.attempts += 1;
                    current.lastError = error instanceof Error ? error.message : String(error);
                    this.persistQueue();
                    if (current.attempts >= 3) {
                        console.error('[backendGateway] dropping interaction after repeated failures', current);
                        this.queue.shift();
                        this.persistQueue();
                        this.setState({ pendingMutations: this.queue.length });
                        continue;
                    }
                    console.warn('[backendGateway] interaction sync failed, will retry later', error);
                    break;
                }
            }
        }
        finally {
            this.syncingQueue = false;
        }
    }
    refreshConnectionInfo() {
        this.connectionInfo = getAuthConnectionInfo();
        this.setState({ mode: this.connectionInfo.mode, baseUrl: this.connectionInfo.baseUrl });
        if (this.connectionInfo.mode === 'backend' && this.state.online) {
            void this.syncQueuedInteractions();
        }
    }
    setState(patch) {
        this.state = { ...this.state, ...patch };
        this.emitState();
    }
    emitState() {
        const snapshot = { ...this.state };
        this.listeners.forEach(listener => {
            try {
                listener(snapshot);
            }
            catch (error) {
                console.error('[backendGateway] state listener threw an error', error);
            }
        });
    }
    loadQueue() {
        try {
            const stored = this.storage.getItem(QUEUE_STORAGE_KEY);
            if (!stored) {
                return [];
            }
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed
                .map((entry) => ({
                id: entry.id ?? this.generateId(),
                type: entry.type ?? 'unknown',
                userId: entry.userId,
                companyId: entry.companyId,
                context: entry.context ?? {},
                createdAt: entry.createdAt ?? new Date().toISOString(),
                metadata: entry.metadata ?? {},
                attempts: entry.attempts ?? 0,
                lastError: entry.lastError,
            }))
                .slice(-100);
        }
        catch (error) {
            console.warn('[backendGateway] failed to restore interaction queue from storage', error);
            return [];
        }
    }
    persistQueue() {
        try {
            this.storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
        }
        catch (error) {
            console.warn('[backendGateway] failed to persist interaction queue', error);
        }
    }
    enforceQueueLimit(limit = 100) {
        if (this.queue.length <= limit) {
            return;
        }
        this.queue.splice(0, this.queue.length - limit);
        this.persistQueue();
    }
    generateId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `queue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
}
export const backendGateway = BackendGateway.getInstance();
//# sourceMappingURL=backendGateway.js.map