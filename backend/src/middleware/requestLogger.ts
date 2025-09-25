import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface RequestWithId extends Request {
  id?: string;
}

export const requestLogger = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void => {
  // Generate unique request ID
  req.id = uuidv4();

  // Log incoming request
  logger.info('Incoming Request', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString(),
  });

  // Log response when finished
  const originalSend = res.send;
  res.send = function(body) {
    logger.info('Request Completed', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: Date.now() - (req as any).startTime,
    });

    return originalSend.call(this, body);
  };

  // Record start time
  (req as any).startTime = Date.now();

  next();
};