/**
 * Comprehensive backup and synchronization service
 */
export class BackupService {
    constructor() {
        this.backupInterval = 5 * 60 * 1000; // 5 minutes
        this.maxBackups = 10;
        this.compressionEnabled = true;
        this.syncInProgress = false;
        this.setupAutoBackup();
        this.setupStorageEventListener();
    }
    static getInstance() {
        if (!BackupService.instance) {
            BackupService.instance = new BackupService();
        }
        return BackupService.instance;
    }
    // Backup operations
    async createBackup(data, metadata) {
        const backup = {
            id: this.generateBackupId(),
            timestamp: Date.now(),
            version: '1.0.0',
            checksum: await this.calculateChecksum(data),
            data: this.compressionEnabled ? await this.compressData(data) : data,
            metadata: {
                size: JSON.stringify(data).length,
                compressed: this.compressionEnabled,
                ...metadata,
            },
        };
        await this.storeBackup(backup);
        await this.cleanupOldBackups();
        return backup.id;
    }
    async restoreBackup(backupId) {
        const backup = await this.getBackup(backupId);
        if (!backup) {
            throw new Error(`Backup ${backupId} not found`);
        }
        // Verify checksum
        const data = backup.metadata.compressed
            ? await this.decompressData(backup.data)
            : backup.data;
        const checksum = await this.calculateChecksum(data);
        if (checksum !== backup.checksum) {
            throw new Error('Backup data integrity check failed');
        }
        return data;
    }
    async listBackups() {
        const backupKeys = Object.keys(localStorage)
            .filter(key => key.startsWith('backup:'))
            .sort((a, b) => {
            const timestampA = parseInt(a.split(':')[1]);
            const timestampB = parseInt(b.split(':')[1]);
            return timestampB - timestampA; // Most recent first
        });
        const backups = [];
        for (const key of backupKeys) {
            try {
                const backup = JSON.parse(localStorage.getItem(key) || '');
                backups.push(backup);
            }
            catch (error) {
                console.warn(`Failed to parse backup ${key}:`, error);
            }
        }
        return backups;
    }
    async deleteBackup(backupId) {
        const key = `backup:${backupId}`;
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            return true;
        }
        return false;
    }
    // Synchronization operations
    async syncWithRemote(remoteData) {
        if (this.syncInProgress) {
            throw new Error('Sync already in progress');
        }
        this.syncInProgress = true;
        const result = {
            success: false,
            conflicts: [],
            synced: 0,
            failed: 0,
            errors: [],
        };
        try {
            const localData = await this.getCurrentData();
            const conflicts = this.detectConflicts(localData, remoteData);
            if (conflicts.length > 0) {
                result.conflicts = conflicts;
                // Auto-resolve conflicts using last-write-wins strategy
                const resolvedData = this.resolveConflicts(localData, remoteData, conflicts);
                await this.applyResolvedData(resolvedData);
            }
            else {
                // No conflicts, merge data
                const mergedData = this.mergeData(localData, remoteData);
                await this.applyResolvedData(mergedData);
            }
            result.success = true;
            result.synced = Object.keys(remoteData).length;
        }
        catch (error) {
            result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
            result.failed = Object.keys(remoteData).length;
        }
        finally {
            this.syncInProgress = false;
        }
        return result;
    }
    async exportData(format = 'json') {
        const data = await this.getCurrentData();
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        }
        else if (format === 'csv') {
            return this.convertToCSV(data);
        }
        throw new Error(`Unsupported export format: ${format}`);
    }
    async importData(data, format = 'json') {
        let parsedData;
        if (format === 'json') {
            parsedData = JSON.parse(data);
        }
        else if (format === 'csv') {
            parsedData = this.parseCSV(data);
        }
        else {
            throw new Error(`Unsupported import format: ${format}`);
        }
        // Create backup before import
        await this.createBackup(await this.getCurrentData(), {
            userId: 'import-backup',
        });
        // Apply imported data
        await this.applyResolvedData(parsedData);
    }
    // Configuration
    setBackupInterval(intervalMs) {
        this.backupInterval = intervalMs;
        this.setupAutoBackup();
    }
    setMaxBackups(max) {
        this.maxBackups = max;
    }
    setCompressionEnabled(enabled) {
        this.compressionEnabled = enabled;
    }
    // Private methods
    async getCurrentData() {
        const data = {};
        // Collect all app data from localStorage
        for (const key of Object.keys(localStorage)) {
            if (!key.startsWith('backup:') && !key.startsWith('cache:')) {
                try {
                    data[key] = JSON.parse(localStorage.getItem(key) || '');
                }
                catch {
                    data[key] = localStorage.getItem(key);
                }
            }
        }
        return data;
    }
    async storeBackup(backup) {
        const key = `backup:${backup.id}`;
        localStorage.setItem(key, JSON.stringify(backup));
    }
    async getBackup(backupId) {
        const key = `backup:${backupId}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    }
    async cleanupOldBackups() {
        const backups = await this.listBackups();
        if (backups.length > this.maxBackups) {
            const toDelete = backups.slice(this.maxBackups);
            for (const backup of toDelete) {
                await this.deleteBackup(backup.id);
            }
        }
    }
    generateBackupId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
    async calculateChecksum(data) {
        const str = JSON.stringify(data);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(str);
        if ('crypto' in window && 'subtle' in crypto) {
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }
        else {
            // Fallback simple hash for environments without crypto.subtle
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString(16);
        }
    }
    async compressData(data) {
        // Simple compression using JSON string manipulation
        // In a real implementation, you might use a proper compression library
        const str = JSON.stringify(data);
        return { compressed: true, data: str };
    }
    async decompressData(compressedData) {
        if (compressedData.compressed) {
            return JSON.parse(compressedData.data);
        }
        return compressedData;
    }
    detectConflicts(localData, remoteData) {
        const conflicts = [];
        for (const key of Object.keys(remoteData)) {
            if (key in localData) {
                const localValue = localData[key];
                const remoteValue = remoteData[key];
                // Simple conflict detection based on value differences
                if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
                    conflicts.push({
                        key,
                        localValue,
                        remoteValue,
                        localTimestamp: Date.now(), // In real implementation, track actual timestamps
                        remoteTimestamp: Date.now(),
                    });
                }
            }
        }
        return conflicts;
    }
    resolveConflicts(localData, remoteData, conflicts) {
        const resolved = { ...localData };
        // Last-write-wins strategy (prefer remote in this case)
        for (const conflict of conflicts) {
            resolved[conflict.key] = conflict.remoteValue;
        }
        // Add new remote keys
        for (const key of Object.keys(remoteData)) {
            if (!(key in resolved)) {
                resolved[key] = remoteData[key];
            }
        }
        return resolved;
    }
    mergeData(localData, remoteData) {
        return { ...localData, ...remoteData };
    }
    async applyResolvedData(data) {
        // Clear existing data (except backups and cache)
        const keysToKeep = Object.keys(localStorage).filter(key => key.startsWith('backup:') || key.startsWith('cache:'));
        localStorage.clear();
        // Restore kept keys
        keysToKeep.forEach(key => {
            const value = localStorage.getItem(key);
            if (value)
                localStorage.setItem(key, value);
        });
        // Apply new data
        for (const [key, value] of Object.entries(data)) {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        }
    }
    convertToCSV(data) {
        // Simple CSV conversion for flat data structures
        const rows = [];
        rows.push('Key,Value,Type');
        for (const [key, value] of Object.entries(data)) {
            const type = typeof value;
            const csvValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            rows.push(`"${key}","${csvValue.replace(/"/g, '""')}","${type}"`);
        }
        return rows.join('\n');
    }
    parseCSV(csv) {
        const lines = csv.split('\n');
        const data = {};
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            const matches = line.match(/^"([^"]*(?:""[^"]*)*)","([^"]*(?:""[^"]*)*)","([^"]*(?:""[^"]*)*)"$/);
            if (matches) {
                const key = matches[1].replace(/""/g, '"');
                const value = matches[2].replace(/""/g, '"');
                const type = matches[3];
                if (type === 'object') {
                    try {
                        data[key] = JSON.parse(value);
                    }
                    catch {
                        data[key] = value;
                    }
                }
                else if (type === 'number') {
                    data[key] = Number(value);
                }
                else if (type === 'boolean') {
                    data[key] = value === 'true';
                }
                else {
                    data[key] = value;
                }
            }
        }
        return data;
    }
    setupAutoBackup() {
        // Clear existing interval
        if (this.backupIntervalId) {
            clearInterval(this.backupIntervalId);
        }
        // Set up new interval
        this.backupIntervalId = setInterval(async () => {
            try {
                const data = await this.getCurrentData();
                await this.createBackup(data, { userId: 'auto-backup' });
            }
            catch (error) {
                console.error('Auto-backup failed:', error);
            }
        }, this.backupInterval);
    }
    setupStorageEventListener() {
        window.addEventListener('storage', (event) => {
            if (event.key && !event.key.startsWith('backup:') && !event.key.startsWith('cache:')) {
                // Data changed in another tab, consider creating a backup
                setTimeout(async () => {
                    try {
                        const data = await this.getCurrentData();
                        await this.createBackup(data, { userId: 'cross-tab-sync' });
                    }
                    catch (error) {
                        console.error('Cross-tab backup failed:', error);
                    }
                }, 1000);
            }
        });
    }
}
// Export singleton instance
export const backupService = BackupService.getInstance();
//# sourceMappingURL=backupService.js.map