// Enhanced authentication and authorization service
import { Permission, RolePermissions, Role } from '../types.js';
export class AuthService {
    constructor() {
        this.loginAttempts = new Map();
        this.activeSessions = new Map();
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    }
    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }
    // Enhanced permission checking with context
    hasPermission(user, permission, context) {
        if (!user) {
            return false;
        }
        // Principal admin has all permissions
        if (user.role === Role.PRINCIPAL_ADMIN) {
            return true;
        }
        const userPermissions = RolePermissions[user.role];
        if (!userPermissions) {
            return false;
        }
        const hasBasePermission = userPermissions.has(permission);
        // Additional context-based checks
        if (hasBasePermission && context) {
            return this.checkContextualPermissions(user, permission, context);
        }
        return hasBasePermission;
    }
    // Check if user is locked out due to failed login attempts
    isAccountLocked(email) {
        const attempts = this.loginAttempts.get(email) || [];
        const recentFailures = attempts.filter(attempt => !attempt.success &&
            Date.now() - attempt.timestamp < this.lockoutDuration);
        return recentFailures.length >= this.maxLoginAttempts;
    }
    // Record login attempt
    recordLoginAttempt(email, success, metadata) {
        const attempts = this.loginAttempts.get(email) || [];
        attempts.push({
            email,
            timestamp: Date.now(),
            success,
            ...metadata,
        });
        // Keep only recent attempts (last 24 hours)
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentAttempts = attempts.filter(attempt => attempt.timestamp > dayAgo);
        this.loginAttempts.set(email, recentAttempts);
    }
    // Validate password strength
    validatePasswordStrength(password) {
        const errors = [];
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        // Check against common passwords
        if (this.isCommonPassword(password)) {
            errors.push('Password is too common, please choose a more unique password');
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    // Session management
    createSession(user, metadata) {
        const sessionId = this.generateSessionId();
        const permissions = new Set(RolePermissions[user.role] || []);
        const context = {
            user,
            sessionId,
            lastActivity: Date.now(),
            permissions,
            ...metadata,
        };
        this.activeSessions.set(sessionId, context);
        // Cleanup expired sessions
        this.cleanupExpiredSessions();
        return sessionId;
    }
    validateSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            return null;
        }
        // Check if session has expired
        if (Date.now() - session.lastActivity > this.sessionTimeout) {
            this.activeSessions.delete(sessionId);
            return null;
        }
        // Update last activity
        session.lastActivity = Date.now();
        return session;
    }
    revokeSession(sessionId) {
        return this.activeSessions.delete(sessionId);
    }
    revokeAllUserSessions(userId) {
        let revokedCount = 0;
        for (const [sessionId, context] of this.activeSessions.entries()) {
            if (context.user.id === userId) {
                this.activeSessions.delete(sessionId);
                revokedCount++;
            }
        }
        return revokedCount;
    }
    // Security monitoring
    getSecurityMetrics() {
        const now = Date.now();
        const hourAgo = now - 60 * 60 * 1000;
        let totalAttempts = 0;
        let failedAttempts = 0;
        let lockedAccounts = 0;
        for (const attempts of this.loginAttempts.values()) {
            const recentAttempts = attempts.filter(a => a.timestamp > hourAgo);
            totalAttempts += recentAttempts.length;
            failedAttempts += recentAttempts.filter(a => !a.success).length;
            const recentFailures = recentAttempts.filter(a => !a.success);
            if (recentFailures.length >= this.maxLoginAttempts) {
                lockedAccounts++;
            }
        }
        return {
            activeSessions: this.activeSessions.size,
            totalLoginAttempts: totalAttempts,
            failedLoginAttempts: failedAttempts,
            lockedAccounts,
            successRate: totalAttempts > 0 ? ((totalAttempts - failedAttempts) / totalAttempts) * 100 : 100,
        };
    }
    // Private methods
    checkContextualPermissions(user, permission, context) {
        // Example: Users can only edit their own profile
        if (permission === Permission.EDIT_USER && context.userId) {
            return user.id === context.userId || this.hasPermission(user, Permission.MANAGE_USERS);
        }
        // Example: Project managers can only access their assigned projects
        if (permission === Permission.VIEW_PROJECT && context.projectId) {
            // This would need to check project assignments in a real implementation
            return true;
        }
        return true;
    }
    isCommonPassword(password) {
        const commonPasswords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey',
        ];
        return commonPasswords.includes(password.toLowerCase());
    }
    generateSessionId() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [sessionId, context] of this.activeSessions.entries()) {
            if (now - context.lastActivity > this.sessionTimeout) {
                this.activeSessions.delete(sessionId);
            }
        }
    }
}
// Legacy function for backward compatibility
export const hasPermission = (user, permission) => {
    return AuthService.getInstance().hasPermission(user, permission);
};
// Export singleton instance
export const authService = AuthService.getInstance();
//# sourceMappingURL=auth.js.map