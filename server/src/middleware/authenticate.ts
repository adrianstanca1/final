import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.js';

export interface AuthenticatedRequest extends Request {
  user?: Express.AuthenticatedUserPayload;
}

export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    const token = header.substring('Bearer '.length);
    const payload = verifyAccessToken(token);
    req.user = payload as AuthenticatedRequest['user'];
    return next();
  } catch (error) {
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
