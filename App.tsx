import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { User, View, Project, Role, Notification, CompanySettings, IncidentStatus, TimesheetStatus, NotificationType } from './types';
import { api } from './services/mockApi';
import { notificationService } from './services/notificationService';
import { analytics } from './services/analyticsService';
import { backupService } from './services/backupService';
import { authService } from './services/auth';
import { Login } from './components/Login';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AISearchModal } from './components/AISearchModal';
import { CommandPalette } from './components/CommandPalette';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useCommandPalette } from './hooks/useCommandPalette';
import { useReminderService } from './hooks/useReminderService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UserRegistration } from './components/UserRegistration';
import { useAuth } from './contexts/AuthContext';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import { ViewHeader } from './components/layout/ViewHeader';
import { getViewMetadata } from './utils/viewMetadata';
import { ViewAccessBoundary } from './components/layout/ViewAccessBoundary';
import { evaluateViewAccess, getDefaultViewForUser } from './utils/viewAccess';

// Lazy load components for better performance
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const OwnerDashboard = React.lazy(() => import('./components/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const MyDayView = React.lazy(() => import('./components/MyDayView').then(m => ({ default: m.MyDayView })));
const ForemanDashboard = React.lazy(() => import('./components/ForemanDashboard').then(m => ({ default: m.ForemanDashboard })));
const PrincipalAdminDashboard = React.lazy(() => import('./components/PrincipalAdminDashboard').then(m => ({ default: m.PrincipalAdminDashboard })));
const ProjectsView = React.lazy(() => import('./components/ProjectsView').then(m => ({ default: m.ProjectsView })));
const ProjectDetailView = React.lazy(() => import('./components/ProjectDetailView').then(m => ({ default: m.ProjectDetailView })));
const AllTasksView = React.lazy(() => import('./components/AllTasksView').then(m => ({ default: m.AllTasksView })));
const ProjectsMapView = React.lazy(() => import('./components/ProjectsMapView').then(m => ({ default: m.ProjectsMapView })));
const TimeTrackingView = React.lazy(() => import('./components/TimeTrackingView').then(m => ({ default: m.TimeTrackingView })));
const TimesheetsView = React.lazy(() => import('./components/TimesheetsView').then(m => ({ default: m.TimesheetsView })));
const DocumentsView = React.lazy(() => import('./components/DocumentsView').then(m => ({ default: m.DocumentsView })));
const SafetyView = React.lazy(() => import('./components/SafetyView').then(m => ({ default: m.SafetyView })));
const FinancialsView = React.lazy(() => import('./components/FinancialsView').then(m => ({ default: m.FinancialsView })));
const TeamView = React.lazy(() => import('./components/TeamView').then(m => ({ default: m.TeamView })));
const EquipmentView = React.lazy(() => import('./components/EquipmentView').then(m => ({ default: m.EquipmentView })));
const TemplatesView = React.lazy(() => import('./components/TemplatesView').then(m => ({ default: m.TemplatesView })));
const ToolsView = React.lazy(() => import('./components/ToolsView').then(m => ({ default: m.ToolsView })));
const AuditLogView = React.lazy(() => import('./components/AuditLogView').then(m => ({ default: m.AuditLogView })));
const SettingsView = React.lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const ChatView = React.lazy(() => import('./components/ChatView').then(m => ({ default: m.ChatView })));
const ClientsView = React.lazy(() => import('./components/ClientsView').then(m => ({ default: m.ClientsView })));
const InvoicesView = React.lazy(() => import('./components/InvoicesView').then(m => ({ default: m.InvoicesView })));

// Loading component for Suspense
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const App: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAISearchOpen, setIsAISearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password'>('login');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize offline sync
  const { addToast } = useOfflineSync((message, type) => {
    // Simple toast implementation
    console.log(`${type}: ${message}`);
  });

  // Initialize command palette
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    commands
  } = useCommandPalette(setCurrentView, setIsAISearchOpen);

  // Initialize reminder service
  useReminderService(user, (message, type) => {
    console.log(`${type}: ${message}`);
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (user && !evaluateViewAccess(currentView, user).hasAccess) {
      const defaultView = getDefaultViewForUser(user);
      setCurrentView(defaultView);
    }
  }, [user, currentView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'k') {
          e.preventDefault();
          setIsCommandPaletteOpen(true);
        } else if (e.key === 'f') {
          e.preventDefault();
          setIsAISearchOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCommandPaletteOpen]);

  const renderView = () => {
    if (!user) return null;

    const viewProps = {
      user,
      addToast,
      onProjectSelect: setSelectedProject,
      selectedProject
    };

    switch (currentView) {
      case 'dashboard':
        if (user.role === Role.OWNER) {
          return <OwnerDashboard {...viewProps} />;
        } else if (user.role === Role.FOREMAN) {
          return <ForemanDashboard {...viewProps} />;
        } else if (user.role === Role.PRINCIPAL_ADMIN) {
          return <PrincipalAdminDashboard {...viewProps} />;
        } else {
          return <Dashboard {...viewProps} />;
        }
      case 'my-day':
        return <MyDayView {...viewProps} />;
      case 'projects':
        return <ProjectsView {...viewProps} />;
      case 'project-detail':
        return <ProjectDetailView {...viewProps} />;
      case 'tasks':
        return <AllTasksView {...viewProps} />;
      case 'projects-map':
        return <ProjectsMapView {...viewProps} />;
      case 'time-tracking':
        return <TimeTrackingView {...viewProps} />;
      case 'timesheets':
        return <TimesheetsView {...viewProps} />;
      case 'documents':
        return <DocumentsView {...viewProps} />;
      case 'safety':
        return <SafetyView {...viewProps} />;
      case 'financials':
        return <FinancialsView {...viewProps} />;
      case 'team':
        return <TeamView {...viewProps} />;
      case 'equipment':
        return <EquipmentView {...viewProps} />;
      case 'templates':
        return <TemplatesView {...viewProps} />;
      case 'tools':
        return <ToolsView {...viewProps} />;
      case 'audit-log':
        return <AuditLogView {...viewProps} />;
      case 'settings':
        return <SettingsView {...viewProps} />;
      case 'chat':
        return <ChatView {...viewProps} />;
      case 'clients':
        return <ClientsView {...viewProps} />;
      case 'invoices':
        return <InvoicesView {...viewProps} />;
      default:
        return <Dashboard {...viewProps} />;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    if (authMode === 'register') {
      return (
        <UserRegistration
          onSuccess={() => setAuthMode('login')}
          onSwitchToLogin={() => setAuthMode('login')}
        />
      );
    } else if (authMode === 'forgot-password') {
      return (
        <ForgotPassword
          onBackToLogin={() => setAuthMode('login')}
        />
      );
    } else if (authMode === 'reset-password') {
      return (
        <ResetPassword
          onSuccess={() => setAuthMode('login')}
        />
      );
    } else {
      return (
        <Login
          onRegister={() => setAuthMode('register')}
          onForgotPassword={() => setAuthMode('forgot-password')}
        />
      );
    }
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          user={user}
          selectedProject={selectedProject}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            user={user}
            notifications={notifications}
            onNotificationClick={() => {}}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isOnline={isOnline}
          />
          
          <ViewHeader
            view={currentView}
            metadata={getViewMetadata(currentView)}
            onSearch={() => setIsAISearchOpen(true)}
            user={user}
          />
          
          <main className="flex-1 overflow-y-auto">
            <ViewAccessBoundary view={currentView} fallback={<div>Access Denied</div>}>
              <Suspense fallback={<LoadingSpinner />}>
                {renderView()}
              </Suspense>
            </ViewAccessBoundary>
          </main>
        </div>

        {isAISearchOpen && (
          <AISearchModal
            isOpen={isAISearchOpen}
            onClose={() => setIsAISearchOpen(false)}
            user={user}
          />
        )}

        {isCommandPaletteOpen && (
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            commands={commands}
            onExecute={(command) => {
              command.action();
              setIsCommandPaletteOpen(false);
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
