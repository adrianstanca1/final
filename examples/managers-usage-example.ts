/**
 * ASAgents Platform - Managers Usage Example
 * 
 * This file demonstrates how to use the comprehensive API Manager and Secrets Management system
 * for better integrity and functionality in the ASAgents platform.
 */

import express from 'express';
import { ManagersIntegration } from '../services/managers/ManagersIntegration';
import { getCompleteManagersConfig } from '../config/managers-config';
import { Environment } from '../types/managers';

// Initialize Express app
const app = express();
app.use(express.json());

// Global managers instance
let managers: ManagersIntegration;

/**
 * Initialize the managers system
 */
async function initializeManagers() {
  try {
    const environment: Environment = (process.env.NODE_ENV as Environment) || 'development';
    const config = getCompleteManagersConfig(environment);
    
    console.log(`🚀 Initializing ASAgents Managers for ${environment} environment...`);
    
    // Initialize all managers with integration
    managers = await ManagersIntegration.initialize(config);
    
    console.log('✅ Managers initialized successfully!');
    
    // Setup initial configurations
    await setupInitialConfiguration();
    
    // Setup initial secrets
    await setupInitialSecrets();
    
    // Setup API endpoints
    setupAPIEndpoints();
    
    // Setup monitoring alerts
    setupMonitoringAlerts();
    
    console.log('🎉 ASAgents Platform is ready!');
    
  } catch (error) {
    console.error('❌ Failed to initialize managers:', error);
    process.exit(1);
  }
}

/**
 * Setup initial configuration values
 */
async function setupInitialConfiguration() {
  console.log('⚙️ Setting up initial configuration...');
  
  const environment: Environment = (process.env.NODE_ENV as Environment) || 'development';
  
  // Application configuration
  await managers.config.setConfig('app_name', 'ASAgents Platform', environment, {
    description: 'Application name',
    isRequired: true
  });
  
  await managers.config.setConfig('app_version', '1.0.0', environment, {
    description: 'Application version',
    isRequired: true
  });
  
  // API configuration
  await managers.config.setConfig('api_timeout', 30000, environment, {
    description: 'API request timeout in milliseconds',
    validation: { min: 1000, max: 60000 }
  });
  
  // Feature flags
  managers.config.setFeatureFlag('multimodal_processing', true, environment);
  managers.config.setFeatureFlag('ai_features', true, environment);
  managers.config.setFeatureFlag('real_time_collaboration', environment === 'production', environment);
  
  console.log('✅ Initial configuration setup complete');
}

/**
 * Setup initial secrets
 */
async function setupInitialSecrets() {
  console.log('🔐 Setting up initial secrets...');
  
  const environment: Environment = (process.env.NODE_ENV as Environment) || 'development';
  
  // JWT secrets
  await managers.secrets.setSecret(
    'jwt_access_secret',
    process.env.JWT_ACCESS_SECRET || managers.security.generateSecureToken(64),
    {
      type: 'jwt_secret',
      environment,
      description: 'JWT access token secret',
      rotationInterval: 90
    }
  );
  
  await managers.secrets.setSecret(
    'jwt_refresh_secret',
    process.env.JWT_REFRESH_SECRET || managers.security.generateSecureToken(64),
    {
      type: 'jwt_secret',
      environment,
      description: 'JWT refresh token secret',
      rotationInterval: 90
    }
  );
  
  // API keys for external services
  if (process.env.VITE_GEMINI_API_KEY) {
    await managers.secrets.setSecret(
      'gemini_api_key',
      process.env.VITE_GEMINI_API_KEY,
      {
        type: 'api_key',
        environment,
        description: 'Gemini AI API key',
        rotationInterval: 365
      }
    );
  }
  
  console.log('✅ Initial secrets setup complete');
}

/**
 * Setup API endpoints with full security integration
 */
function setupAPIEndpoints() {
  console.log('🌐 Setting up secure API endpoints...');
  
  // Public health check endpoint
  managers.createSecureEndpoint('/api/health', 'GET', async (req: express.Request, res: express.Response) => {
    const healthCheck = await managers.performHealthCheck();
    res.json(healthCheck);
  }, {
    authentication: false,
    rateLimit: { requests: 100, windowMs: 60000 }
  });
  
  // Authentication endpoint
  managers.createSecureEndpoint('/api/auth/login', 'POST', async (req: express.Request, res: express.Response) => {
    try {
      const { email, password } = req.body;
      
      // Validate credentials (implement your auth logic here)
      const user = await validateUserCredentials(email, password);
      
      if (!user) {
        managers.monitoring.logSecurityEvent('login_failed', 'medium', { email }, undefined, req.ip);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate JWT token
      const jwtSecret = await managers.secrets.getSecret('jwt_access_secret');
      const token = generateJWTToken(user, jwtSecret);
      
      managers.monitoring.logSecurityEvent('login_success', 'low', { userId: user.id }, user.id, req.ip);
      
      res.json({ token, user: sanitizeUser(user) });
      
    } catch (error) {
      managers.monitoring.error('Login endpoint error', error instanceof Error ? error : undefined, 'auth');
      res.status(500).json({ error: 'Internal server error' });
    }
  }, {
    authentication: false,
    validation: {
      body: {
        required: ['email', 'password']
      }
    },
    rateLimit: { requests: 10, windowMs: 60000 }
  });
  
  // Protected user profile endpoint
  managers.createSecureEndpoint('/api/user/profile', 'GET', async (req: express.Request, res: express.Response) => {
    const user = (req as any).user;
    res.json({ user: sanitizeUser(user) });
  }, {
    authentication: true,
    permissions: ['user:read']
  });
  
  // Admin endpoint for managing API keys
  managers.createSecureEndpoint('/api/admin/api-keys', 'POST', async (req: express.Request, res: express.Response) => {
    try {
      const { name, scopes, permissions, expiresAt } = req.body;
      const user = (req as any).user;
      
      const apiKey = await managers.api.generateAPIKey(
        name,
        user.id,
        scopes,
        permissions,
        undefined,
        expiresAt ? new Date(expiresAt) : undefined
      );
      
      managers.monitoring.info('API key generated', 'admin', { 
        keyId: apiKey.id, 
        name, 
        userId: user.id 
      });
      
      res.json({ apiKey: { ...apiKey, key: apiKey.key } }); // Only return key once
      
    } catch (error) {
      managers.monitoring.error('API key generation failed', error instanceof Error ? error : undefined, 'admin');
      res.status(500).json({ error: 'Failed to generate API key' });
    }
  }, {
    authentication: true,
    permissions: ['admin:api_keys:create'],
    validation: {
      body: {
        required: ['name']
      }
    },
    rateLimit: { requests: 10, windowMs: 60000 }
  });
  
  // Configuration management endpoint
  managers.createSecureEndpoint('/api/admin/config', 'GET', async (req: express.Request, res: express.Response) => {
    const environment: Environment = (req.query.environment as Environment) || 'development';
    const config = await managers.config.getEnvironmentConfig(environment);
    res.json({ config });
  }, {
    authentication: true,
    permissions: ['admin:config:read']
  });
  
  // System statistics endpoint
  managers.createSecureEndpoint('/api/admin/stats', 'GET', async (req: express.Request, res: express.Response) => {
    const stats = managers.getSystemStats();
    res.json({ stats });
  }, {
    authentication: true,
    permissions: ['admin:stats:read']
  });
  
  console.log('✅ API endpoints setup complete');
}

/**
 * Setup monitoring alerts
 */
function setupMonitoringAlerts() {
  console.log('📊 Setting up monitoring alerts...');
  
  // System health alert
  managers.monitoring.createAlert(
    'system_health',
    'System health degraded',
    1,
    'critical',
    ['console', 'email']
  );
  
  // API error rate alert
  managers.monitoring.createAlert(
    'api_errors',
    'High API error rate',
    10,
    'high',
    ['console']
  );
  
  // Authentication failures alert
  managers.monitoring.createAlert(
    'auth_failures',
    'High authentication failure rate',
    5,
    'medium',
    ['console']
  );
  
  console.log('✅ Monitoring alerts setup complete');
}

/**
 * Example helper functions (implement according to your needs)
 */
async function validateUserCredentials(email: string, password: string): Promise<any | null> {
  // Implement your user validation logic here
  // This is just a placeholder
  return { id: '1', email, role: 'user' };
}

function generateJWTToken(user: any, secret: string): string {
  // Implement JWT token generation
  // This is just a placeholder
  return 'jwt-token-placeholder';
}

function sanitizeUser(user: any): any {
  // Remove sensitive fields from user object
  const { password, ...sanitized } = user;
  return sanitized;
}

/**
 * Setup Express middleware
 */
function setupExpressMiddleware() {
  // Security headers middleware
  app.use(managers.api.securityHeadersMiddleware());
  
  // Authentication middleware
  app.use('/api', managers.api.authenticationMiddleware());
  
  // Rate limiting middleware
  app.use('/api', managers.api.rateLimitMiddleware());
  
  // Response formatting middleware
  app.use('/api', managers.api.responseFormattingMiddleware());
}

/**
 * Start the server
 */
async function startServer() {
  const port = process.env.PORT || 4000;
  
  // Setup middleware
  setupExpressMiddleware();
  
  // Start listening
  app.listen(port, () => {
    console.log(`🚀 ASAgents API Server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/api/health`);
    
    // Log startup metrics
    managers.monitoring.info('Server started', 'server', { port });
    managers.monitoring.recordMetric('server_starts', 1, 'counter');
  });
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await managers.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await managers.shutdown();
  process.exit(0);
});

/**
 * Main execution
 */
async function main() {
  try {
    await initializeManagers();
    await startServer();
  } catch (error) {
    console.error('❌ Failed to start ASAgents Platform:', error);
    process.exit(1);
  }
}

// Export for use in other files
export { managers, initializeManagers };

// Run if this file is executed directly
if (require.main === module) {
  main();
}
