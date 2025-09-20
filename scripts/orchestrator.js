#!/usr/bin/env node

/**
 * Multi-Agent Orchestration Entry Point
 * Starts the complete multi-agent coordination system
 */

const { spawn } = require('child_process');
const { existsSync, readFileSync, writeFileSync } = require('fs');
const path = require('path');

class MultiAgentOrchestrator {
  constructor() {
    this.processes = new Map();
    this.isShuttingDown = false;
    this.startTime = Date.now();
    this.logFile = path.join(process.cwd(), 'logs', 'orchestrator.log');
    
    this.setupLogging();
    this.setupSignalHandlers();
  }

  setupLogging() {
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    if (!existsSync(logsDir)) {
      require('fs').mkdirSync(logsDir, { recursive: true });
    }
    
    // Log function
    this.log = (level, message, data = null) => {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        data,
        uptime: Date.now() - this.startTime
      };
      
      const logLine = `${timestamp} [${level.toUpperCase()}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
      console.log(logLine.trim());
      
      try {
        require('fs').appendFileSync(this.logFile, logLine);
      } catch (error) {
        console.error('Failed to write to log file:', error.message);
      }
    };
  }

  setupSignalHandlers() {
    const gracefulShutdown = (signal) => {
      if (this.isShuttingDown) return;
      
      this.log('info', `Received ${signal}, initiating graceful shutdown...`);
      this.isShuttingDown = true;
      
      this.shutdown()
        .then(() => {
          this.log('info', 'Graceful shutdown completed');
          process.exit(0);
        })
        .catch((error) => {
          this.log('error', 'Error during shutdown', { error: error.message });
          process.exit(1);
        });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    process.on('uncaughtException', (error) => {
      this.log('error', 'Uncaught exception', { error: error.message, stack: error.stack });
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.log('error', 'Unhandled rejection', { reason, promise: promise.toString() });
    });
  }

  async startService(name, command, args = [], options = {}) {
    if (this.processes.has(name)) {
      this.log('warn', `Service ${name} is already running`);
      return false;
    }

    this.log('info', `Starting service: ${name}`, { command, args });

    const defaultOptions = {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' },
      cwd: process.cwd(),
      ...options
    };

    const child = spawn(command, args, defaultOptions);
    
    child.stdout?.on('data', (data) => {
      this.log('info', `[${name}] ${data.toString().trim()}`);
    });

    child.stderr?.on('data', (data) => {
      this.log('error', `[${name}] ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      this.log('info', `Service ${name} exited with code ${code}`);
      this.processes.delete(name);
      
      // Restart if not shutting down and exit code indicates crash
      if (!this.isShuttingDown && code !== 0 && code !== null) {
        this.log('warn', `Service ${name} crashed, restarting in 5 seconds...`);
        setTimeout(() => {
          if (!this.isShuttingDown) {
            this.startService(name, command, args, options);
          }
        }, 5000);
      }
    });

    child.on('error', (error) => {
      this.log('error', `Failed to start service ${name}`, { error: error.message });
      this.processes.delete(name);
    });

    this.processes.set(name, {
      process: child,
      command,
      args,
      options,
      startTime: Date.now()
    });

    return true;
  }

  async startRedis() {
    this.log('info', 'Starting Redis server...');
    
    // Check if Redis is already running
    try {
      const { execSync } = require('child_process');
      execSync('redis-cli ping', { stdio: 'ignore' });
      this.log('info', 'Redis is already running');
      return true;
    } catch {
      // Redis not running, start it
    }

    // Try to start Redis
    const redisCommands = [
      'redis-server',
      '/usr/local/bin/redis-server',
      '/opt/homebrew/bin/redis-server'
    ];

    for (const command of redisCommands) {
      try {
        await this.startService('redis', command, ['--port', '6379', '--daemonize', 'no']);
        
        // Wait for Redis to be ready
        await this.waitForService('redis-cli ping', 10000);
        this.log('info', 'Redis server started successfully');
        return true;
      } catch (error) {
        this.log('warn', `Failed to start Redis with ${command}:`, { error: error.message });
        continue;
      }
    }

    this.log('warn', 'Could not start Redis server, using in-memory coordination');
    return false;
  }

  async startCoordinator() {
    this.log('info', 'Starting Agent Coordinator...');
    
    const coordinatorPath = path.join(__dirname, '..', 'services', 'monitoringAPI.ts');
    
    if (!existsSync(coordinatorPath)) {
      throw new Error(`Coordinator service not found at ${coordinatorPath}`);
    }

    await this.startService('coordinator', 'tsx', [coordinatorPath], {
      env: {
        ...process.env,
        PORT: '3100',
        NODE_ENV: 'development'
      }
    });

    await this.waitForService('curl -s http://localhost:3100/health', 30000);
    this.log('info', 'Agent Coordinator started successfully');
  }

  async startAgents() {
    const agentConfigs = [
      {
        name: 'primary-agent',
        capabilities: ['file_operations', 'code_analysis', 'task_coordination'],
        port: 3101
      },
      {
        name: 'frontend-agent',
        capabilities: ['react_development', 'ui_components', 'styling'],
        port: 3102
      },
      {
        name: 'backend-agent',
        capabilities: ['api_development', 'database_operations', 'server_management'],
        port: 3103
      },
      {
        name: 'deployment-agent',
        capabilities: ['docker_operations', 'ci_cd', 'infrastructure'],
        port: 3104
      },
      {
        name: 'reviewer-agent',
        capabilities: ['code_review', 'quality_assurance', 'testing'],
        port: 3105
      }
    ];

    const agentRuntimePath = path.join(__dirname, 'agent-runtime.js');
    
    if (!existsSync(agentRuntimePath)) {
      throw new Error(`Agent runtime not found at ${agentRuntimePath}`);
    }

    for (const config of agentConfigs) {
      this.log('info', `Starting ${config.name}...`);
      
      await this.startService(config.name, 'node', [agentRuntimePath], {
        env: {
          ...process.env,
          AGENT_ID: config.name,
          AGENT_CAPABILITIES: config.capabilities.join(','),
          AGENT_PORT: config.port.toString(),
          COORDINATOR_URL: 'http://localhost:3100'
        }
      });

      // Brief delay between agent startups
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.log('info', 'All agents started successfully');
  }

  async startMonitoring() {
    this.log('info', 'Starting monitoring dashboard...');
    
    // The monitoring API is already started with the coordinator
    // Here we could start additional monitoring services if needed
    
    this.log('info', 'Monitoring services ready');
  }

  async waitForService(command, timeout = 10000) {
    const startTime = Date.now();
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const check = () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Service check timeout: ${command}`));
          return;
        }

        exec(command, (error) => {
          if (error) {
            setTimeout(check, 1000);
          } else {
            resolve();
          }
        });
      };

      check();
    });
  }

  async start() {
    try {
      this.log('info', '🚀 Starting Multi-Agent Orchestration System...');
      
      // Create necessary directories
      const dirs = ['logs', 'temp', 'locks'];
      dirs.forEach(dir => {
        const dirPath = path.join(process.cwd(), dir);
        if (!existsSync(dirPath)) {
          require('fs').mkdirSync(dirPath, { recursive: true });
        }
      });

      // Start services in order
      await this.startRedis();
      await this.startCoordinator();
      await this.startAgents();
      await this.startMonitoring();

      this.log('info', '✅ Multi-Agent Orchestration System started successfully!');
      this.log('info', '📊 Dashboard: http://localhost:3100/dashboard');
      this.log('info', '🔌 API: http://localhost:3100/api');
      this.log('info', '📝 Logs: ' + this.logFile);

      // Health check interval
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck();
      }, 30000);

      // Keep the process alive
      this.keepAlive();
      
    } catch (error) {
      this.log('error', 'Failed to start orchestration system', { error: error.message });
      await this.shutdown();
      process.exit(1);
    }
  }

  async performHealthCheck() {
    if (this.isShuttingDown) return;

    const serviceChecks = [
      { name: 'coordinator', url: 'http://localhost:3100/health' },
      { name: 'redis', command: 'redis-cli ping' }
    ];

    for (const check of serviceChecks) {
      try {
        if (check.url) {
          const response = await require('http').get(check.url);
          if (response.statusCode !== 200) {
            throw new Error(`Health check failed for ${check.name}`);
          }
        } else if (check.command) {
          const { execSync } = require('child_process');
          execSync(check.command, { stdio: 'ignore' });
        }
      } catch (error) {
        this.log('warn', `Health check failed for ${check.name}`, { error: error.message });
      }
    }

    this.log('debug', `Health check completed. Active services: ${this.processes.size}`);
  }

  keepAlive() {
    // Keep the process running and responsive
    const alive = () => {
      if (!this.isShuttingDown) {
        setTimeout(alive, 5000);
      }
    };
    alive();
  }

  async shutdown() {
    this.log('info', 'Shutting down Multi-Agent Orchestration System...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const shutdownPromises = [];

    for (const [name, serviceInfo] of this.processes) {
      this.log('info', `Stopping service: ${name}`);
      
      const shutdownPromise = new Promise((resolve) => {
        const process = serviceInfo.process;
        
        process.on('close', () => {
          this.log('info', `Service ${name} stopped`);
          resolve();
        });

        // Try graceful shutdown first
        process.kill('SIGTERM');
        
        // Force kill after timeout
        setTimeout(() => {
          if (!process.killed) {
            this.log('warn', `Force killing service: ${name}`);
            process.kill('SIGKILL');
            resolve();
          }
        }, 5000);
      });

      shutdownPromises.push(shutdownPromise);
    }

    try {
      await Promise.all(shutdownPromises);
      this.log('info', 'All services stopped successfully');
    } catch (error) {
      this.log('error', 'Error stopping services', { error: error.message });
    }

    this.processes.clear();
  }

  getStatus() {
    const services = {};
    for (const [name, serviceInfo] of this.processes) {
      services[name] = {
        running: true,
        uptime: Date.now() - serviceInfo.startTime,
        pid: serviceInfo.process.pid
      };
    }

    return {
      orchestrator: {
        uptime: Date.now() - this.startTime,
        services: this.processes.size,
        isShuttingDown: this.isShuttingDown
      },
      services
    };
  }
}

// CLI handling
if (require.main === module) {
  const orchestrator = new MultiAgentOrchestrator();

  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      orchestrator.start();
      break;
      
    case 'status':
      console.log('Multi-Agent Orchestrator Status:');
      console.log(JSON.stringify(orchestrator.getStatus(), null, 2));
      break;
      
    case 'stop':
      orchestrator.shutdown()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error('Shutdown error:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log(`
Multi-Agent Orchestration System

Usage:
  node orchestrator.js start   - Start all services
  node orchestrator.js status  - Show system status
  node orchestrator.js stop    - Stop all services

The system includes:
  - Redis coordination server
  - Agent coordinator (port 3100)
  - Multiple specialized agents (ports 3101-3105)
  - Real-time monitoring dashboard
  - Conflict prevention system
  - WebSocket coordination

Dashboard: http://localhost:3100/dashboard
API: http://localhost:3100/api
      `);
      break;
  }
}

module.exports = MultiAgentOrchestrator;