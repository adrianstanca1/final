-- Migration: Add notifications table and enhance existing tables
-- Version: 004
-- Description: Add notifications system and enhance backend functionality

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSON NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  INDEX idx_notifications_user_tenant (user_id, tenant_id),
  INDEX idx_notifications_unread (user_id, is_read),
  INDEX idx_notifications_created (created_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add missing columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;

-- Add missing columns to projects table if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS description TEXT NULL,
ADD COLUMN IF NOT EXISTS progress DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium';

-- Add missing columns to tasks table if they don't exist
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(8,2) NULL,
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(8,2) NULL,
ADD COLUMN IF NOT EXISTS tags JSON NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;

-- Create expenses table if it doesn't exist
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  project_id INT NULL,
  user_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
  receipt_url VARCHAR(500) NULL,
  notes TEXT NULL,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_expenses_project (project_id),
  INDEX idx_expenses_user (user_id),
  INDEX idx_expenses_status (status),
  INDEX idx_expenses_date (expense_date),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create invoices table if it doesn't exist
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  project_id INT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NULL,
  client_address TEXT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL,
  status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
  notes TEXT NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_invoice_number_tenant (invoice_number, tenant_id),
  INDEX idx_invoices_project (project_id),
  INDEX idx_invoices_status (status),
  INDEX idx_invoices_due_date (due_date),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Create invoice_line_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_line_items_invoice (invoice_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  project_id INT NULL,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NULL,
  description TEXT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_documents_project (project_id),
  INDEX idx_documents_user (user_id),
  INDEX idx_documents_category (category),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create audit_logs table for tracking changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_tenant (tenant_id),
  INDEX idx_audit_logs_user (user_id),
  INDEX idx_audit_logs_resource (resource_type, resource_id),
  INDEX idx_audit_logs_created (created_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  refresh_token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE KEY unique_session_token (session_token),
  UNIQUE KEY unique_refresh_token (refresh_token),
  INDEX idx_user_sessions_user (user_id),
  INDEX idx_user_sessions_expires (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_active ON users(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Insert default notification types (if not exists)
INSERT IGNORE INTO notifications (tenant_id, user_id, type, title, message, data) VALUES
(1, 1, 'system', 'Welcome to ASAgents', 'Welcome to the ASAgents construction management platform!', '{"category": "welcome"}');

-- Update existing data to set default values
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;
UPDATE projects SET progress = 0.00 WHERE progress IS NULL;
UPDATE projects SET priority = 'medium' WHERE priority IS NULL;
UPDATE tasks SET progress = 0 WHERE progress IS NULL;
