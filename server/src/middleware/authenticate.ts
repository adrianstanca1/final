import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.js';
import { pool } from '../services/db.js';
import { logger } from '../utils/logger.js';
import type { RowDataPacket } from 'mysql2/promise';

export interface AuthenticatedRequest extends Request {
  user?: Express.AuthenticatedUserPayload;
  tenantId?: number;
}

interface UserRow extends RowDataPacket {
  id: number;
  tenant_id: number;
  role: string;
  is_active: boolean;
  failed_login_attempts: number;
  tenant_active: boolean;
  tenant_plan: string;
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    const token = header.substring('Bearer '.length);
    const payload = verifyAccessToken(token);

    if (!payload.userId || !payload.tenantId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Enhanced tenant isolation - verify token tenant matches request context
    const requestTenantId = req.headers['x-tenant-id'] || payload.tenantId;
    if (requestTenantId && requestTenantId !== payload.tenantId.toString()) {
      logger.warn({
        tokenTenant: payload.tenantId,
        requestTenant: requestTenantId,
        userId: payload.userId
      }, 'Tenant mismatch detected');
      return res.status(403).json({ message: 'Tenant access denied' });
    }

    // Get user from database with enhanced tenant validation
    const [rows] = await pool.query<UserRow[]>(
      `SELECT u.*, t.is_active as tenant_active, t.plan as tenant_plan
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = ? AND u.tenant_id = ? AND u.is_active = 1 AND t.is_active = 1`,
      [payload.userId, payload.tenantId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'User not found or tenant inactive' });
    }

    const user = rows[0];

    // Enhanced security: Check for suspicious activity
    if (user.failed_login_attempts >= 5) {
      logger.warn({ userId: user.id, tenantId: user.tenant_id }, 'User account locked due to failed attempts');
      return res.status(423).json({ message: 'Account temporarily locked' });
    }

    req.user = payload as AuthenticatedRequest['user'];
    req.tenantId = user.tenant_id;

    // Add tenant context to response headers for debugging
    res.setHeader('X-Tenant-Context', user.tenant_id);

    return next();
  } catch (error) {
    logger.error({ error }, 'Authentication failed');
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    return next();
  };
}
