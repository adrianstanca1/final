import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

class Database {
  private prisma: PrismaClient | null = null;
  private _isConnected = false;

  get client(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<void> {
    try {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: config.DATABASE_URL,
          },
        },
        log: [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
      });

      // Set up logging
      this.prisma.$on('query', (e) => {
        if (config.NODE_ENV === 'development') {
          logger.debug('Database Query', {
            query: e.query,
            params: e.params,
            duration: e.duration,
          });
        }
      });

      this.prisma.$on('error', (e) => {
        logger.error('Database Error', e);
      });

      this.prisma.$on('warn', (e) => {
        logger.warn('Database Warning', e);
      });

      // Test the connection
      await this.prisma.$connect();
      
      // Run a test query
      await this.prisma.$queryRaw`SELECT 1`;
      
      this._isConnected = true;
      logger.info('Database connected successfully');
      
    } catch (error) {
      this._isConnected = false;
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
      this._isConnected = false;
      logger.info('Database disconnected');
    }
  }

  async healthCheck(): Promise<{ status: string; latency?: number }> {
    if (!this.isConnected) {
      return { status: 'disconnected' };
    }

    try {
      const startTime = Date.now();
      await this.prisma!.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;
      
      return { status: 'healthy', latency };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy' };
    }
  }

  // Transaction helper
  async transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    if (!this.prisma) {
      throw new Error('Database not connected');
    }

    return this.prisma.$transaction(async (prisma) => {
      return fn(prisma);
    });
  }
}

export const database = new Database();