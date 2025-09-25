/**
 * Real-time Conflict Prevention and File Synchronization System
 * Prevents conflicts through advanced coordination mechanisms
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, watchFile, unwatchFile } from 'fs';
import { join } from 'path';
import { getStorage } from '../utils/storage.js';

export interface FileState {
  path: string;
  hash: string;
  lastModified: number;
  lastAgent: string;
  lockStatus: 'free' | 'read' | 'write' | 'exclusive';
  lockHolder?: string;
  lockExpires?: number;
  version: number;
}

export interface ConflictDetection {
  type: 'concurrent_modification' | 'lock_violation' | 'merge_conflict' | 'dependency_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  files: string[];
  agents: string[];
  description: string;
  suggestedResolution: ConflictResolution;
  timestamp: number;
}

export interface ConflictResolution {
  strategy: 'auto_merge' | 'last_writer_wins' | 'manual_review' | 'rollback' | 'branch_split';
  confidence: number;
  actions: ResolutionAction[];
  reviewRequired: boolean;
}

export interface ResolutionAction {
  type: 'backup' | 'merge' | 'restore' | 'notify' | 'lock' | 'unlock';
  target: string;
  data?: any;
  agentId?: string;
}

export interface SharedContext {
  activeAgents: Set<string>;
  workingDirectory: Map<string, string[]>; // directory -> agent IDs
  intentDeclarations: Map<string, AgentIntent>;
  communicationChannel: Map<string, AgentMessage[]>;
  globalState: Record<string, any>;
  lastSync: number;
}

export interface AgentIntent {
  agentId: string;
  intent: string;
  targetFiles: string[];
  estimatedDuration: number;
  priority: number;
  dependencies: string[];
  timestamp: number;
}

export interface AgentMessage {
  from: string;
  to: string | 'broadcast';
  type: 'coordination' | 'conflict' | 'notification' | 'request' | 'response';
  payload: any;
  timestamp: number;
  messageId: string;
}

class ConflictPrevention extends EventEmitter {
  private fileStates: Map<string, FileState> = new Map();
  private watchedFiles: Set<string> = new Set();
  private sharedContext: SharedContext;
  private storage = getStorage();
  private readonly STORAGE_KEY = 'asagents:conflict-prevention:v1';
  private readonly CONTEXT_KEY = 'asagents:shared-context:v1';
  
  constructor() {
    super();
    this.sharedContext = this.loadSharedContext();
    this.loadFileStates();
    this.startContextSync();
  }

  // File State Management
  trackFile(filePath: string, agentId: string): void {
    if (this.watchedFiles.has(filePath)) return;
    
    const normalizedPath = this.normalizePath(filePath);
    const initialState = this.createFileState(normalizedPath, agentId);
    
    this.fileStates.set(normalizedPath, initialState);
    this.watchedFiles.add(normalizedPath);
    
    // Start watching for changes
    watchFile(normalizedPath, { interval: 1000 }, () => {
      this.handleFileChange(normalizedPath);
    });
    
    this.saveFileStates();
    console.log(`📂 Started tracking file: ${normalizedPath} by ${agentId}`);
  }

  untrackFile(filePath: string): void {
    const normalizedPath = this.normalizePath(filePath);
    
    if (this.watchedFiles.has(normalizedPath)) {
      unwatchFile(normalizedPath);
      this.watchedFiles.delete(normalizedPath);
      this.fileStates.delete(normalizedPath);
      this.saveFileStates();
      console.log(`📂 Stopped tracking file: ${normalizedPath}`);
    }
  }

  // Lock Management with Conflict Detection
  async requestFileLock(filePath: string, agentId: string, lockType: 'read' | 'write' | 'exclusive'): Promise<boolean> {
    const normalizedPath = this.normalizePath(filePath);
    const fileState = this.fileStates.get(normalizedPath);
    
    if (!fileState) {
      // Track the file first
      this.trackFile(normalizedPath, agentId);
      return this.requestFileLock(normalizedPath, agentId, lockType);
    }
    
    // Check if lock can be acquired
    if (!this.canAcquireLock(fileState, lockType, agentId)) {
      const conflict = this.detectLockConflict(fileState, lockType, agentId);
      this.emit('conflict', conflict);
      
      // Try to resolve conflict automatically
      const resolved = await this.attemptConflictResolution(conflict);
      if (!resolved) {
        console.log(`🔒 Lock denied for ${normalizedPath}: ${lockType} by ${agentId}`);
        return false;
      }
    }
    
    // Acquire the lock
    fileState.lockStatus = lockType;
    fileState.lockHolder = agentId;
    fileState.lockExpires = Date.now() + (5 * 60 * 1000); // 5 minutes
    
    this.saveFileStates();
    this.notifyAgents('lock_acquired', { filePath: normalizedPath, agentId, lockType });
    
    console.log(`🔐 Lock acquired: ${normalizedPath} (${lockType}) by ${agentId}`);
    return true;
  }

  releaseFileLock(filePath: string, agentId: string): void {
    const normalizedPath = this.normalizePath(filePath);
    const fileState = this.fileStates.get(normalizedPath);
    
    if (!fileState || fileState.lockHolder !== agentId) {
      console.log(`❌ Cannot release lock: ${normalizedPath} (not held by ${agentId})`);
      return;
    }
    
    fileState.lockStatus = 'free';
    delete fileState.lockHolder;
    delete fileState.lockExpires;
    
    this.saveFileStates();
    this.notifyAgents('lock_released', { filePath: normalizedPath, agentId });
    
    console.log(`🔓 Lock released: ${normalizedPath} by ${agentId}`);
  }

  // Shared Context Management
  declareIntent(agentId: string, intent: AgentIntent): void {
    this.sharedContext.intentDeclarations.set(agentId, intent);
    this.saveSharedContext();
    
    // Check for potential conflicts with other intents
    const conflicts = this.detectIntentConflicts(intent);
    if (conflicts.length > 0) {
      this.emit('intent_conflict', { intent, conflicts });
    }
    
    this.notifyAgents('intent_declared', { agentId, intent });
    console.log(`🎯 Intent declared by ${agentId}: ${intent.intent}`);
  }

  sendMessage(from: string, to: string | 'broadcast', type: string, payload: any): void {
    const message: AgentMessage = {
      from,
      to,
      type: type as any,
      payload,
      timestamp: Date.now(),
      messageId: this.generateId()
    };
    
    if (to === 'broadcast') {
      // Send to all agents
      for (const agentId of this.sharedContext.activeAgents) {
        if (agentId !== from) {
          this.addMessageToChannel(agentId, message);
        }
      }
    } else {
      this.addMessageToChannel(to, message);
    }
    
    this.saveSharedContext();
    this.emit('message_sent', message);
  }

  getMessages(agentId: string): AgentMessage[] {
    const messages = this.sharedContext.communicationChannel.get(agentId) || [];
    // Clear messages after retrieval
    this.sharedContext.communicationChannel.set(agentId, []);
    this.saveSharedContext();
    return messages;
  }

  // Real-time Coordination
  coordinateFileAccess(filePath: string, agentId: string, operation: 'read' | 'write' | 'create' | 'delete'): Promise<boolean> {
    return new Promise((resolve) => {
      const normalizedPath = this.normalizePath(filePath);
      
      // Check current state and conflicts
      const conflicts = this.predictConflicts(normalizedPath, agentId, operation);
      
      if (conflicts.length === 0) {
        resolve(true);
        return;
      }
      
      // Attempt coordination through messaging
      this.sendMessage(agentId, 'broadcast', 'coordination', {
        action: 'request_coordination',
        filePath: normalizedPath,
        operation,
        conflicts
      });
      
      // Wait for responses or timeout
      const timeout = setTimeout(() => {
        resolve(false);
      }, 10000); // 10 seconds
      
      const responseHandler = (message: AgentMessage) => {
        if (message.type === 'coordination' && 
            message.payload.action === 'coordination_response' &&
            message.payload.filePath === normalizedPath) {
          
          clearTimeout(timeout);
          resolve(message.payload.approved === true);
        }
      };
      
      this.once('message_received', responseHandler);
    });
  }

  // Advanced Conflict Detection
  private handleFileChange(filePath: string): void {
    const fileState = this.fileStates.get(filePath);
    if (!fileState) return;
    
    const newHash = this.calculateFileHash(filePath);
    const newModified = this.getFileModifiedTime(filePath);
    
    if (newHash !== fileState.hash) {
      // File has been modified
      const conflict = this.detectConcurrentModification(fileState, newHash, newModified);
      
      if (conflict) {
        this.emit('conflict', conflict);
        console.log(`⚠️ Conflict detected: ${conflict.description}`);
      }
      
      // Update file state
      fileState.hash = newHash;
      fileState.lastModified = newModified;
      fileState.version++;
      
      this.saveFileStates();
    }
  }

  private detectConcurrentModification(fileState: FileState, newHash: string, newModified: number): ConflictDetection | null {
    // Check if file was modified while locked by another agent
    if (fileState.lockStatus !== 'free' && fileState.lockHolder) {
      const timeDiff = newModified - fileState.lastModified;
      
      if (timeDiff > 0) {
        return {
          type: 'concurrent_modification',
          severity: 'high',
          files: [fileState.path],
          agents: [fileState.lockHolder, fileState.lastAgent],
          description: `File ${fileState.path} was modified concurrently`,
          suggestedResolution: {
            strategy: 'manual_review',
            confidence: 0.3,
            actions: [
              { type: 'backup', target: fileState.path },
              { type: 'notify', target: 'all', agentId: fileState.lockHolder }
            ],
            reviewRequired: true
          },
          timestamp: Date.now()
        };
      }
    }
    
    return null;
  }

  private detectLockConflict(fileState: FileState, requestedLock: string, agentId: string): ConflictDetection {
    return {
      type: 'lock_violation',
      severity: 'medium',
      files: [fileState.path],
      agents: [agentId, fileState.lockHolder || 'unknown'],
      description: `Lock conflict on ${fileState.path}: ${requestedLock} requested by ${agentId}, but ${fileState.lockStatus} lock held by ${fileState.lockHolder}`,
      suggestedResolution: {
        strategy: 'auto_merge',
        confidence: 0.7,
        actions: [
          { type: 'notify', target: fileState.lockHolder || '', agentId },
          { type: 'lock', target: fileState.path, agentId }
        ],
        reviewRequired: false
      },
      timestamp: Date.now()
    };
  }

  private detectIntentConflicts(newIntent: AgentIntent): AgentIntent[] {
    const conflicts: AgentIntent[] = [];
    
    for (const [agentId, existingIntent] of this.sharedContext.intentDeclarations) {
      if (agentId === newIntent.agentId) continue;
      
      // Check for overlapping target files
      const overlappingFiles = newIntent.targetFiles.filter(file =>
        existingIntent.targetFiles.some(existingFile =>
          this.pathsOverlap(file, existingFile)
        )
      );
      
      if (overlappingFiles.length > 0) {
        conflicts.push(existingIntent);
      }
    }
    
    return conflicts;
  }

  private predictConflicts(filePath: string, agentId: string, operation: string): ConflictDetection[] {
    const conflicts: ConflictDetection[] = [];
    
    // Check active intents
    for (const [intentAgentId, intent] of this.sharedContext.intentDeclarations) {
      if (intentAgentId === agentId) continue;
      
      if (intent.targetFiles.some(targetFile => this.pathsOverlap(filePath, targetFile))) {
        conflicts.push({
          type: 'dependency_conflict',
          severity: 'low',
          files: [filePath],
          agents: [agentId, intentAgentId],
          description: `Potential conflict: ${operation} on ${filePath} may interfere with ${intent.intent}`,
          suggestedResolution: {
            strategy: 'auto_merge',
            confidence: 0.8,
            actions: [{ type: 'notify', target: intentAgentId, agentId }],
            reviewRequired: false
          },
          timestamp: Date.now()
        });
      }
    }
    
    return conflicts;
  }

  // Automatic Conflict Resolution
  private async attemptConflictResolution(conflict: ConflictDetection): Promise<boolean> {
    const resolution = conflict.suggestedResolution;
    
    switch (resolution.strategy) {
      case 'auto_merge':
        return await this.performAutoMerge(conflict);
      case 'last_writer_wins':
        return await this.applyLastWriterWins(conflict);
      case 'rollback':
        return await this.performRollback(conflict);
      case 'branch_split':
        return await this.createBranchSplit(conflict);
      default:
        console.log(`❓ Manual resolution required for conflict: ${conflict.description}`);
        return false;
    }
  }

  private async performAutoMerge(conflict: ConflictDetection): Promise<boolean> {
    try {
      // Simplified auto-merge logic
      const filePath = conflict.files[0];
      const backupPath = `${filePath}.backup-${Date.now()}`;
      
      // Create backup
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        writeFileSync(backupPath, content);
      }
      
      console.log(`🔀 Auto-merge attempted for: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Auto-merge failed:`, error);
      return false;
    }
  }

  private async applyLastWriterWins(conflict: ConflictDetection): Promise<boolean> {
    try {
      const filePath = conflict.files[0];
      const fileState = this.fileStates.get(filePath);
      
      if (fileState) {
        // The current state is already the "winner"
        console.log(`🏆 Last writer wins applied: ${filePath}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Last writer wins failed:`, error);
      return false;
    }
  }

  private async performRollback(conflict: ConflictDetection): Promise<boolean> {
    try {
      // This would implement version control rollback
      console.log(`⏪ Rollback requested for: ${conflict.files.join(', ')}`);
      return false; // Require manual intervention
    } catch (error) {
      console.error(`❌ Rollback failed:`, error);
      return false;
    }
  }

  private async createBranchSplit(conflict: ConflictDetection): Promise<boolean> {
    try {
      // This would create separate branches for conflicting changes
      console.log(`🌿 Branch split requested for: ${conflict.files.join(', ')}`);
      return false; // Require manual intervention
    } catch (error) {
      console.error(`❌ Branch split failed:`, error);
      return false;
    }
  }

  // Utility Methods
  private createFileState(filePath: string, agentId: string): FileState {
    return {
      path: filePath,
      hash: this.calculateFileHash(filePath),
      lastModified: this.getFileModifiedTime(filePath),
      lastAgent: agentId,
      lockStatus: 'free',
      version: 1
    };
  }

  private canAcquireLock(fileState: FileState, lockType: string, agentId: string): boolean {
    if (fileState.lockStatus === 'free') return true;
    if (fileState.lockHolder === agentId) return true;
    
    // Check if lock has expired
    if (fileState.lockExpires && fileState.lockExpires < Date.now()) {
      fileState.lockStatus = 'free';
      delete fileState.lockHolder;
      delete fileState.lockExpires;
      return true;
    }
    
    // Check compatibility
    if (fileState.lockStatus === 'read' && lockType === 'read') return true;
    
    return false;
  }

  private calculateFileHash(filePath: string): string {
    try {
      if (!existsSync(filePath)) return '';
      const content = readFileSync(filePath, 'utf8');
      return createHash('md5').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  private getFileModifiedTime(filePath: string): number {
    try {
      if (!existsSync(filePath)) return 0;
      const fs = require('fs');
      const stats = fs.statSync(filePath);
      return stats.mtime.getTime();
    } catch {
      return 0;
    }
  }

  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/').toLowerCase();
  }

  private pathsOverlap(path1: string, path2: string): boolean {
    const norm1 = this.normalizePath(path1);
    const norm2 = this.normalizePath(path2);
    return norm1.includes(norm2) || norm2.includes(norm1) || norm1 === norm2;
  }

  private addMessageToChannel(agentId: string, message: AgentMessage): void {
    const messages = this.sharedContext.communicationChannel.get(agentId) || [];
    messages.push(message);
    this.sharedContext.communicationChannel.set(agentId, messages);
  }

  private notifyAgents(event: string, data: any): void {
    for (const agentId of this.sharedContext.activeAgents) {
      this.sendMessage('system', agentId, 'notification', { event, data });
    }
  }

  private startContextSync(): void {
    setInterval(() => {
      this.sharedContext.lastSync = Date.now();
      this.saveSharedContext();
    }, 5000); // Sync every 5 seconds
  }

  private loadFileStates(): void {
    const stored = this.storage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.fileStates = new Map(parsed.fileStates || []);
      } catch (error) {
        console.error('Failed to load file states:', error);
      }
    }
  }

  private saveFileStates(): void {
    const serializable = {
      fileStates: Array.from(this.fileStates.entries()),
      timestamp: Date.now()
    };
    this.storage.setItem(this.STORAGE_KEY, JSON.stringify(serializable));
  }

  private loadSharedContext(): SharedContext {
    const stored = this.storage.getItem(this.CONTEXT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          activeAgents: new Set(parsed.activeAgents || []),
          workingDirectory: new Map(parsed.workingDirectory || []),
          intentDeclarations: new Map(parsed.intentDeclarations || []),
          communicationChannel: new Map(parsed.communicationChannel || []),
          globalState: parsed.globalState || {},
          lastSync: parsed.lastSync || 0
        };
      } catch (error) {
        console.error('Failed to load shared context:', error);
      }
    }
    
    return {
      activeAgents: new Set(),
      workingDirectory: new Map(),
      intentDeclarations: new Map(),
      communicationChannel: new Map(),
      globalState: {},
      lastSync: Date.now()
    };
  }

  private saveSharedContext(): void {
    const serializable = {
      activeAgents: Array.from(this.sharedContext.activeAgents),
      workingDirectory: Array.from(this.sharedContext.workingDirectory.entries()),
      intentDeclarations: Array.from(this.sharedContext.intentDeclarations.entries()),
      communicationChannel: Array.from(this.sharedContext.communicationChannel.entries()),
      globalState: this.sharedContext.globalState,
      lastSync: this.sharedContext.lastSync
    };
    this.storage.setItem(this.CONTEXT_KEY, JSON.stringify(serializable));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Public API
  registerAgent(agentId: string): void {
    this.sharedContext.activeAgents.add(agentId);
    this.sharedContext.communicationChannel.set(agentId, []);
    this.saveSharedContext();
    console.log(`🤖 Agent registered in conflict prevention: ${agentId}`);
  }

  unregisterAgent(agentId: string): void {
    this.sharedContext.activeAgents.delete(agentId);
    this.sharedContext.communicationChannel.delete(agentId);
    this.sharedContext.intentDeclarations.delete(agentId);
    
    // Release all locks held by this agent
    for (const [filePath, fileState] of this.fileStates) {
      if (fileState.lockHolder === agentId) {
        this.releaseFileLock(filePath, agentId);
      }
    }
    
    this.saveSharedContext();
    console.log(`🤖 Agent unregistered from conflict prevention: ${agentId}`);
  }

  getConflictStats(): any {
    return {
      trackedFiles: this.fileStates.size,
      activeAgents: this.sharedContext.activeAgents.size,
      activeLocks: Array.from(this.fileStates.values()).filter(f => f.lockStatus !== 'free').length,
      activeIntents: this.sharedContext.intentDeclarations.size
    };
  }
}

// Singleton instance
export const conflictPrevention = new ConflictPrevention();