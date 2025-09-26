# Copilot Instructions for Construction Management App

This is a React/TypeScript construction management application with AI integration, role-based access control, and hybrid data architecture.

## Architecture Overview

- **Frontend**: React 18 + TypeScript with Vite build system, lazy loading for performance
- **AI Integration**: Google Gemini API (`@google/genai`) with construction-specific prompts
- **State Management**: Single `AuthContext` for authentication/authorization state
- **Data Architecture**: 
  - **Development**: Mock API (`services/mockApi.ts` - 1699 lines) with localStorage persistence and offline queue
  - **Production**: Firebase Data Connect with PostgreSQL backend (`dataconnect/` + 762-line Supabase schema)
- **Component Structure**: Role-based dashboards, extensive component library, modular views
- **Maps**: Leaflet integration with clustering via `use-supercluster`
- **Types**: Comprehensive TypeScript definitions (856 lines in `types.ts`)

## Key Patterns & Conventions

### Component Organization

```
components/
├── ui/               # Reusable UI components (Button, Card, etc.) 
├── auth/             # Authentication flows (Login.tsx, ProtectedRoute.tsx)
├── layout/           # Layout components (Header, Sidebar, ViewAccessBoundary)
├── financials/       # Financial module components
├── [ViewName].tsx    # Main view components (Dashboard, ProjectsView, etc.)
├── [Role]Dashboard.tsx # Role-specific dashboards (ForemanDashboard, OwnerDashboard)
└── [Feature]Bot.tsx  # AI-powered tools (FundingBot, RiskBot)
```

### App Structure & Routing

- `App.tsx` (581 lines) manages all routing and view switching
- Uses lazy loading with `Suspense` for heavy components  
- Role-based view access controlled in single location
- Views switched via `currentView` state, not React Router

### Service Layer Architecture

- `mockApi.ts` (1699 lines) - Comprehensive data layer with offline queue and caching
- `ai.ts` - Gemini AI integration with construction domain prompts
- `auth.ts` - Authentication/authorization with `hasPermission()` checking
- `analyticsService.ts`, `notificationService.ts`, `backupService.ts` - Supporting services
- `validationService.ts` - Input validation and security

### Permission-Based Access Control

Use `hasPermission()` from `services/auth.ts` and `ViewAccessBoundary` component:

```tsx
import { hasPermission } from "../services/auth";
import { Permission } from "../types";

// Check permissions
if (hasPermission(Permission.EDIT_PROJECTS)) {
  // Show edit UI
}

// Wrap components with access control
<ViewAccessBoundary view="projects" fallback={<AccessDenied />}>
  <ProjectsView />
</ViewAccessBoundary>;
```

### State Management Pattern

- Single `AuthContext` (287 lines) handles all authentication state
- Uses `useState` and `useContext` - no Redux or external state managers
- Component state for UI, context for global auth/user data
- Offline operations queued in localStorage via `mockApi.ts`

### Offline-First Data Handling

All write operations queue offline and sync when online. Check `useOfflineSync` hook:

```tsx
const { isOnline } = useOfflineSync(addToast);
// Operations automatically queue in localStorage when offline
```

### Data Architecture Patterns

- **Development**: `mockApi.ts` simulates backend with localStorage persistence
- **Production**: Firebase Data Connect + PostgreSQL via `dataconnect/schema/`
- **Types**: All data models defined in `types.ts` (856 lines) - import from here
- **Validation**: `ValidationService` handles input validation and security checks

### AI Integration Pattern

Construction-specific AI prompts are in `services/ai.ts`. Key functions:

- `generateProjectInsights()` - Project analysis
- `generateSafetyRecommendations()` - Safety incident analysis
- `generateCostEstimate()` - Cost estimation
- `generateDailySummary()` - Daily progress summaries

### Error Handling

Use `utils/errorHandling.ts` utilities:

```tsx
import { wrapError, withRetry } from "../utils/errorHandling";

// Wrap operations with retry logic
const result = await withRetry(() => api.createProject(data), {
  maxAttempts: 3,
  baseDelay: 1000,
});
```

## Development Workflows

### Local Development

```bash
npm install
cp .env.example .env.local  # Set VITE_GEMINI_API_KEY
npm run dev
```

### Testing

```bash
npm run test           # Run tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

### Deployment

Multiple deployment targets via `scripts/deploy.js`:

```bash
npm run deploy:vercel      # Vercel deployment
npm run deploy:netlify     # Netlify deployment
npm run deploy:docker      # Docker deployment
npm run deploy:dry-run     # Test deployment config
```

### Build Analysis

```bash
npm run analyze           # Bundle size analysis
npm run type-check        # TypeScript checking
```

## Important Integration Points

### Role-Based Views

Each user role has specific dashboard and access patterns defined in `utils/viewAccess.ts`. Always check user permissions before rendering sensitive components.

### Map Integration

Project locations use `react-leaflet` with clustering via `use-supercluster`. Map components are in `components/MapView.tsx` and `components/ProjectsMapView.tsx`.

### Mock Data Structure

Realistic construction data is in `services/mockData.ts` with full project hierarchies, user roles, equipment tracking, and financial records.

### AI Context

When working with AI features, construction industry context is pre-loaded. The app handles project management, safety compliance, cost estimation, and workforce planning specific to construction workflows.

### Database Integration

- **Firebase Data Connect**: Production setup in `dataconnect/` with PostgreSQL schema
- **Supabase Schema**: 762-line schema in `database-schema.sql` with comprehensive RBAC
- **Local Development**: Uses `mockApi.ts` with localStorage for offline-first development

## File Naming & Imports

- Use relative imports (`../services/mockApi`)
- Components use PascalCase files (`ProjectsView.tsx`)
- Services use camelCase (`mockApi.ts`)
- Always import types from `./types.ts`
- Use lazy loading for heavy components in `App.tsx`
