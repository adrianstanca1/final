#!/usr/bin/env node

/**
 * Production Testing & Verification Script
 * ASAgents Platform - Production Testing Suite
 * 
 * This script performs comprehensive testing of the production deployment:
 * - API endpoint testing
 * - Database connectivity
 * - Authentication flows
 * - Multimodal functionality
 * - Performance benchmarks
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ProductionTester {
  constructor() {
    this.baseURL = process.env.VITE_API_URL || 'http://localhost:4000/api';
    this.frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runTest(testName, testFunction) {
    this.log(`🧪 Running test: ${testName}`, 'info');
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name: testName,
        status: 'PASSED',
        duration,
        result
      });
      
      this.log(`✅ ${testName} - PASSED (${duration}ms)`, 'success');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name: testName,
        status: 'FAILED',
        duration,
        error: error.message
      });
      
      this.log(`❌ ${testName} - FAILED (${duration}ms): ${error.message}`, 'error');
      throw error;
    }
  }

  async testHealthEndpoint() {
    return this.runTest('Health Endpoint', async () => {
      const response = await axios.get(`${this.baseURL}/system/health`, {
        timeout: 5000
      });
      
      if (response.status !== 200) {
        throw new Error(`Health check failed with status: ${response.status}`);
      }
      
      const health = response.data;
      if (health.status !== 'healthy') {
        throw new Error(`System not healthy: ${JSON.stringify(health)}`);
      }
      
      return health;
    });
  }

  async testDatabaseConnectivity() {
    return this.runTest('Database Connectivity', async () => {
      const response = await axios.get(`${this.baseURL}/system/health`, {
        timeout: 10000
      });
      
      const health = response.data;
      if (!health.database || health.database.status !== 'connected') {
        throw new Error('Database not connected');
      }
      
      return health.database;
    });
  }

  async testAuthenticationEndpoints() {
    return this.runTest('Authentication Endpoints', async () => {
      // Test login endpoint exists
      try {
        await axios.post(`${this.baseURL}/auth/login`, {
          email: 'test@example.com',
          password: 'invalid'
        });
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // Expected behavior for invalid credentials
          return { loginEndpoint: 'working' };
        }
        throw error;
      }
      
      throw new Error('Login endpoint should reject invalid credentials');
    });
  }

  async testOAuthEndpoints() {
    return this.runTest('OAuth Endpoints', async () => {
      const providers = ['google', 'github', 'facebook'];
      const results = {};
      
      for (const provider of providers) {
        try {
          const response = await axios.get(`${this.baseURL}/auth/${provider}`, {
            maxRedirects: 0,
            validateStatus: (status) => status === 302
          });
          
          if (response.status === 302) {
            results[provider] = 'redirect_working';
          }
        } catch (error) {
          if (error.response && error.response.status === 302) {
            results[provider] = 'redirect_working';
          } else {
            results[provider] = 'error';
          }
        }
      }
      
      return results;
    });
  }

  async testMultimodalEndpoints() {
    return this.runTest('Multimodal Endpoints', async () => {
      // Test multimodal upload endpoint
      const response = await axios.get(`${this.baseURL}/multimodal/health`, {
        timeout: 5000
      });
      
      if (response.status !== 200) {
        throw new Error(`Multimodal service not available: ${response.status}`);
      }
      
      return response.data;
    });
  }

  async testAPIPerformance() {
    return this.runTest('API Performance', async () => {
      const endpoints = [
        '/system/health',
        '/companies',
        '/projects',
        '/users'
      ];
      
      const results = {};
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        try {
          await axios.get(`${this.baseURL}${endpoint}`, {
            timeout: 5000,
            headers: {
              'Authorization': 'Bearer test-token' // This will fail but test response time
            }
          });
        } catch (error) {
          // We expect some to fail due to auth, but we're measuring response time
        }
        const responseTime = Date.now() - startTime;
        results[endpoint] = responseTime;
      }
      
      return results;
    });
  }

  async testFrontendAvailability() {
    return this.runTest('Frontend Availability', async () => {
      try {
        const response = await axios.get(this.frontendURL, {
          timeout: 10000
        });
        
        if (response.status !== 200) {
          throw new Error(`Frontend not available: ${response.status}`);
        }
        
        // Check if it's actually the React app
        const html = response.data;
        if (!html.includes('ASAgents') && !html.includes('root')) {
          throw new Error('Frontend does not appear to be the correct application');
        }
        
        return { status: 'available', size: html.length };
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Frontend server not running');
        }
        throw error;
      }
    });
  }

  async testEnvironmentConfiguration() {
    return this.runTest('Environment Configuration', async () => {
      const response = await axios.get(`${this.baseURL}/system/config`, {
        timeout: 5000
      });
      
      const config = response.data;
      const requiredConfigs = [
        'nodeEnv',
        'apiVersion',
        'corsOrigin',
        'jwtConfigured',
        'databaseConfigured'
      ];
      
      const missing = requiredConfigs.filter(key => !(key in config));
      if (missing.length > 0) {
        throw new Error(`Missing configuration: ${missing.join(', ')}`);
      }
      
      return config;
    });
  }

  async generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.status === 'PASSED').length;
    const failedTests = this.testResults.filter(t => t.status === 'FAILED').length;
    const totalDuration = Date.now() - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
        totalDuration: `${totalDuration}ms`
      },
      tests: this.testResults,
      environment: {
        baseURL: this.baseURL,
        frontendURL: this.frontendURL,
        nodeEnv: process.env.NODE_ENV
      }
    };
    
    // Save report to file
    const reportPath = path.join(__dirname, `test-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    return { report, reportPath };
  }

  async run() {
    this.log('🚀 Starting ASAgents Production Testing Suite', 'info');
    this.log(`📍 Testing API: ${this.baseURL}`, 'info');
    this.log(`📍 Testing Frontend: ${this.frontendURL}`, 'info');
    
    try {
      // Core functionality tests
      await this.testHealthEndpoint();
      await this.testDatabaseConnectivity();
      await this.testEnvironmentConfiguration();
      
      // Authentication tests
      await this.testAuthenticationEndpoints();
      await this.testOAuthEndpoints();
      
      // Feature tests
      await this.testMultimodalEndpoints();
      
      // Performance tests
      await this.testAPIPerformance();
      
      // Frontend tests
      await this.testFrontendAvailability();
      
    } catch (error) {
      this.log(`⚠️ Some tests failed, but continuing to generate report`, 'warning');
    }
    
    // Generate and save report
    const { report, reportPath } = await this.generateReport();
    
    // Display summary
    this.log('\n📊 Test Summary:', 'info');
    this.log(`✅ Passed: ${report.summary.passed}`, 'success');
    this.log(`❌ Failed: ${report.summary.failed}`, 'error');
    this.log(`📈 Success Rate: ${report.summary.successRate}`, 'info');
    this.log(`⏱️ Total Duration: ${report.summary.totalDuration}`, 'info');
    this.log(`📄 Report saved to: ${reportPath}`, 'info');
    
    if (report.summary.failed > 0) {
      this.log('\n❌ Some tests failed. Please review the issues before going live.', 'error');
      process.exit(1);
    } else {
      this.log('\n🎉 All tests passed! Your production deployment is ready.', 'success');
    }
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const tester = new ProductionTester();
  tester.run().catch(console.error);
}

module.exports = ProductionTester;
