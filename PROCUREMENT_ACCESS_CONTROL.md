# AI Procurement Analysis - Role-Based Access Control Implementation

## 🔐 Access Control Summary

The AI Procurement Analysis system has been successfully restricted to **Platform Administrators** and **Company Owners** only, with different database contexts based on user roles.

## 👥 Role-Based Access

### ✅ **Allowed Roles:**
- **`PRINCIPAL_ADMIN`** (Platform Administrator)
  - 🌐 **Database Context**: Platform Database
  - 📊 **Access Level**: All companies' procurement data
  - 🎯 **Tender Visibility**: All available tenders across all companies
  - 👑 **UI Indicator**: "Platform Admin" badge

- **`OWNER`** (Company Owner)
  - 🏢 **Database Context**: Company Database  
  - 📊 **Access Level**: Own company's procurement data only
  - 🎯 **Tender Visibility**: Filtered tenders (London/Kent/Essex region)
  - 👤 **UI Indicator**: "Company Owner" badge

### ❌ **Restricted Roles:**
- `PROJECT_MANAGER`
- `FOREMAN` 
- `OPERATIVE`
- `ADMIN`
- `CLIENT`

Users with restricted roles see an "Access Restricted" message explaining that the feature is available only to Platform Administrators and Company Owners.

## 🗄️ Database Context Implementation

### Platform Admin (`PRINCIPAL_ADMIN`)
```typescript
databaseContext = 'platform'
availableTenders = allTenders // No filtering
databaseLabel = 'Platform Database'
accessMessage = 'You have access to all companies\' procurement data.'
```

### Company Owner (`OWNER`)
```typescript
databaseContext = 'company'
availableTenders = tenders.filter(tender => 
  tender.location.includes('Kent') || 
  tender.location.includes('Essex') || 
  tender.location.includes('London')
) // Regional filtering
databaseLabel = '${user.companyId} Company Database'
accessMessage = 'You have access to your company\'s procurement data only.'
```

## 🎨 UI Features

### Access Control Indicators
- **Database Status Bar**: Shows current database context with color-coded indicators
  - 🟣 Purple dot for Platform Database
  - 🔵 Blue dot for Company Database
- **Role Badges**: Clear visual indication of user's role and access level
- **Tender Count**: Dynamic display of available tenders based on access level

### User Experience
- **Immediate Feedback**: Access restrictions shown immediately on component load
- **Clear Messaging**: Informative messages about database context and access levels
- **Progressive Disclosure**: Different tender sets based on role hierarchy

## 🛡️ Security Implementation

### Navigation Level
```typescript
// src/utils/navigation.tsx
{
  id: 'procurement-ai',
  label: 'AI Procurement',
  view: 'procurement-ai',
  icon: icons.ai,
  description: 'AI-powered tender analysis (Platform Admins & Owners only).',
  roles: [Role.PRINCIPAL_ADMIN, Role.OWNER], // Explicit role restriction
}
```

### Component Level
```typescript
// src/components/ProcurementDashboard.tsx
if (user.role !== Role.PRINCIPAL_ADMIN && user.role !== Role.OWNER) {
  return <AccessRestrictedMessage />;
}
```

### Data Level
```typescript
// src/components/ProcurementChain.tsx
const availableTenders = user.role === Role.PRINCIPAL_ADMIN 
  ? tenders // Platform admins see all
  : tenders.filter(regionally) // Company owners see filtered subset
```

## 🧪 Testing

Comprehensive test coverage ensures proper access control:
- ✅ Platform Admin access granted with platform database context
- ✅ Company Owner access granted with company database context  
- ✅ All other roles properly restricted
- ✅ Correct database context assignment per role
- ✅ Proper error handling and user messaging

## 🚀 Deployment Status

- **Navigation**: ✅ Role-based menu item visibility
- **Routing**: ✅ App.tsx integration with user prop passing
- **Components**: ✅ Full access control implementation
- **Database**: ✅ Context-aware data filtering
- **Testing**: ✅ Comprehensive test coverage
- **UI/UX**: ✅ Clear visual indicators and messaging

## 📋 Usage

1. **Platform Administrators** can access all procurement data across companies
2. **Company Owners** can access only their company's regional procurement data  
3. **All other users** see a clear access restriction message with contact information
4. **Database context** is clearly indicated in the UI for transparency
5. **Tender filtering** happens automatically based on user role and permissions

The system maintains security while providing appropriate access levels for different organizational roles.