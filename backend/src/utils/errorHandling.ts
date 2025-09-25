import { logger } from './logger';

export interface ErrorContext {
  operation: string;
  component: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
}

export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: ErrorContext
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export function wrapError(error: Error, context: ErrorContext): ApplicationError {
  const timestamp = context.timestamp || new Date().toISOString();
  const fullContext = { ...context, timestamp };
  
  if (error instanceof ApplicationError) {
    return error;
  }
  
  return new ApplicationError(
    error.message,
    'WRAPPED_ERROR',
    500,
    fullContext
  );
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxAttempts) {
        throw wrapError(lastError, {
          operation: 'withRetry',
          component: 'errorHandling',
          metadata: { attempts: attempt, config },
          timestamp: new Date().toISOString()
        });
      }
      
      // Check if we should retry this error
      if (config.retryCondition && !config.retryCondition(lastError)) {
        throw wrapError(lastError, {
          operation: 'withRetry',
          component: 'errorHandling',
          metadata: { attempts: attempt, reason: 'retry condition failed' },
          timestamp: new Date().toISOString()
        });
      }
      
      // Calculate delay
      const delay = config.baseDelay * Math.pow(config.backoffMultiplier || 2, attempt - 1);
      
      logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt}/${config.maxAttempts})`, {
        error: lastError.message,
        attempt,
        delay
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export function handleAsync(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function isRetryableError(error: Error): boolean {
  // Network errors, timeouts, 5xx responses are typically retryable
  const retryablePatterns = [
    /ECONNRESET/,
    /ENOTFOUND/,
    /ECONNREFUSED/,
    /ETIMEDOUT/,
    /timeout/i,
    /network/i
  ];
  
  return retryablePatterns.some(pattern => pattern.test(error.message));
}