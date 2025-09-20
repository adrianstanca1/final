import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { database } from '../database/connection';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    companyId: string;
    permissions: string[];
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Access denied',
        message: 'No token provided or invalid format',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      res.status(401).json({
        error: 'Access denied',
        message: 'No token provided',
      });
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      
      // Get user from database to ensure they still exist and are active
      const user = await database.client.user.findUnique({
        where: { id: decoded.userId },
        include: {
          company: true,
        },
      });

      if (!user?.isActive) {
        res.status(401).json({
          error: 'Access denied',
          message: 'User not found or inactive',
        });
        return;
      }

      // Add user info to request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        permissions: (user.permissions as string[]) || [],
      };

      next();
      
    } catch (jwtError) {
      logger.error('JWT verification failed:', jwtError);
      res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token',
      });
      return;
    }
    
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    });
    return;
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Access denied',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

export const requirePermission = (...permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required',
      });
      return;
    }

    const hasPermission = permissions.some(permission => 
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({
        error: 'Access denied',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};