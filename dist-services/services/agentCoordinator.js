/**
 * Multi-Agent Coordination Framework
 * Prevents conflicts between multiple coding agents working simultaneously
 */
import { EventEmitter } from 'events';
import { getStorage } from '../utils/storage.js';
export class AgentCoordinator extends EventEmitter {
    constructor() {
        super();
        this.storage = getStorage();
        this.heartbeatInterval = null;
        this.HEARTBEAT_INTERVAL = 30000; // 30 seconds
        this.LOCK_TIMEOUT = 300000; // 5 minutes
        this.STATE_KEY = 'asagents:coordinator:state:v1';
        this.state = this.loadState();
        this.startHeartbeat();
        this.cleanupExpiredLocks();
    }
    // Agent Management
    registerAgent(agent) {
        const fullAgent = {
            ...agent,
            status: 'idle',
            lastActivity: Date.now(),
        };
        this.state.agents.set(agent.id, fullAgent);
        this.saveState();
        this.emit('agentRegistered', fullAgent);
        console.log(`🤖 Agent registered: ${agent.name} (${agent.id})`);
        return fullAgent;
    }
    unregisterAgent(agentId) {
        const agent = this.state.agents.get(agentId);
        if (agent) {
            // Release all locks held by this agent
            this.releaseAgentLocks(agentId);
            // Reassign tasks if any
            if (agent.currentTask) {
                this.reassignTask(agent.currentTask.id);
            }
            this.state.agents.delete(agentId);
            this.saveState();
            this.emit('agentUnregistered', agent);
            console.log(`🤖 Agent unregistered: ${agent.name} (${agentId})`);
        }
    }
    updateAgentStatus(agentId, status) {
        const agent = this.state.agents.get(agentId);
        if (agent) {
            agent.status = status;
            agent.lastActivity = Date.now();
            this.saveState();
            this.emit('agentStatusChanged', agent);
        }
    }
    // Task Management
    createTask(taskData) {
        const task = {
            ...taskData,
            id: this.generateId(),
            status: 'pending',
            resourceLocks: [],
        };
        this.state.tasks.set(task.id, task);
        this.saveState();
        this.emit('taskCreated', task);
        console.log(`📋 Task created: ${task.description} (${task.id})`);
        // Try to assign immediately
        this.tryAssignTask(task.id);
        return task;
    }
    assignTask(taskId, agentId) {
        const task = this.state.tasks.get(taskId);
        const agent = this.state.agents.get(agentId);
        if (!task || !agent)
            return false;
        if (task.status !== 'pending')
            return false;
        if (agent.status !== 'idle')
            return false;
        // Check if agent has required capabilities
        if (!this.agentCanHandleTask(agent, task)) {
            console.log(`❌ Agent ${agentId} lacks capabilities for task ${taskId}`);
            return false;
        }
        // Check dependencies
        if (!this.areTaskDependenciesMet(task)) {
            console.log(`⏳ Task ${taskId} dependencies not met`);
            task.status = 'blocked';
            return false;
        }
        // Acquire necessary resource locks
        if (!this.acquireTaskLocks(task, agentId)) {
            console.log(`🔒 Could not acquire locks for task ${taskId}`);
            return false;
        }
        // Assign the task
        task.assignedAgentId = agentId;
        task.status = 'assigned';
        task.startTime = Date.now();
        agent.currentTask = task;
        agent.status = 'busy';
        this.saveState();
        this.emit('taskAssigned', { task, agent });
        console.log(`✅ Task ${taskId} assigned to agent ${agentId}`);
        return true;
    }
    completeTask(taskId, agentId, result) {
        const task = this.state.tasks.get(taskId);
        const agent = this.state.agents.get(agentId);
        if (!task || !agent || task.assignedAgentId !== agentId)
            return false;
        // Release resource locks
        this.releaseTaskLocks(task);
        // Update task and agent status
        task.status = 'completed';
        task.endTime = Date.now();
        agent.currentTask = undefined;
        agent.status = 'idle';
        this.saveState();
        this.emit('taskCompleted', { task, agent, result });
        console.log(`✅ Task completed: ${task.description} by ${agent.name}`);
        // Try to assign next tasks
        this.scheduleNextTasks();
        return true;
    }
    // Resource Lock Management
    requestResourceLock(agentId, resourcePath, lockType) {
        const agent = this.state.agents.get(agentId);
        if (!agent)
            return false;
        // Check for conflicting locks
        const existingLock = this.state.resourceLocks.get(resourcePath);
        if (existingLock && !this.isLockCompatible(existingLock, lockType)) {
            console.log(`🔒 Resource lock conflict: ${resourcePath} (requested by ${agentId})`);
            return false;
        }
        const lock = {
            resourcePath,
            lockType,
            agentId,
            timestamp: Date.now(),
            expiresAt: Date.now() + this.LOCK_TIMEOUT,
        };
        this.state.resourceLocks.set(resourcePath, lock);
        this.saveState();
        this.emit('lockAcquired', lock);
        console.log(`🔐 Lock acquired: ${resourcePath} (${lockType}) by ${agentId}`);
        return true;
    }
    releaseResourceLock(agentId, resourcePath) {
        const lock = this.state.resourceLocks.get(resourcePath);
        if (lock && lock.agentId === agentId) {
            this.state.resourceLocks.delete(resourcePath);
            this.saveState();
            this.emit('lockReleased', lock);
            console.log(`🔓 Lock released: ${resourcePath} by ${agentId}`);
            // Check if any waiting tasks can now proceed
            this.scheduleNextTasks();
        }
    }
    // Conflict Resolution
    reportConflict(conflictData) {
        const conflict = {
            conflictId: this.generateId(),
            strategy: this.determineResolutionStrategy(conflictData),
            resolvedBy: 'coordinator',
            resolution: null,
            timestamp: Date.now(),
        };
        this.state.conflictQueue.push(conflict);
        this.saveState();
        this.emit('conflictDetected', { conflict, data: conflictData });
        console.log(`⚠️ Conflict detected: ${conflictData.description}`);
        // Attempt automatic resolution
        this.attemptConflictResolution(conflict, conflictData);
        return conflict;
    }
    // Private Methods
    loadState() {
        const stored = this.storage.getItem(this.STATE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return {
                    agents: new Map(parsed.agents || []),
                    tasks: new Map(parsed.tasks || []),
                    resourceLocks: new Map(parsed.resourceLocks || []),
                    conflictQueue: parsed.conflictQueue || [],
                    sessionId: parsed.sessionId || this.generateId(),
                };
            }
            catch (error) {
                console.error('Failed to load coordinator state:', error);
            }
        }
        return {
            agents: new Map(),
            tasks: new Map(),
            resourceLocks: new Map(),
            conflictQueue: [],
            sessionId: this.generateId(),
        };
    }
    saveState() {
        const serializable = {
            agents: Array.from(this.state.agents.entries()),
            tasks: Array.from(this.state.tasks.entries()),
            resourceLocks: Array.from(this.state.resourceLocks.entries()),
            conflictQueue: this.state.conflictQueue,
            sessionId: this.state.sessionId,
        };
        this.storage.setItem(this.STATE_KEY, JSON.stringify(serializable));
    }
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.performHeartbeat();
        }, this.HEARTBEAT_INTERVAL);
    }
    performHeartbeat() {
        const now = Date.now();
        let changed = false;
        // Check for inactive agents
        for (const [agentId, agent] of this.state.agents) {
            if (now - agent.lastActivity > this.HEARTBEAT_INTERVAL * 3) {
                console.log(`💔 Agent ${agentId} appears inactive`);
                agent.status = 'offline';
                changed = true;
            }
        }
        // Clean up expired locks
        this.cleanupExpiredLocks();
        if (changed) {
            this.saveState();
        }
    }
    cleanupExpiredLocks() {
        const now = Date.now();
        let cleaned = false;
        for (const [path, lock] of this.state.resourceLocks) {
            if (lock.expiresAt < now) {
                this.state.resourceLocks.delete(path);
                cleaned = true;
                console.log(`🧹 Cleaned up expired lock: ${path}`);
            }
        }
        if (cleaned) {
            this.saveState();
            this.scheduleNextTasks();
        }
    }
    agentCanHandleTask(agent, task) {
        // Simple capability matching - can be enhanced
        return agent.capabilities.some(cap => task.resourceLocks.some(lock => lock.resourcePath.startsWith(cap.domain) ||
            cap.modules.some(module => lock.resourcePath.includes(module))));
    }
    areTaskDependenciesMet(task) {
        return task.dependencies.every(depId => {
            const depTask = this.state.tasks.get(depId);
            return depTask?.status === 'completed';
        });
    }
    acquireTaskLocks(task, agentId) {
        const lockRequests = this.inferRequiredLocks(task);
        // Check if all locks can be acquired
        for (const request of lockRequests) {
            if (!this.canAcquireLock(request.resourcePath, request.lockType)) {
                return false;
            }
        }
        // Acquire all locks
        for (const request of lockRequests) {
            const lock = {
                ...request,
                agentId,
                timestamp: Date.now(),
                expiresAt: Date.now() + this.LOCK_TIMEOUT,
            };
            task.resourceLocks.push(lock);
            this.state.resourceLocks.set(request.resourcePath, lock);
        }
        return true;
    }
    inferRequiredLocks(task) {
        // This would analyze the task description to determine required file locks
        // For now, using simple heuristics
        const locks = [];
        if (task.description.toLowerCase().includes('modify') || task.description.toLowerCase().includes('edit')) {
            locks.push({ resourcePath: this.extractResourceFromDescription(task.description), lockType: 'write' });
        }
        else if (task.description.toLowerCase().includes('read') || task.description.toLowerCase().includes('analyze')) {
            locks.push({ resourcePath: this.extractResourceFromDescription(task.description), lockType: 'read' });
        }
        return locks;
    }
    extractResourceFromDescription(description) {
        // Extract file paths from task description
        const patterns = [
            /\/[a-zA-Z0-9/_.-]+\.[a-zA-Z0-9]+/g, // File paths
            /[a-zA-Z0-9]+\.[a-zA-Z0-9]+/g, // Filenames
        ];
        for (const pattern of patterns) {
            const matches = description.match(pattern);
            if (matches && matches.length > 0) {
                return matches[0];
            }
        }
        return 'unknown';
    }
    canAcquireLock(resourcePath, lockType) {
        const existingLock = this.state.resourceLocks.get(resourcePath);
        return !existingLock || this.isLockCompatible(existingLock, lockType);
    }
    isLockCompatible(existingLock, requestedType) {
        if (existingLock.lockType === 'exclusive' || requestedType === 'exclusive') {
            return false;
        }
        if (existingLock.lockType === 'write' || requestedType === 'write') {
            return false;
        }
        // Read locks are compatible with each other
        return true;
    }
    releaseTaskLocks(task) {
        for (const lock of task.resourceLocks) {
            this.state.resourceLocks.delete(lock.resourcePath);
        }
        task.resourceLocks = [];
    }
    releaseAgentLocks(agentId) {
        const locksToRelease = [];
        for (const [path, lock] of this.state.resourceLocks) {
            if (lock.agentId === agentId) {
                locksToRelease.push(path);
            }
        }
        for (const path of locksToRelease) {
            this.state.resourceLocks.delete(path);
        }
    }
    reassignTask(taskId) {
        const task = this.state.tasks.get(taskId);
        if (task) {
            task.assignedAgentId = undefined;
            task.status = 'pending';
            this.tryAssignTask(taskId);
        }
    }
    tryAssignTask(taskId) {
        const task = this.state.tasks.get(taskId);
        if (!task || task.status !== 'pending')
            return;
        // Find suitable agent
        for (const [agentId, agent] of this.state.agents) {
            if (agent.status === 'idle' && this.agentCanHandleTask(agent, task)) {
                if (this.assignTask(taskId, agentId)) {
                    break;
                }
            }
        }
    }
    scheduleNextTasks() {
        // Re-evaluate all pending tasks
        for (const [taskId, task] of this.state.tasks) {
            if (task.status === 'pending' || task.status === 'blocked') {
                this.tryAssignTask(taskId);
            }
        }
    }
    determineResolutionStrategy(conflictData) {
        // Simple strategy determination - can be enhanced with ML
        if (conflictData.resourcePath.endsWith('.json')) {
            return 'merge';
        }
        else if (conflictData.resourcePath.endsWith('.ts') || conflictData.resourcePath.endsWith('.tsx')) {
            return 'manual';
        }
        else {
            return 'delegate';
        }
    }
    attemptConflictResolution(conflict, conflictData) {
        // Implement automatic conflict resolution strategies
        switch (conflict.strategy) {
            case 'merge':
                // Attempt JSON merge
                this.attemptJsonMerge(conflict, conflictData);
                break;
            case 'overwrite':
                // Use most recent version
                this.useNewestVersion(conflict, conflictData);
                break;
            case 'delegate':
                // Assign to a reviewer agent
                this.delegateToReviewer(conflict, conflictData);
                break;
            case 'manual':
            default:
                // Queue for manual resolution
                console.log(`🔄 Manual resolution required for conflict ${conflict.conflictId}`);
                break;
        }
    }
    attemptJsonMerge(conflict, conflictData) {
        try {
            const local = JSON.parse(conflictData.localState);
            const remote = JSON.parse(conflictData.remoteState);
            const merged = { ...local, ...remote };
            conflict.resolution = JSON.stringify(merged, null, 2);
            conflict.resolvedBy = 'auto-merge';
            console.log(`🔀 Auto-merged conflict ${conflict.conflictId}`);
        }
        catch (error) {
            console.error(`Failed to auto-merge conflict ${conflict.conflictId}:`, error);
        }
    }
    useNewestVersion(conflict, conflictData) {
        // Use the remote version as it's typically newer
        conflict.resolution = conflictData.remoteState;
        conflict.resolvedBy = 'auto-newest';
        console.log(`🕐 Used newest version for conflict ${conflict.conflictId}`);
    }
    delegateToReviewer(conflict, conflictData) {
        // Find a reviewer agent and assign the conflict resolution task
        for (const [agentId, agent] of this.state.agents) {
            if (agent.type === 'reviewer' && agent.status === 'idle') {
                const reviewTask = this.createTask({
                    description: `Resolve conflict in ${conflictData.resourcePath}`,
                    priority: 'high',
                    estimatedDuration: 300000, // 5 minutes
                    dependencies: [],
                });
                conflict.resolvedBy = agentId;
                console.log(`👥 Delegated conflict ${conflict.conflictId} to reviewer ${agentId}`);
                return;
            }
        }
        console.log(`❓ No reviewer available for conflict ${conflict.conflictId}`);
    }
    // Public API
    getState() {
        return {
            agents: Array.from(this.state.agents.values()),
            tasks: Array.from(this.state.tasks.values()),
            activeLocks: Array.from(this.state.resourceLocks.values()),
            conflicts: this.state.conflictQueue,
            sessionId: this.state.sessionId,
        };
    }
    getAgentById(agentId) {
        return this.state.agents.get(agentId);
    }
    getTaskById(taskId) {
        return this.state.tasks.get(taskId);
    }
    isResourceLocked(resourcePath) {
        return this.state.resourceLocks.has(resourcePath);
    }
    getResourceLock(resourcePath) {
        return this.state.resourceLocks.get(resourcePath);
    }
    destroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.removeAllListeners();
    }
}
// Singleton instance
export const agentCoordinator = new AgentCoordinator();
//# sourceMappingURL=agentCoordinator.js.map