#!/usr/bin/env node

/**
 * SFTP Deployment Script for ASAgents Platform
 * Deploys to: access-5018479851.webspace-host.com
 */

const { Client } = require('ssh2');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SFTPDeployer {
  constructor() {
    this.config = {
      host: 'access-5018479851.webspace-host.com',
      port: 22,
      username: 'a1038987',
      password: 'Cumparavinde1'
    };

    this.remotePaths = {
      frontend: '/var/www/vhosts/access-5018479851.webspace-host.com/httpdocs',  // Standard web root
      backend: './nodejs', // Relative to home directory
      uploads: './uploads',
      logs: './logs'
    };

    this.localPaths = {
      frontend: './dist',
      backend: './server',
      package: './package.json'
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };

    console.log(`${colors[type]}[${new Date().toISOString()}] ${message}${colors.reset}`);
  }

  async connectSFTP() {
    return new Promise((resolve, reject) => {
      const conn = new Client();

      conn.on('ready', () => {
        this.log('✅ SSH connection established', 'success');

        conn.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }

          this.log('✅ SFTP connection ready', 'success');
          resolve({ conn, sftp });
        });
      });

      conn.on('error', (err) => {
        this.log(`❌ Connection error: ${err.message}`, 'error');
        reject(err);
      });

      this.log('🔗 Connecting to SFTP server...', 'info');
      conn.connect(this.config);
    });
  }

  async createRemoteDirectories(sftp) {
    this.log('📁 Creating remote directories...', 'info');

    const directories = [
      this.remotePaths.frontend,
      this.remotePaths.backend,
      this.remotePaths.uploads,
      this.remotePaths.logs,
      `${this.remotePaths.backend}/src`,
      `${this.remotePaths.backend}/node_modules`,
      `${this.remotePaths.frontend}/assets`
    ];

    for (const dir of directories) {
      try {
        await new Promise((resolve, reject) => {
          sftp.mkdir(dir, (err) => {
            if (err && err.code !== 4) { // 4 = file already exists
              reject(err);
            } else {
              resolve();
            }
          });
        });
        this.log(`📁 Created directory: ${dir}`, 'success');
      } catch (error) {
        this.log(`⚠️ Directory may already exist: ${dir}`, 'warning');
      }
    }
  }

  async uploadDirectory(sftp, localPath, remotePath) {
    this.log(`📤 Uploading ${localPath} to ${remotePath}...`, 'info');

    try {
      const stats = await fs.stat(localPath);

      if (stats.isDirectory()) {
        const files = await fs.readdir(localPath);

        for (const file of files) {
          const localFilePath = path.join(localPath, file);
          const remoteFilePath = `${remotePath}/${file}`;

          const fileStats = await fs.stat(localFilePath);

          if (fileStats.isDirectory()) {
            // Create remote directory and upload recursively
            try {
              await new Promise((resolve, reject) => {
                sftp.mkdir(remoteFilePath, (err) => {
                  if (err && err.code !== 4) reject(err);
                  else resolve();
                });
              });
            } catch (error) {
              // Directory might already exist
            }

            await this.uploadDirectory(sftp, localFilePath, remoteFilePath);
          } else {
            // Upload file
            await new Promise((resolve, reject) => {
              sftp.fastPut(localFilePath, remoteFilePath, (err) => {
                if (err) {
                  reject(err);
                } else {
                  this.log(`✅ Uploaded: ${file}`, 'success');
                  resolve();
                }
              });
            });
          }
        }
      } else {
        // Upload single file
        await new Promise((resolve, reject) => {
          sftp.fastPut(localPath, remotePath, (err) => {
            if (err) {
              reject(err);
            } else {
              this.log(`✅ Uploaded file: ${path.basename(localPath)}`, 'success');
              resolve();
            }
          });
        });
      }
    } catch (error) {
      this.log(`❌ Upload failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async deployFrontend(sftp) {
    this.log('🌐 Deploying frontend...', 'info');

    // Check if build exists
    try {
      await fs.access(this.localPaths.frontend);
    } catch (error) {
      this.log('📦 Building frontend first...', 'info');
      execSync('npm run build:production', { stdio: 'inherit' });
    }

    // Upload frontend files
    await this.uploadDirectory(sftp, this.localPaths.frontend, this.remotePaths.frontend);

    // Create .htaccess for SPA routing
    const htaccessContent = `
RewriteEngine On
RewriteBase /

# Handle Angular and React Router
RewriteRule ^index\\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Set cache headers
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
`;

    // Upload .htaccess
    const htaccessPath = '/tmp/.htaccess';
    await fs.writeFile(htaccessPath, htaccessContent.trim());

    await new Promise((resolve, reject) => {
      sftp.fastPut(htaccessPath, `${this.remotePaths.frontend}/.htaccess`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    this.log('✅ Frontend deployed successfully', 'success');
  }

  async deployBackend(sftp) {
    this.log('🔧 Deploying backend...', 'info');

    // Upload backend files (excluding node_modules)
    const backendFiles = [
      'src',
      'package.json',
      'package-lock.json',
      '.env.production'
    ];

    for (const file of backendFiles) {
      const localPath = path.join(this.localPaths.backend, file);
      const remotePath = `${this.remotePaths.backend}/${file}`;

      try {
        await fs.access(localPath);

        const stats = await fs.stat(localPath);
        if (stats.isDirectory()) {
          await this.uploadDirectory(sftp, localPath, remotePath);
        } else {
          await this.uploadDirectory(sftp, localPath, remotePath);
        }
      } catch (error) {
        this.log(`⚠️ Skipping ${file} (not found)`, 'warning');
      }
    }

    this.log('✅ Backend files uploaded', 'success');
  }

  async installDependencies(conn) {
    this.log('📦 Checking for Node.js and npm...', 'info');

    return new Promise((resolve, reject) => {
      // First check if npm is available
      conn.exec(`which npm || which node`, (err, stream) => {
        if (err) {
          this.log('⚠️ Node.js/npm not found on server. Skipping dependency installation.', 'warning');
          this.log('ℹ️ You may need to install dependencies manually or contact your hosting provider.', 'info');
          resolve();
          return;
        }

        let output = '';

        stream.on('close', (code) => {
          if (code === 0 && output.trim()) {
            this.log('✅ Node.js found, attempting to install dependencies...', 'success');

            // Try to install dependencies
            conn.exec(`cd nodejs && npm install --production`, (err, installStream) => {
              if (err) {
                this.log('⚠️ npm install failed, but files are uploaded', 'warning');
                resolve();
                return;
              }

              installStream.on('close', (installCode) => {
                if (installCode === 0) {
                  this.log('✅ Dependencies installed successfully', 'success');
                } else {
                  this.log('⚠️ npm install had issues, but continuing...', 'warning');
                }
                resolve();
              });

              installStream.on('data', (data) => {
                process.stdout.write(data);
              });
            });
          } else {
            this.log('⚠️ Node.js/npm not available. Files uploaded successfully.', 'warning');
            this.log('ℹ️ Contact your hosting provider to enable Node.js support.', 'info');
            resolve();
          }
        });

        stream.on('data', (data) => {
          output += data.toString();
        });
      });
    });
  }

  async startBackend(conn) {
    this.log('🚀 Attempting to start backend service...', 'info');

    return new Promise((resolve, reject) => {
      // Check if Node.js is available
      conn.exec(`which node`, (err, stream) => {
        if (err) {
          this.log('⚠️ Node.js not found. Backend files uploaded but not started.', 'warning');
          this.log('ℹ️ Contact your hosting provider to enable Node.js and start the backend manually.', 'info');
          resolve();
          return;
        }

        let output = '';

        stream.on('close', (code) => {
          if (code === 0 && output.trim()) {
            this.log('✅ Node.js found, starting backend...', 'success');

            // Kill any existing process first
            conn.exec(`pkill -f "node.*src/index.js" || true`, (err, killStream) => {
              killStream.on('close', () => {
                // Start new process
                conn.exec(`cd nodejs && nohup node src/index.js > ../logs/app.log 2>&1 &`, (err, startStream) => {
                  if (err) {
                    this.log('⚠️ Failed to start backend, but files are uploaded', 'warning');
                    resolve();
                    return;
                  }

                  startStream.on('close', (startCode) => {
                    this.log('✅ Backend service start command executed', 'success');
                    resolve();
                  });

                  startStream.on('data', (data) => {
                    process.stdout.write(data);
                  });
                });
              });
            });
          } else {
            this.log('⚠️ Node.js not available. Backend files uploaded successfully.', 'warning');
            this.log('ℹ️ You may need to configure Node.js with your hosting provider.', 'info');
            resolve();
          }
        });

        stream.on('data', (data) => {
          output += data.toString();
        });
      });
    });
  }

  async deploy() {
    this.log('🚀 Starting SFTP deployment to webspace-host.com...', 'info');

    let conn, sftp;

    try {
      // Connect to SFTP
      ({ conn, sftp } = await this.connectSFTP());

      // Create remote directories
      await this.createRemoteDirectories(sftp);

      // Deploy frontend
      await this.deployFrontend(sftp);

      // Deploy backend
      await this.deployBackend(sftp);

      // Install dependencies
      await this.installDependencies(conn);

      // Start backend service
      await this.startBackend(conn);

      this.log('🎉 Deployment completed successfully!', 'success');
      this.log('🌐 Your ASAgents platform should now be live!', 'success');

    } catch (error) {
      this.log(`❌ Deployment failed: ${error.message}`, 'error');
      throw error;
    } finally {
      if (conn) {
        conn.end();
        this.log('🔌 Connection closed', 'info');
      }
    }
  }
}

// Run deployment if script is executed directly
if (require.main === module) {
  const deployer = new SFTPDeployer();
  deployer.deploy().catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
}

module.exports = SFTPDeployer;
