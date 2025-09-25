/**
 * Multi-Agent Monitoring and Coordination API
 * Real-time monitoring, health checks, and coordination endpoints
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { agentCoordinator } from './agentCoordinator.js';
import { conflictPrevention } from './conflictPrevention.js';
import { performance } from 'perf_hooks';

interface MonitoringMetrics {
  timestamp: number;
  agents: {
    total: number;
    active: number;
    idle: number;
    error: number;
  };
  tasks: {
    queued: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  conflicts: {
    total: number;
    resolved: number;
    pending: number;
  };
  resources: {
    lockedFiles: number;
    trackedFiles: number;
    activeIntents: number;
  };
  performance: {
    avgTaskTime: number;
    avgResponseTime: number;
    systemLoad: number;
    memoryUsage: number;
  };
}

interface CoordinationEvent {
  type: 'agent_status' | 'task_update' | 'conflict_detected' | 'resource_lock' | 'system_alert';
  timestamp: number;
  data: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

class MultiAgentMonitoringAPI {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer | null = null;
  private metrics: MonitoringMetrics[] = [];
  private connectedClients: Set<any> = new Set();
  private eventLog: CoordinationEvent[] = [];
  private readonly MAX_METRICS = 1000;
  private readonly MAX_EVENTS = 5000;

  constructor(private port: number = 3200) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.startMetricsCollection();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request logging
    this.app.use((req, res, next) => {
      const start = performance.now();
      res.on('finish', () => {
        const duration = performance.now() - start;
        this.logEvent({
          type: 'system_alert',
          timestamp: Date.now(),
          data: { method: req.method, path: req.path, duration, status: res.statusCode },
          severity: 'info'
        });
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const health = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime(),
        services: {
          coordinator: this.isCoordinatorHealthy(),
          conflictPrevention: this.isConflictPreventionHealthy(),
          monitoring: true,
          websocket: this.wss !== null
        }
      };
      res.json(health);
    });

    // Real-time metrics endpoint
    this.app.get('/api/metrics', (req, res) => {
      const limit = parseInt(req.query.limit as string) || 100;
      const recent = this.metrics.slice(-limit);
      res.json({
        metrics: recent,
        total: this.metrics.length,
        latest: recent[recent.length - 1] || null
      });
    });

    // Current system status
    this.app.get('/api/status', (req, res) => {
      const status = {
        timestamp: Date.now(),
        coordinator: agentCoordinator.getStatus(),
        conflicts: conflictPrevention.getConflictStats(),
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          version: process.version,
          platform: process.platform
        }
      };
      res.json(status);
    });

    // Agent management
    this.app.get('/api/agents', (req, res) => {
      const agents = agentCoordinator.getAllAgents();
      res.json({ agents, count: agents.length });
    });

    this.app.post('/api/agents/:agentId/register', (req, res) => {
      const { agentId } = req.params;
      const { capabilities, metadata } = req.body;
      
      try {
        agentCoordinator.registerAgent(agentId, capabilities || [], metadata);
        conflictPrevention.registerAgent(agentId);
        
        this.broadcast({
          type: 'agent_status',
          timestamp: Date.now(),
          data: { agentId, action: 'registered', capabilities, metadata },
          severity: 'info'
        });
        
        res.json({ success: true, message: `Agent ${agentId} registered successfully` });
      } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
      }
    });

    this.app.delete('/api/agents/:agentId', (req, res) => {
      const { agentId } = req.params;
      
      try {
        agentCoordinator.unregisterAgent(agentId);
        conflictPrevention.unregisterAgent(agentId);
        
        this.broadcast({
          type: 'agent_status',
          timestamp: Date.now(),
          data: { agentId, action: 'unregistered' },
          severity: 'info'
        });
        
        res.json({ success: true, message: `Agent ${agentId} unregistered successfully` });
      } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
      }
    });

    // Task management
    this.app.get('/api/tasks', (req, res) => {
      const tasks = agentCoordinator.getAllTasks();
      res.json({ tasks, count: tasks.length });
    });

    this.app.post('/api/tasks', (req, res) => {
      const { type, priority, targetFiles, dependencies, metadata } = req.body;
      
      if (!type) {
        return res.status(400).json({ success: false, error: 'Task type is required' });
      }
      
      try {
        const taskId = agentCoordinator.createTask(type, priority, targetFiles, dependencies, metadata);
        
        this.broadcast({
          type: 'task_update',
          timestamp: Date.now(),
          data: { taskId, type, action: 'created' },
          severity: 'info'
        });
        
        res.json({ success: true, taskId });
      } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
      }
    });

    this.app.get('/api/tasks/:taskId', (req, res) => {
      const { taskId } = req.params;
      const task = agentCoordinator.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }
      
      res.json({ task });
    });

    // Resource and conflict management
    this.app.get('/api/resources', (req, res) => {
      const stats = conflictPrevention.getConflictStats();
      res.json(stats);
    });

    this.app.post('/api/resources/lock', (req, res) => {
      const { filePath, agentId, lockType } = req.body;
      
      if (!filePath || !agentId || !lockType) {
        return res.status(400).json({ success: false, error: 'filePath, agentId, and lockType are required' });
      }
      
      conflictPrevention.requestFileLock(filePath, agentId, lockType)
        .then(acquired => {
          if (acquired) {
            this.broadcast({
              type: 'resource_lock',
              timestamp: Date.now(),
              data: { filePath, agentId, lockType, action: 'acquired' },
              severity: 'info'
            });
          }
          res.json({ success: acquired, acquired });
        })
        .catch(error => {
          res.status(500).json({ success: false, error: error.message });
        });
    });

    this.app.delete('/api/resources/lock', (req, res) => {
      const { filePath, agentId } = req.body;
      
      if (!filePath || !agentId) {
        return res.status(400).json({ success: false, error: 'filePath and agentId are required' });
      }
      
      try {
        conflictPrevention.releaseFileLock(filePath, agentId);
        
        this.broadcast({
          type: 'resource_lock',
          timestamp: Date.now(),
          data: { filePath, agentId, action: 'released' },
          severity: 'info'
        });
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
      }
    });

    // Event log
    this.app.get('/api/events', (req, res) => {
      const limit = parseInt(req.query.limit as string) || 100;
      const severity = req.query.severity as string;
      
      let events = this.eventLog;
      if (severity) {
        events = events.filter(e => e.severity === severity);
      }
      
      const recent = events.slice(-limit);
      res.json({
        events: recent,
        total: events.length,
        filters: { severity }
      });
    });

    // Coordination commands
    this.app.post('/api/coordinate', (req, res) => {
      const { agentId, filePath, operation } = req.body;
      
      if (!agentId || !filePath || !operation) {
        return res.status(400).json({ success: false, error: 'agentId, filePath, and operation are required' });
      }
      
      conflictPrevention.coordinateFileAccess(filePath, agentId, operation)
        .then(approved => {
          this.broadcast({
            type: 'conflict_detected',
            timestamp: Date.now(),
            data: { agentId, filePath, operation, approved },
            severity: approved ? 'info' : 'warning'
          });
          
          res.json({ success: true, approved });
        })
        .catch(error => {
          res.status(500).json({ success: false, error: error.message });
        });
    });

    // Dashboard endpoint
    this.app.get('/dashboard', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Multi-Agent Coordination Dashboard</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .dashboard { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .metric { margin: 10px 0; }
            .metric-value { font-size: 24px; font-weight: bold; color: #2196F3; }
            .metric-label { color: #666; }
            .event-log { max-height: 300px; overflow-y: auto; }
            .event { padding: 8px; border-left: 3px solid #ddd; margin: 5px 0; }
            .event.error { border-color: #f44336; }
            .event.warning { border-color: #ff9800; }
            .event.info { border-color: #4caf50; }
            .status-indicator { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
            .status-healthy { background-color: #4caf50; }
            .status-warning { background-color: #ff9800; }
            .status-error { background-color: #f44336; }
          </style>
        </head>
        <body>
          <h1>🤖 Multi-Agent Coordination Dashboard</h1>
          
          <div class="dashboard">
            <div class="card">
              <h2>System Status</h2>
              <div id="system-status">Loading...</div>
            </div>
            
            <div class="card">
              <h2>Agent Metrics</h2>
              <div id="agent-metrics">Loading...</div>
            </div>
            
            <div class="card">
              <h2>Task Metrics</h2>
              <div id="task-metrics">Loading...</div>
            </div>
            
            <div class="card">
              <h2>Recent Events</h2>
              <div id="event-log" class="event-log">Loading...</div>
            </div>
          </div>

          <script>
            // Dashboard JavaScript
            let ws;
            
            function connectWebSocket() {
              ws = new WebSocket('ws://localhost:${this.port}/ws');
              ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                updateDashboard(data);
              };
              ws.onclose = () => setTimeout(connectWebSocket, 5000);
            }
            
            function updateDashboard(data) {
              if (data.type === 'metrics') {
                updateMetrics(data.metrics);
              } else if (data.type === 'event') {
                addEvent(data.event);
              }
            }
            
            function updateMetrics(metrics) {
              document.getElementById('agent-metrics').innerHTML = \`
                <div class="metric"><div class="metric-value">\${metrics.agents?.total || 0}</div><div class="metric-label">Total Agents</div></div>
                <div class="metric"><div class="metric-value">\${metrics.agents?.active || 0}</div><div class="metric-label">Active Agents</div></div>
              \`;
              
              document.getElementById('task-metrics').innerHTML = \`
                <div class="metric"><div class="metric-value">\${metrics.tasks?.queued || 0}</div><div class="metric-label">Queued Tasks</div></div>
                <div class="metric"><div class="metric-value">\${metrics.tasks?.inProgress || 0}</div><div class="metric-label">In Progress</div></div>
                <div class="metric"><div class="metric-value">\${metrics.tasks?.completed || 0}</div><div class="metric-label">Completed</div></div>
              \`;
            }
            
            function addEvent(event) {
              const log = document.getElementById('event-log');
              const eventEl = document.createElement('div');
              eventEl.className = \`event \${event.severity}\`;
              eventEl.innerHTML = \`
                <strong>\${new Date(event.timestamp).toLocaleTimeString()}</strong>
                \${event.type}: \${JSON.stringify(event.data)}
              \`;
              log.insertBefore(eventEl, log.firstChild);
              
              // Keep only recent events
              while (log.children.length > 100) {
                log.removeChild(log.lastChild);
              }
            }
            
            // Initial load
            async function loadInitialData() {
              try {
                const [statusRes, metricsRes, eventsRes] = await Promise.all([
                  fetch('/api/status'),
                  fetch('/api/metrics?limit=1'),
                  fetch('/api/events?limit=50')
                ]);
                
                const status = await statusRes.json();
                const metrics = await metricsRes.json();
                const events = await eventsRes.json();
                
                // Update status
                const statusEl = document.getElementById('system-status');
                statusEl.innerHTML = \`
                  <div class="metric">
                    <span class="status-indicator status-\${status.coordinator ? 'healthy' : 'error'}"></span>
                    Coordinator: \${status.coordinator ? 'Healthy' : 'Error'}
                  </div>
                  <div class="metric">
                    <span class="status-indicator status-healthy"></span>
                    Uptime: \${Math.floor(status.system.uptime / 60)} minutes
                  </div>
                  <div class="metric">
                    <div class="metric-value">\${Math.floor(status.system.memory.heapUsed / 1024 / 1024)}MB</div>
                    <div class="metric-label">Memory Usage</div>
                  </div>
                \`;
                
                // Update metrics
                if (metrics.latest) {
                  updateMetrics(metrics.latest);
                }
                
                // Load events
                events.events.forEach(addEvent);
                
              } catch (error) {
                console.error('Failed to load initial data:', error);
              }
            }
            
            loadInitialData();
            connectWebSocket();
            setInterval(loadInitialData, 10000); // Refresh every 10 seconds
          </script>
        </body>
        </html>
      `);
    });
  }

  private setupWebSocket(): void {
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws) => {
      this.connectedClients.add(ws);
      console.log(`📡 WebSocket client connected (${this.connectedClients.size} total)`);

      ws.on('close', () => {
        this.connectedClients.delete(ws);
        console.log(`📡 WebSocket client disconnected (${this.connectedClients.size} total)`);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send initial metrics
      const latestMetrics = this.metrics[this.metrics.length - 1];
      if (latestMetrics) {
        ws.send(JSON.stringify({
          type: 'metrics',
          metrics: latestMetrics
        }));
      }
    });
  }

  private startMetricsCollection(): void {
    const collectMetrics = () => {
      try {
        const coordinatorStatus = agentCoordinator.getStatus();
        const conflictStats = conflictPrevention.getConflictStats();
        const memoryUsage = process.memoryUsage();

        const metrics: MonitoringMetrics = {
          timestamp: Date.now(),
          agents: {
            total: coordinatorStatus.totalAgents,
            active: coordinatorStatus.activeAgents,
            idle: coordinatorStatus.totalAgents - coordinatorStatus.activeAgents,
            error: 0 // Would need error tracking
          },
          tasks: {
            queued: coordinatorStatus.queuedTasks,
            inProgress: coordinatorStatus.activeTasks,
            completed: coordinatorStatus.completedTasks,
            failed: 0 // Would need error tracking
          },
          conflicts: {
            total: 0, // Would need conflict tracking
            resolved: 0,
            pending: 0
          },
          resources: {
            lockedFiles: conflictStats.activeLocks,
            trackedFiles: conflictStats.trackedFiles,
            activeIntents: conflictStats.activeIntents
          },
          performance: {
            avgTaskTime: 0, // Would need task timing
            avgResponseTime: 0, // Would need response timing
            systemLoad: process.cpuUsage().system / 1000000,
            memoryUsage: memoryUsage.heapUsed / 1024 / 1024
          }
        };

        this.metrics.push(metrics);
        
        // Limit metrics history
        if (this.metrics.length > this.MAX_METRICS) {
          this.metrics = this.metrics.slice(-this.MAX_METRICS);
        }

        // Broadcast to WebSocket clients
        this.broadcast({
          type: 'system_alert',
          timestamp: Date.now(),
          data: metrics,
          severity: 'info'
        });

      } catch (error) {
        console.error('Failed to collect metrics:', error);
      }
    };

    // Collect metrics every 5 seconds
    setInterval(collectMetrics, 5000);
    collectMetrics(); // Initial collection
  }

  private isCoordinatorHealthy(): boolean {
    try {
      const status = agentCoordinator.getStatus();
      return status.totalAgents >= 0; // Basic health check
    } catch {
      return false;
    }
  }

  private isConflictPreventionHealthy(): boolean {
    try {
      const stats = conflictPrevention.getConflictStats();
      return stats.trackedFiles >= 0; // Basic health check
    } catch {
      return false;
    }
  }

  private broadcast(event: CoordinationEvent): void {
    this.logEvent(event);
    
    const message = JSON.stringify({
      type: 'event',
      event
    });

    this.connectedClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  private logEvent(event: CoordinationEvent): void {
    this.eventLog.push(event);
    
    // Limit event log size
    if (this.eventLog.length > this.MAX_EVENTS) {
      this.eventLog = this.eventLog.slice(-this.MAX_EVENTS);
    }

    // Console logging for important events
    if (event.severity === 'error' || event.severity === 'critical') {
      console.error(`[${event.severity.toUpperCase()}] ${event.type}:`, event.data);
    } else if (event.severity === 'warning') {
      console.warn(`[${event.severity.toUpperCase()}] ${event.type}:`, event.data);
    }
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`🖥️  Multi-Agent Monitoring API started on port ${this.port}`);
        console.log(`📊 Dashboard available at: http://localhost:${this.port}/dashboard`);
        console.log(`🔌 WebSocket endpoint: ws://localhost:${this.port}/ws`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close();
      }
      if (this.server) {
        this.server.close(() => {
          console.log('🖥️  Multi-Agent Monitoring API stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Singleton instance
export const multiAgentMonitoringAPI = new MultiAgentMonitoringAPI();

// Auto-start if this module is run directly
if (require.main === module) {
  multiAgentMonitoringAPI.start().catch(console.error);
}