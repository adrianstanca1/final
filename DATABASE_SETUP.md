# Database Schema Setup Instructions

## How to Apply the Schema to Supabase

1. **Open Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Navigate to your project: `qglvhxkgbzujglehewsa`

2. **Access SQL Editor**
   - In the left sidebar, click on "SQL Editor"
   - Create a new query

3. **Execute the Schema**
   - Copy the contents of `database-schema.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

4. **Verify Schema Creation**
   - Check the "Table Editor" to see all tables created
   - Verify that RLS (Row Level Security) policies are enabled
   - Confirm that enums and types were created properly

## Schema Overview

### Core Tables Created:
- **companies**: Company/organization data
- **profiles**: User profiles (extends Supabase auth.users)
- **clients**: Customer/client information
- **projects**: Construction projects
- **todos**: Tasks and project items
- **invoices**: Invoice management
- **expenses**: Expense tracking
- **equipment**: Equipment management
- **safety_incidents**: Safety reporting
- **time_entries**: Time tracking
- **documents**: File management
- **notifications**: User notifications
- **audit_logs**: Activity tracking

### Security Features:
- Row Level Security (RLS) enabled on all tables
- Multi-tenant architecture with company-based isolation
- Automatic user profile creation on registration
- Audit logging for all operations

### Key Features:
- UUID primary keys throughout
- Proper foreign key relationships
- Automatic timestamp updates
- Comprehensive indexing for performance
- PostgreSQL enums for type safety

## Next Steps

After applying this schema:

1. **Test database connection** from the app
2. **Create initial seed data** for testing
3. **Implement Supabase service layer** to replace mock API
4. **Set up authentication flow** with Supabase Auth
5. **Deploy and test** the complete system

## Environment Variables Needed

Make sure these are set in your `.env.local`:
```
VITE_SUPABASE_URL=https://qglvhxkgbzujglehewsa.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_KEY=your_service_key (for admin operations)
```