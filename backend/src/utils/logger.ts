import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { isDevelopment } from '../config/environment';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${String(timestamp)} [${String(level)}]: ${String(message)}${metaStr}`;
  })
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport for development
if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: 'info',
    })
  );
}

// File transports
transports.push(
  // Error logs
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }),
  
  // Combined logs
  new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: logFormat,
  transports,
  exitOnError: false,
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({ filename: 'logs/exceptions.log' })
);

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Add request ID to logs in middleware
export const addRequestId = (requestId: string) => {
  return logger.child({ requestId });
};

// Structured logging helpers
export const logWithContext = {
  auth: (message: string, context: any = {}) => {
    logger.info(message, { context: 'auth', ...context });
  },
  
  database: (message: string, context: any = {}) => {
    logger.info(message, { context: 'database', ...context });
  },
  
  api: (message: string, context: any = {}) => {
    logger.info(message, { context: 'api', ...context });
  },
  
  error: (message: string, error: Error, context: any = {}) => {
    logger.error(message, { 
      context: 'error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context 
    });
  },
};