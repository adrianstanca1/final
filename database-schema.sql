-- =====================================================
-- Construction Management App - Supabase Schema
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- =====================================================
-- ENUMS & TYPES
-- =====================================================

-- User and Company Types
CREATE TYPE user_role AS ENUM (
  'OWNER', 'ADMIN', 'PROJECT_MANAGER', 'FOREMAN', 
  'OPERATIVE', 'CLIENT', 'PRINCIPAL_ADMIN'
);

CREATE TYPE company_type AS ENUM (
  'GENERAL_CONTRACTOR', 'SUBCONTRACTOR', 'SUPPLIER', 
  'CONSULTANT', 'CLIENT'
);

CREATE TYPE subscription_plan AS ENUM (
  'FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'
);

-- Project & Task Types
CREATE TYPE project_status AS ENUM (
  'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE todo_status AS ENUM (
  'TODO', 'IN_PROGRESS', 'DONE'
);

CREATE TYPE todo_priority AS ENUM (
  'LOW', 'MEDIUM', 'HIGH'
);

-- Financial Types
CREATE TYPE invoice_status AS ENUM (
  'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'
);

CREATE TYPE quote_status AS ENUM (
  'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'
);

CREATE TYPE expense_status AS ENUM (
  'PENDING', 'APPROVED', 'REJECTED', 'PAID'
);

CREATE TYPE payment_method AS ENUM (
  'CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD'
);

-- Equipment & Safety Types
CREATE TYPE equipment_status AS ENUM (
  'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_ORDER', 'RETIRED'
);

CREATE TYPE safety_incident_severity AS ENUM (
  'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
);

CREATE TYPE availability_status AS ENUM (
  'AVAILABLE', 'BUSY', 'ON_LEAVE', 'UNAVAILABLE'
);

CREATE TYPE notification_type AS ENUM (
  'INFO', 'SUCCESS', 'WARNING', 'ERROR', 
  'APPROVAL_REQUEST', 'TASK_ASSIGNED', 'NEW_MESSAGE'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Companies Table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type company_type NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  logo TEXT,
  
  -- Address fields
  street TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Settings
  time_zone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  currency TEXT DEFAULT 'USD',
  
  -- Working hours
  work_start_time TIME DEFAULT '08:00',
  work_end_time TIME DEFAULT '17:00',
  work_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- Mon-Fri
  
  -- Features
  features JSONB DEFAULT '{
    "projectManagement": true,
    "timeTracking": true,
    "financials": true,
    "documents": true,
    "safety": true,
    "equipment": true,
    "reporting": true
  }'::jsonb,
  
  -- Subscription
  subscription_plan subscription_plan DEFAULT 'FREE',
  storage_usage_gb DECIMAL DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'Active',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users Table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar TEXT,
  
  -- Company & Role
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  department_id UUID,
  position TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  availability availability_status DEFAULT 'AVAILABLE',
  
  -- Skills & Metadata
  skills TEXT[],
  
  -- Preferences
  preferences JSONB DEFAULT '{
    "theme": "system",
    "language": "en",
    "notifications": {
      "email": true,
      "push": true,
      "sms": false,
      "taskReminders": true,
      "projectUpdates": true,
      "systemAlerts": true
    },
    "dashboard": {
      "defaultView": "dashboard",
      "pinnedWidgets": [],
      "hiddenWidgets": []
    }
  }'::jsonb,
  
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clients Table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  company_email TEXT,
  company_phone TEXT,
  
  -- Address
  billing_address TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status project_status DEFAULT 'PLANNING',
  
  -- Dates & Budget
  start_date DATE,
  end_date DATE,
  budget DECIMAL DEFAULT 0,
  spent DECIMAL DEFAULT 0,
  actual_cost DECIMAL DEFAULT 0,
  
  -- Location
  latitude DECIMAL,
  longitude DECIMAL,
  address TEXT,
  geofence_radius INTEGER, -- in meters
  
  -- Relationships
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Metadata
  image_url TEXT,
  project_type TEXT,
  work_classification TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks/Todos Table
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status todo_status DEFAULT 'TODO',
  priority todo_priority DEFAULT 'MEDIUM',
  
  -- Assignment
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Dates
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Hierarchy
  parent_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  
  -- Time tracking
  estimated_hours DECIMAL,
  actual_hours DECIMAL DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- FINANCIAL TABLES
-- =====================================================

-- Invoices Table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Dates
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  
  -- Status & Amounts
  status invoice_status DEFAULT 'DRAFT',
  subtotal DECIMAL DEFAULT 0,
  tax_rate DECIMAL DEFAULT 0,
  tax_amount DECIMAL DEFAULT 0,
  retention_rate DECIMAL DEFAULT 0,
  retention_amount DECIMAL DEFAULT 0,
  total DECIMAL DEFAULT 0,
  amount_paid DECIMAL DEFAULT 0,
  balance DECIMAL DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Line Items Table
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  unit_price DECIMAL NOT NULL,
  total DECIMAL NOT NULL,
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Payments Table
CREATE TABLE invoice_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  method payment_method NOT NULL,
  reference TEXT,
  notes TEXT,
  
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quotes Table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  quote_number TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Dates
  issue_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  
  -- Status & Amounts
  status quote_status DEFAULT 'DRAFT',
  subtotal DECIMAL DEFAULT 0,
  tax_rate DECIMAL DEFAULT 0,
  tax_amount DECIMAL DEFAULT 0,
  total DECIMAL DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Quote Line Items Table
CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  unit_price DECIMAL NOT NULL,
  total DECIMAL NOT NULL,
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Expenses Table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  description TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  category TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  status expense_status DEFAULT 'PENDING',
  
  -- Receipt & Approval
  receipt_url TEXT,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- OPERATIONAL TABLES
-- =====================================================

-- Equipment Table
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  
  -- Status & Cost
  status equipment_status DEFAULT 'AVAILABLE',
  purchase_price DECIMAL,
  current_value DECIMAL,
  daily_rate DECIMAL,
  
  -- Location & Assignment
  current_location TEXT,
  assigned_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Maintenance
  last_maintenance DATE,
  next_maintenance DATE,
  maintenance_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Safety Incidents Table
CREATE TABLE safety_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity safety_incident_severity NOT NULL,
  incident_date TIMESTAMP DEFAULT NOW(),
  location TEXT,
  
  -- Involved parties
  injured_person TEXT,
  witnesses TEXT[],
  
  -- Actions & Status
  immediate_action TEXT,
  corrective_actions TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  
  -- Media
  photos TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Time Tracking Table
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  todo_id UUID REFERENCES todos(id) ON DELETE SET NULL,
  
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  hours DECIMAL,
  
  -- Status
  is_billable BOOLEAN DEFAULT true,
  hourly_rate DECIMAL,
  
  -- Location tracking
  start_latitude DECIMAL,
  start_longitude DECIMAL,
  end_latitude DECIMAL,
  end_longitude DECIMAL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents Table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  
  -- Organization
  folder_path TEXT DEFAULT '/',
  tags TEXT[],
  
  -- Access Control
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Links & Actions
  link TEXT,
  action_required BOOLEAN DEFAULT false,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Audit Log Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Companies
CREATE INDEX idx_companies_active ON companies(is_active);

-- Profiles
CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(is_active);

-- Projects
CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_manager ON projects(manager_id);
CREATE INDEX idx_projects_client ON projects(client_id);

-- Todos
CREATE INDEX idx_todos_company ON todos(company_id);
CREATE INDEX idx_todos_project ON todos(project_id);
CREATE INDEX idx_todos_assigned ON todos(assigned_to);
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_due_date ON todos(due_date);

-- Invoices
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Time Entries
CREATE INDEX idx_time_entries_company ON time_entries(company_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(start_time);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see profiles from their company
CREATE POLICY profiles_company_access ON profiles 
  FOR ALL USING (
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Companies: Users can only see their own company
CREATE POLICY companies_own_company ON companies 
  FOR ALL USING (
    id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Projects: Users can see projects from their company
CREATE POLICY projects_company_access ON projects 
  FOR ALL USING (
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Similar policies for other tables
CREATE POLICY clients_company_access ON clients 
  FOR ALL USING (
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY todos_company_access ON todos 
  FOR ALL USING (
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY invoices_company_access ON invoices 
  FOR ALL USING (
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY invoice_line_items_company_access ON invoice_line_items 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE id = invoice_id 
      AND company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY expenses_company_access ON expenses 
  FOR ALL USING (
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY equipment_company_access ON equipment 
  FOR ALL USING (
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY time_entries_company_access ON time_entries 
  FOR ALL USING (
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY notifications_user_access ON notifications 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers to relevant tables
CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at 
  BEFORE UPDATE ON todos 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
  BEFORE UPDATE ON invoices 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, company_id, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_id', '')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'role', 'OPERATIVE')::user_role
  );
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to calculate invoice balance
CREATE OR REPLACE FUNCTION calculate_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.balance = NEW.total - NEW.amount_paid;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for invoice balance calculation
CREATE TRIGGER calculate_invoice_balance_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW 
  EXECUTE FUNCTION calculate_invoice_balance();