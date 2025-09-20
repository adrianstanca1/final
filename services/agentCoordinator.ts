/**
 * Multi-Agent Coordination Framework
 * Prevents conflicts between multiple coding agents working simultaneously
 */

import { EventEmitter } from 'events';
import { getStorage } from '../utils/storage';

export interface Agent {
  id: string;
  name: string;
  type: 'primary' | 'specialist' | 'reviewer';
  capabilities: AgentCapability[];
  status: AgentStatus;
  currentTask?: Task;
  lastActivity: number;
}

export interface AgentCapability {
  domain: string; // 'frontend', 'backend', 'deployment', 'testing'
  modules: string[]; // Specific file patterns or directories
  operations: OperationType[]; // 'read', 'write', 'create', 'delete'
}

export interface Task {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  dependencies: string[];
  assignedAgentId?: string;
  status: TaskStatus;
  resourceLocks: ResourceLock[];
  startTime?: number;
  endTime?: number;
}

export interface ResourceLock {
  resourcePath: string;
  lockType: 'read' | 'write' | 'exclusive';
  agentId: string;
  timestamp: number;
  expiresAt: number;
}

export interface ConflictResolution {
  conflictId: string;
  strategy: 'merge' | 'overwrite' | 'manual' | 'delegate';
  resolvedBy: string;
  resolution: any;
  timestamp: number;
}

export type AgentStatus = 'idle' | 'busy' | 'waiting' | 'error' | 'offline';
export type TaskStatus = 'pending' | 'assigned' | 'in-progress' | 'blocked' | 'completed' | 'failed';
export type OperationType = 'read' | 'write' | 'create' | 'delete' | 'modify';

interface CoordinatorState {
  agents: Map<string, Agent>;
  tasks: Map<string, Task>;
  resourceLocks: Map<string, ResourceLock>;
  conflictQueue: ConflictResolution[];
  sessionId: string;
}

export class AgentCoordinator extends EventEmitter {
  private state: CoordinatorState;
  private storage = getStorage();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly LOCK_TIMEOUT = 300000; // 5 minutes
  private readonly STATE_KEY = 'asagents:coordinator:state:v1';

  constructor() {
    super();
    this.state = this.loadState();
    this.startHeartbeat();
    this.cleanupExpiredLocks();
  }

  // Agent Management
  registerAgent(agent: Omit<Agent, 'lastActivity' | 'status'>): Agent {
    const fullAgent: Agent = {
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

  unregisterAgent(agentId: string): void {
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

  updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this.state.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastActivity = Date.now();
      this.saveState();
      this.emit('agentStatusChanged', agent);
    }
  }

  // Task Management
  createTask(taskData: Omit<Task, 'id' | 'status' | 'resourceLocks'>): Task {
    const task: Task = {
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

  assignTask(taskId: string, agentId: string): boolean {
    const task = this.state.tasks.get(taskId);
    const agent = this.state.agents.get(agentId);
    
    if (!task || !agent) return false;
    if (task.status !== 'pending') return false;
    if (agent.status !== 'idle') return false;
    
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

  completeTask(taskId: string, agentId: string, result?: any): boolean {
    const task = this.state.tasks.get(taskId);
    const agent = this.state.agents.get(agentId);
    
    if (!task || !agent || task.assignedAgentId !== agentId) return false;
    
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
  requestResourceLock(agentId: string, resourcePath: string, lockType: 'read' | 'write' | 'exclusive'): boolean {
    const agent = this.state.agents.get(agentId);
    if (!agent) return false;
    
    // Check for conflicting locks
    const existingLock = this.state.resourceLocks.get(resourcePath);
    if (existingLock && !this.isLockCompatible(existingLock, lockType)) {
      console.log(`🔒 Resource lock conflict: ${resourcePath} (requested by ${agentId})`);
      return false;
    }
    
    const lock: ResourceLock = {
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

  releaseResourceLock(agentId: string, resourcePath: string): void {
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
  reportConflict(conflictData: {
    resourcePath: string;
    conflictingAgents: string[];
    description: string;
    localState?: any;
    remoteState?: any;
  }): ConflictResolution {
    const conflict: ConflictResolution = {
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
  private loadState(): CoordinatorState {
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
      } catch (error) {
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

  private saveState(): void {
    const serializable = {
      agents: Array.from(this.state.agents.entries()),
      tasks: Array.from(this.state.tasks.entries()),
      resourceLocks: Array.from(this.state.resourceLocks.entries()),
      conflictQueue: this.state.conflictQueue,
      sessionId: this.state.sessionId,
    };
    
    this.storage.setItem(this.STATE_KEY, JSON.stringify(serializable));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  private performHeartbeat(): void {
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

  private cleanupExpiredLocks(): void {
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

  private agentCanHandleTask(agent: Agent, task: Task): boolean {
    // Simple capability matching - can be enhanced
    return agent.capabilities.some(cap =>
      task.resourceLocks.some(lock =>
        lock.resourcePath.startsWith(cap.domain) ||
        cap.modules.some(module => lock.resourcePath.includes(module))
      )
    );
  }

  private areTaskDependenciesMet(task: Task): boolean {
    return task.dependencies.every(depId => {
      const depTask = this.state.tasks.get(depId);
      return depTask?.status === 'completed';
    });
  }

  private acquireTaskLocks(task: Task, agentId: string): boolean {
    const lockRequests = this.inferRequiredLocks(task);
    
    // Check if all locks can be acquired
    for (const request of lockRequests) {
      if (!this.canAcquireLock(request.resourcePath, request.lockType)) {
        return false;
      }
    }
    
    // Acquire all locks
    for (const request of lockRequests) {
      const lock: ResourceLock = {
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

  private inferRequiredLocks(task: Task): Array<{ resourcePath: string; lockType: 'read' | 'write' | 'exclusive' }> {
    // This would analyze the task description to determine required file locks
    // For now, using simple heuristics
    const locks: Array<{ resourcePath: string; lockType: 'read' | 'write' | 'exclusive' }> = [];
    
    if (task.description.toLowerCase().includes('modify') || task.description.toLowerCase().includes('edit')) {
      locks.push({ resourcePath: this.extractResourceFromDescription(task.description), lockType: 'write' });
    } else if (task.description.toLowerCase().includes('read') || task.description.toLowerCase().includes('analyze')) {
      locks.push({ resourcePath: this.extractResourceFromDescription(task.description), lockType: 'read' });
    }
    
    return locks;
  }

  private extractResourceFromDescription(description: string): string {
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

  private canAcquireLock(resourcePath: string, lockType: 'read' | 'write' | 'exclusive'): boolean {
    const existingLock = this.state.resourceLocks.get(resourcePath);
    return !existingLock || this.isLockCompatible(existingLock, lockType);
  }

  private isLockCompatible(existingLock: ResourceLock, requestedType: 'read' | 'write' | 'exclusive'): boolean {
    if (existingLock.lockType === 'exclusive' || requestedType === 'exclusive') {
      return false;
    }
    if (existingLock.lockType === 'write' || requestedType === 'write') {
      return false;
    }
    // Read locks are compatible with each other
    return true;
  }

  private releaseTaskLocks(task: Task): void {
    for (const lock of task.resourceLocks) {
      this.state.resourceLocks.delete(lock.resourcePath);
    }
    task.resourceLocks = [];
  }

  private releaseAgentLocks(agentId: string): void {
    const locksToRelease: string[] = [];
    
    for (const [path, lock] of this.state.resourceLocks) {
      if (lock.agentId === agentId) {
        locksToRelease.push(path);
      }
    }
    
    for (const path of locksToRelease) {
      this.state.resourceLocks.delete(path);
    }
  }

  private reassignTask(taskId: string): void {
    const task = this.state.tasks.get(taskId);
    if (task) {
      task.assignedAgentId = undefined;
      task.status = 'pending';
      this.tryAssignTask(taskId);
    }
  }

  private tryAssignTask(taskId: string): void {
    const task = this.state.tasks.get(taskId);
    if (!task || task.status !== 'pending') return;
    
    // Find suitable agent
    for (const [agentId, agent] of this.state.agents) {
      if (agent.status === 'idle' && this.agentCanHandleTask(agent, task)) {
        if (this.assignTask(taskId, agentId)) {
          break;
        }
      }
    }
  }

  private scheduleNextTasks(): void {
    // Re-evaluate all pending tasks
    for (const [taskId, task] of this.state.tasks) {
      if (task.status === 'pending' || task.status === 'blocked') {
        this.tryAssignTask(taskId);
      }
    }
  }

  private determineResolutionStrategy(conflictData: any): 'merge' | 'overwrite' | 'manual' | 'delegate' {
    // Simple strategy determination - can be enhanced with ML
    if (conflictData.resourcePath.endsWith('.json')) {
      return 'merge';
    } else if (conflictData.resourcePath.endsWith('.ts') || conflictData.resourcePath.endsWith('.tsx')) {
      return 'manual';
    } else {
      return 'delegate';
    }
  }

  private attemptConflictResolution(conflict: ConflictResolution, conflictData: any): void {
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

  private attemptJsonMerge(conflict: ConflictResolution, conflictData: any): void {
    try {
      const local = JSON.parse(conflictData.localState);
      const remote = JSON.parse(conflictData.remoteState);
      const merged = { ...local, ...remote };
      
      conflict.resolution = JSON.stringify(merged, null, 2);
      conflict.resolvedBy = 'auto-merge';
      
      console.log(`🔀 Auto-merged conflict ${conflict.conflictId}`);
    } catch (error) {
      console.error(`Failed to auto-merge conflict ${conflict.conflictId}:`, error);
    }
  }

  private useNewestVersion(conflict: ConflictResolution, conflictData: any): void {
    // Use the remote version as it's typically newer
    conflict.resolution = conflictData.remoteState;
    conflict.resolvedBy = 'auto-newest';
    
    console.log(`🕐 Used newest version for conflict ${conflict.conflictId}`);
  }

  private delegateToReviewer(conflict: ConflictResolution, conflictData: any): void {
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

  getAgentById(agentId: string): Agent | undefined {
    return this.state.agents.get(agentId);
  }

  getTaskById(taskId: string): Task | undefined {
    return this.state.tasks.get(taskId);
  }

  isResourceLocked(resourcePath: string): boolean {
    return this.state.resourceLocks.has(resourcePath);
  }

  getResourceLock(resourcePath: string): ResourceLock | undefined {
    return this.state.resourceLocks.get(resourcePath);
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.removeAllListeners();
  }
}

// Singleton instance
export const agentCoordinator = new AgentCoordinator();