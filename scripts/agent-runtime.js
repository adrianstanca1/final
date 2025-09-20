#!/usr/bin/env node

/**
 * Agent Runtime - Manages individual agent instances
 * Connects to coordinator and handles task execution
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

class AgentRuntime {
  constructor() {
    this.agentId = process.env.AGENT_ID || `agent-${Date.now()}`;
    this.agentRole = process.env.AGENT_ROLE || 'primary';
    this.specialty = process.env.AGENT_SPECIALTY || 'general';
    this.coordinatorUrl = process.env.COORDINATOR_URL || 'http://coordinator:3000';
    this.port = parseInt(process.env.PORT || '3000');
    
    this.currentTask = null;
    this.capabilities = this.defineCapabilities();
    this.isRegistered = false;
    
    console.log(`🤖 Initializing Agent Runtime:`);
    console.log(`   ID: ${this.agentId}`);
    console.log(`   Role: ${this.agentRole}`);
    console.log(`   Specialty: ${this.specialty}`);
    console.log(`   Coordinator: ${this.coordinatorUrl}`);
  }

  defineCapabilities() {
    const capabilities = [];
    
    switch (this.specialty) {
      case 'frontend':
        capabilities.push({
          domain: 'components',
          modules: ['*.tsx', '*.jsx', '*.css', '*.scss'],
          operations: ['read', 'write', 'create', 'delete', 'modify']
        });
        capabilities.push({
          domain: 'hooks',
          modules: ['*.ts', '*.js'],
          operations: ['read', 'write', 'create', 'delete', 'modify']
        });
        capabilities.push({
          domain: 'utils',
          modules: ['*.ts', '*.js'],
          operations: ['read', 'write', 'create', 'modify']
        });
        break;
        
      case 'backend':
        capabilities.push({
          domain: 'services',
          modules: ['*.ts', '*.js'],
          operations: ['read', 'write', 'create', 'delete', 'modify']
        });
        capabilities.push({
          domain: 'api',
          modules: ['*.ts', '*.js'],
          operations: ['read', 'write', 'create', 'delete', 'modify']
        });
        capabilities.push({
          domain: 'backend',
          modules: ['*.ts', '*.js', '*.sql'],
          operations: ['read', 'write', 'create', 'delete', 'modify']
        });
        break;
        
      case 'deployment':
        capabilities.push({
          domain: 'scripts',
          modules: ['*.js', '*.sh', '*.yml', '*.yaml'],
          operations: ['read', 'write', 'create', 'modify']
        });
        capabilities.push({
          domain: 'config',
          modules: ['*.json', '*.js', '*.yml', '*.yaml'],
          operations: ['read', 'write', 'modify']
        });
        capabilities.push({
          domain: 'docker',
          modules: ['Dockerfile', 'docker-compose.yml'],
          operations: ['read', 'write', 'modify']
        });
        break;
        
      default:
        // General capabilities for primary agents
        capabilities.push({
          domain: 'general',
          modules: ['*.*'],
          operations: ['read', 'write', 'create', 'delete', 'modify']
        });
        break;
    }
    
    return capabilities;
  }

  async start() {
    try {
      // Start health check server
      await this.startHealthServer();
      
      // Wait for coordinator to be available
      await this.waitForCoordinator();
      
      // Register with coordinator
      await this.registerWithCoordinator();
      
      // Start task polling
      this.startTaskPolling();
      
      console.log(`✅ Agent ${this.agentId} started successfully`);
    } catch (error) {
      console.error(`❌ Failed to start agent ${this.agentId}:`, error);
      process.exit(1);
    }
  }

  async startHealthServer() {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'healthy',
            agentId: this.agentId,
            role: this.agentRole,
            specialty: this.specialty,
            currentTask: this.currentTask ? this.currentTask.id : null,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
          }));
        } else if (req.url === '/status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            agentId: this.agentId,
            role: this.agentRole,
            specialty: this.specialty,
            capabilities: this.capabilities,
            currentTask: this.currentTask,
            isRegistered: this.isRegistered
          }));
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      server.listen(this.port, () => {
        console.log(`🏥 Health server listening on port ${this.port}`);
        resolve();
      });

      server.on('error', reject);
    });
  }

  async waitForCoordinator(maxRetries = 30, delay = 2000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.makeRequest('/health', 'GET');
        console.log(`🔗 Coordinator is available`);
        return;
      } catch (error) {
        console.log(`⏳ Waiting for coordinator... (${i + 1}/${maxRetries})`);
        await this.sleep(delay);
      }
    }
    throw new Error('Coordinator not available after maximum retries');
  }

  async registerWithCoordinator() {
    try {
      const registrationData = {
        id: this.agentId,
        name: `Agent-${this.specialty}-${this.agentId.split('-').pop()}`,
        type: this.agentRole,
        capabilities: this.capabilities
      };

      const response = await this.makeRequest('/agents/register', 'POST', registrationData);
      console.log(`📋 Registered with coordinator:`, response);
      this.isRegistered = true;
    } catch (error) {
      console.error(`❌ Registration failed:`, error);
      throw error;
    }
  }

  startTaskPolling() {
    const pollInterval = 5000; // 5 seconds
    
    setInterval(async () => {
      if (!this.currentTask) {
        try {
          const task = await this.requestTask();
          if (task) {
            await this.executeTask(task);
          }
        } catch (error) {
          console.error(`❌ Task polling error:`, error);
        }
      }
    }, pollInterval);
    
    console.log(`🔄 Started task polling (${pollInterval}ms interval)`);
  }

  async requestTask() {
    try {
      const response = await this.makeRequest(`/agents/${this.agentId}/tasks/next`, 'GET');
      return response.task || null;
    } catch (error) {
      // Silently handle no tasks available
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async executeTask(task) {
    console.log(`📋 Executing task: ${task.description}`);
    this.currentTask = task;
    
    try {
      // Update status to in-progress
      await this.updateTaskStatus(task.id, 'in-progress');
      
      // Execute the task based on its description
      const result = await this.performTaskExecution(task);
      
      // Mark task as completed
      await this.completeTask(task.id, result);
      
      console.log(`✅ Task completed: ${task.id}`);
    } catch (error) {
      console.error(`❌ Task execution failed: ${task.id}`, error);
      await this.failTask(task.id, error.message);
    } finally {
      this.currentTask = null;
    }
  }

  async performTaskExecution(task) {
    // Parse the task description to determine what to do
    const description = task.description.toLowerCase();
    
    if (description.includes('modify') || description.includes('edit')) {
      return await this.handleModifyTask(task);
    } else if (description.includes('create')) {
      return await this.handleCreateTask(task);
    } else if (description.includes('delete')) {
      return await this.handleDeleteTask(task);
    } else if (description.includes('analyze') || description.includes('review')) {
      return await this.handleAnalyzeTask(task);
    } else if (description.includes('build') || description.includes('deploy')) {
      return await this.handleBuildTask(task);
    } else {
      return await this.handleGenericTask(task);
    }
  }

  async handleModifyTask(task) {
    console.log(`✏️  Handling modify task: ${task.description}`);
    
    // Extract file path from task description
    const filePath = this.extractFilePath(task.description);
    if (!filePath) {
      throw new Error('No file path found in task description');
    }

    // Request exclusive lock for the file
    const lockAcquired = await this.requestLock(filePath, 'exclusive');
    if (!lockAcquired) {
      throw new Error(`Could not acquire lock for ${filePath}`);
    }

    try {
      // Check if file exists and is accessible
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read current content
      const currentContent = fs.readFileSync(filePath, 'utf8');
      
      // Perform modifications (this would be enhanced with actual logic)
      const modifiedContent = await this.applyModifications(currentContent, task);
      
      // Write back if changed
      if (modifiedContent !== currentContent) {
        fs.writeFileSync(filePath, modifiedContent);
        console.log(`📝 Modified file: ${filePath}`);
      }

      return { success: true, filePath, changes: modifiedContent !== currentContent };
    } finally {
      // Always release the lock
      await this.releaseLock(filePath);
    }
  }

  async handleCreateTask(task) {
    console.log(`🆕 Handling create task: ${task.description}`);
    
    const filePath = this.extractFilePath(task.description);
    if (!filePath) {
      throw new Error('No file path found in task description');
    }

    // Request exclusive lock for the file
    const lockAcquired = await this.requestLock(filePath, 'exclusive');
    if (!lockAcquired) {
      throw new Error(`Could not acquire lock for ${filePath}`);
    }

    try {
      if (fs.existsSync(filePath)) {
        throw new Error(`File already exists: ${filePath}`);
      }

      // Create directory if needed
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Generate content for new file
      const content = await this.generateFileContent(filePath, task);
      fs.writeFileSync(filePath, content);
      
      console.log(`📄 Created file: ${filePath}`);
      return { success: true, filePath, created: true };
    } finally {
      await this.releaseLock(filePath);
    }
  }

  async handleDeleteTask(task) {
    console.log(`🗑️  Handling delete task: ${task.description}`);
    
    const filePath = this.extractFilePath(task.description);
    if (!filePath) {
      throw new Error('No file path found in task description');
    }

    const lockAcquired = await this.requestLock(filePath, 'exclusive');
    if (!lockAcquired) {
      throw new Error(`Could not acquire lock for ${filePath}`);
    }

    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File already doesn't exist: ${filePath}`);
        return { success: true, filePath, alreadyDeleted: true };
      }

      fs.unlinkSync(filePath);
      console.log(`🗑️  Deleted file: ${filePath}`);
      return { success: true, filePath, deleted: true };
    } finally {
      await this.releaseLock(filePath);
    }
  }

  async handleAnalyzeTask(task) {
    console.log(`🔍 Handling analyze task: ${task.description}`);
    
    const filePath = this.extractFilePath(task.description);
    if (!filePath) {
      throw new Error('No file path found in task description');
    }

    const lockAcquired = await this.requestLock(filePath, 'read');
    if (!lockAcquired) {
      throw new Error(`Could not acquire lock for ${filePath}`);
    }

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const analysis = await this.performAnalysis(content, filePath, task);
      
      console.log(`📊 Analyzed file: ${filePath}`);
      return { success: true, filePath, analysis };
    } finally {
      await this.releaseLock(filePath);
    }
  }

  async handleBuildTask(task) {
    console.log(`🔨 Handling build task: ${task.description}`);
    
    // Build tasks typically don't need file locks, but coordinate with other agents
    const buildCommand = this.extractBuildCommand(task.description);
    
    try {
      const result = await this.executeCommand(buildCommand);
      console.log(`🔨 Build completed: ${buildCommand}`);
      return { success: true, command: buildCommand, result };
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  async handleGenericTask(task) {
    console.log(`⚙️  Handling generic task: ${task.description}`);
    
    // For generic tasks, just simulate some work
    await this.sleep(Math.random() * 3000 + 1000); // 1-4 seconds
    
    return { success: true, message: 'Generic task completed' };
  }

  extractFilePath(description) {
    // Simple regex to extract file paths from description
    const patterns = [
      /\/[a-zA-Z0-9/_.-]+\.[a-zA-Z0-9]+/g,
      /[a-zA-Z0-9]+\/[a-zA-Z0-9/_.-]+\.[a-zA-Z0-9]+/g,
      /[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+/g,
    ];
    
    for (const pattern of patterns) {
      const matches = description.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }
    
    return null;
  }

  extractBuildCommand(description) {
    // Extract build commands from task description
    if (description.includes('npm')) return 'npm run build';
    if (description.includes('docker')) return 'docker build -t app .';
    if (description.includes('deploy')) return 'npm run deploy';
    return 'echo "Build task simulated"';
  }

  async applyModifications(content, task) {
    // This would be enhanced with actual modification logic
    // For now, just add a comment to show the agent worked
    const timestamp = new Date().toISOString();
    const agentComment = `\n// Modified by ${this.agentId} at ${timestamp}\n`;
    
    if (content.includes('.ts') || content.includes('.js')) {
      return content + agentComment;
    }
    
    return content;
  }

  async generateFileContent(filePath, task) {
    // Generate appropriate content based on file type
    const ext = path.extname(filePath);
    const timestamp = new Date().toISOString();
    
    switch (ext) {
      case '.ts':
      case '.js':
        return `// Generated by ${this.agentId} at ${timestamp}\n// Task: ${task.description}\n\nexport {};\n`;
      case '.json':
        return JSON.stringify({ 
          generatedBy: this.agentId, 
          timestamp, 
          task: task.description 
        }, null, 2);
      case '.md':
        return `# Generated by ${this.agentId}\n\nGenerated at: ${timestamp}\nTask: ${task.description}\n`;
      default:
        return `Generated by ${this.agentId} at ${timestamp}\nTask: ${task.description}\n`;
    }
  }

  async performAnalysis(content, filePath, task) {
    // Simple analysis - count lines, characters, etc.
    const lines = content.split('\n').length;
    const chars = content.length;
    const words = content.split(/\s+/).length;
    
    return {
      lines,
      characters: chars,
      words,
      fileType: path.extname(filePath),
      timestamp: new Date().toISOString()
    };
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], { stdio: 'pipe' });
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, exitCode: code });
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', reject);
    });
  }

  async requestLock(resourcePath, lockType) {
    try {
      const response = await this.makeRequest('/locks/request', 'POST', {
        agentId: this.agentId,
        resourcePath,
        lockType
      });
      return response.success;
    } catch (error) {
      console.error(`❌ Lock request failed: ${resourcePath}`, error);
      return false;
    }
  }

  async releaseLock(resourcePath) {
    try {
      await this.makeRequest('/locks/release', 'POST', {
        agentId: this.agentId,
        resourcePath
      });
    } catch (error) {
      console.error(`❌ Lock release failed: ${resourcePath}`, error);
    }
  }

  async updateTaskStatus(taskId, status) {
    await this.makeRequest(`/tasks/${taskId}/status`, 'PUT', { status, agentId: this.agentId });
  }

  async completeTask(taskId, result) {
    await this.makeRequest(`/tasks/${taskId}/complete`, 'POST', { 
      agentId: this.agentId, 
      result 
    });
  }

  async failTask(taskId, error) {
    await this.makeRequest(`/tasks/${taskId}/fail`, 'POST', { 
      agentId: this.agentId, 
      error 
    });
  }

  async makeRequest(path, method, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.coordinatorUrl);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `Agent-${this.agentId}`
        }
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${response.message || body}`));
            }
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${body}`));
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the agent
if (require.main === module) {
  const agent = new AgentRuntime();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down agent...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Terminating agent...');
    process.exit(0);
  });
  
  agent.start().catch(error => {
    console.error('❌ Agent startup failed:', error);
    process.exit(1);
  });
}

module.exports = AgentRuntime;