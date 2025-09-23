import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
// cspell:ignore Timesheet
import { User, View, Project, Role, Notification, CompanySettings, IncidentStatus, TimesheetStatus, NotificationType } from './types';
import { api } from './services/mockApi';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { AdminLogin } from './components/AdminLogin';
import { AcceptInvite } from './components/AcceptInvite';
import { MultiTenantLogin } from './components/MultiTenantLogin';
import { DualPortalHome } from './components/DualPortalHome';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AISearchModal } from './components/AISearchModal';
import { CommandPalette } from './components/CommandPalette';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useCommandPalette } from './hooks/useCommandPalette';
import { useReminderService } from './hooks/useReminderService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './contexts/AuthContext';
import { NotificationService } from './services/notificationService';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import { ViewAccessBoundary } from './components/layout/ViewAccessBoundary';
import { evaluateViewAccess, getDefaultViewForUser } from './utils/viewAccess';

// Lazy-load heavy view components to reduce initial bundle size
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const OwnerDashboard = React.lazy(() => import('./components/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const MyDayView = React.lazy(() => import('./components/MyDayView').then(m => ({ default: m.MyDayView })));
const ForemanDashboard = React.lazy(() => import('./components/ForemanDashboard').then(m => ({ default: m.default })));
const PrincipalAdminDashboard = React.lazy(() => import('./components/PrincipalAdminDashboard').then(m => ({ default: m.PrincipalAdminDashboard })));
const ProjectsView = React.lazy(() => import('./components/ProjectsView').then(m => ({ default: m.ProjectsView })));
const ProjectDetailView = React.lazy(() => import('./components/ProjectDetailView').then(m => ({ default: m.ProjectDetailView })));
const AllTasksView = React.lazy(() => import('./components/AllTasksView').then(m => ({ default: m.AllTasksView })));
const ProjectsMapView = React.lazy(() => import('./components/ProjectsMapView').then(m => ({ default: m.ProjectsMapView })));
const TimeTrackingView = React.lazy(() => import('./components/TimeTrackingView').then(m => ({ default: m.TimeTrackingView })));
// cspell:ignore Timesheets Financials
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
const UserRegistration = React.lazy(() => import('./components/UserRegistration').then(m => ({ default: m.UserRegistration })));
const TodosView = React.lazy(() => import('./components/TodosView').then(m => ({ default: m.TodosView })));
const VendorsView = React.lazy(() => import('./components/procurement/VendorsView').then(m => ({ default: m.VendorsView })));
const PurchaseOrdersView = React.lazy(() => import('./components/procurement/PurchaseOrdersView').then(m => ({ default: m.PurchaseOrdersView })));
const AccountsDashboard = React.lazy(() => import('./components/accounts/AccountsDashboard').then(m => ({ default: m.AccountsDashboard })));
const FinancialReports = React.lazy(() => import('./components/financials/FinancialReports').then(m => ({ default: m.FinancialReports })));


interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
  notification?: Notification;
}

const ToastMessage: React.FC<{ toast: Toast; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const isNotification = !!toast.notification;

  const getIcon = () => {
    if (!isNotification) {
      return toast.type === 'success' ? '🎉' : '🚨';
    }
    switch (toast.notification?.type) {
      case NotificationType.APPROVAL_REQUEST: return '📄';
      case NotificationType.TASK_ASSIGNED: return '✅';
      case NotificationType.NEW_MESSAGE: return '💬';
      case NotificationType.SAFETY_ALERT: return '⚠️';
      default: return '🔔';
    }
  };

  const baseClasses = 'p-4 rounded-[--radius] shadow-lg text-sm font-medium animate-card-enter flex items-start gap-3 w-80 border';
  const typeClasses = {
    success: 'bg-primary text-primary-foreground border-transparent',
    error: 'bg-destructive text-destructive-foreground border-transparent',
    notification: 'bg-card text-card-foreground border-border'
  };

  const toastStyle = isNotification ? typeClasses.notification : typeClasses[toast.type];
  const title = isNotification ? "New Notification" : (toast.type === 'success' ? "Success" : "Error");

  return (
    <div className={`${baseClasses} ${toastStyle}`}>
      <span className="text-xl mt-0.5">{getIcon()}</span>
      <div className="flex-grow">
        <p className="font-bold">{title}</p>
        <p>{toast.message}</p>
      </div>
      <button onClick={() => onDismiss(toast.id)} className="p-1 -m-1 rounded-full hover:bg-black/10 flex-shrink-0">&times;</button>
    </div>
  );
};


function App() {
  const { isAuthenticated, user, loading, logout, login } = useAuth();
  const [authView, setAuthView] = useState<'landing' | 'login' | 'classic-login' | 'register' | 'forgot-password' | 'reset-password' | 'admin-login' | 'accept-invite'>('landing');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [initialChatRecipient, setInitialChatRecipient] = useState<User | null>(null);

  // States for sidebar badge counts
  const [pendingTimesheetCount, setPendingTimesheetCount] = useState(0);
  const [openIncidentCount, setOpenIncidentCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const previousNotificationsRef = useRef<Notification[]>([]);

  const changeView = useCallback(
    (view: View) => {
      if (view !== 'project-detail') {
        setSelectedProject(null);
      }
      setActiveView(view);
      try {
        if (user?.id) localStorage.setItem(`activeView:${user.id}`, view);
      } catch { }
    },
    [user?.id] // keep stable unless user changes
  );

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success', notification?: Notification) => {
    setToasts(currentToasts => {
      const next = [...currentToasts, { id: Date.now(), message, type, notification }];
      return next.length > 5 ? next.slice(next.length - 5) : next;
    });
  }, []);

  const dismissToast = (id: number) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  };

  // Check for password reset token in URL on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setAuthView('reset-password');
    }
    const invite = params.get('invite');
    if (invite) {
      setInviteToken(invite);
      setAuthView('accept-invite');
    }
  }, []);

  const { isOnline } = useOfflineSync(addToast);
  const { isCommandPaletteOpen, setIsCommandPaletteOpen } = useCommandPalette();
  useReminderService(user);

  // Initialize notification service when user logs in
  useEffect(() => {
    if (user) {
      const notificationService = NotificationService.getInstance();
      notificationService.connect(user.id);

      // Subscribe to new notifications - use setToasts directly to avoid circular dependency
      const unsubscribe = notificationService.subscribe((notification) => {
        const seen = previousNotificationsRef.current.some(n => n.id === notification.id);
        if (!seen) {
          setNotifications(prev => [notification, ...prev]);
          previousNotificationsRef.current = [notification, ...previousNotificationsRef.current];
          setUnreadNotificationCount(prev => prev + (notification.isRead ? 0 : 1));
          setToasts(currentToasts => {
            const next: Toast[] = [
              ...currentToasts,
              {
                id: Date.now() + Math.random(),
                message: notification.message,
                type: 'success',
                notification
              }
            ];
            return next.length > 5 ? next.slice(next.length - 5) : next;
          });
        }
      });

      return () => {
        unsubscribe();
        notificationService.disconnect();
      };
    }
  }, [user]); // Remove addToast dependency

  useEffect(() => {
    if (user && user.companyId) {
      api.getCompanySettings(user.companyId).then(setCompanySettings);
    }
  }, [user]);

  useEffect(() => {
    if (companySettings) {
      document.documentElement.classList.toggle('dark', companySettings.theme === 'dark');
    }
  }, [companySettings]);

  useEffect(() => {
    if (isAuthenticated && user) {
      let next: View;
      if (user.role === Role.PRINCIPAL_ADMIN) {
        next = 'principal-dashboard';
      } else {
        try {
          const saved = localStorage.getItem(`activeView:${user.id}`) as View | null;
          next = saved || getDefaultViewForUser(user);
        } catch {
          next = getDefaultViewForUser(user);
        }
      }
      if (next !== activeView) setActiveView(next);
    }
  }, [isAuthenticated, user]);




  useEffect(() => {
    if (!user) return;

    // Initial load
    api.getNotificationsForUser(user.id).then(initialNotifications => {
      previousNotificationsRef.current = initialNotifications;
      setNotifications(initialNotifications);
    });

    // Update badge counts initially and then periodically
    const updateCounts = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!user.companyId) return;
      try {
        const [timesheets, incidents, conversations, fetchedNotifications] = await Promise.all([
          api.getTimesheetsByCompany(user.companyId, user.id),
          api.getSafetyIncidentsByCompany(user.companyId),
          api.getConversationsForUser(user.id),
          api.getNotificationsForUser(user.id),
        ]);

        setPendingTimesheetCount(timesheets.filter(t => t.status === TimesheetStatus.PENDING).length);
        setOpenIncidentCount(incidents.filter(i => i.status !== IncidentStatus.RESOLVED).length);
        setUnreadMessageCount(conversations.filter(c => c.lastMessage && !c.lastMessage.isRead && c.lastMessage.senderId !== user.id).length);

        const unreadNotifications = fetchedNotifications.filter(n => !n.isRead);
        setUnreadNotificationCount(unreadNotifications.length);

        previousNotificationsRef.current = fetchedNotifications;
        setNotifications(fetchedNotifications);
      } catch (error) {
        console.error("Could not update notification counts.", error);
      }
    };

    updateCounts();
    const interval = setInterval(updateCounts, 5000);
    const onVisibilityChange = () => {
      if (!document.hidden) {
        void updateCounts();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    setAuthView('login');
    changeView('dashboard');
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setActiveView('project-detail');
  };

  const handleStartChat = (recipient: User) => {
    setInitialChatRecipient(recipient);
    setActiveView('chat');
  };

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    if (!user) return;

    const wasUnread = !(notification.isRead ?? notification.read);

    try {
      if (wasUnread) {
        await api.markNotificationAsRead(notification.id);
      }

      setNotifications(prev => prev.map(n => (
        n.id === notification.id ? { ...n, isRead: true, read: true } : n
      )));

      previousNotificationsRef.current = previousNotificationsRef.current.map(n => (
        n.id === notification.id ? { ...n, isRead: true, read: true } : n
      ));

      if (wasUnread) {
        setUnreadNotificationCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to update notification state', error);
      addToast('Unable to update that notification right now.', 'error');
      return;
    }

    const metadata = (notification.metadata ?? {}) as { view?: View; projectId?: string };

    if (metadata.projectId) {
      try {
        const project = await api.getProjectById(metadata.projectId);
        if (project) {
          setSelectedProject(project);
          changeView('project-detail');
          return;
        }
        addToast('The project linked to this notification is no longer available.', 'error');
        changeView('projects');
        return;
      } catch (error) {
        console.error('Failed to load project from notification', error);
        addToast('We could not open the related project.', 'error');
        changeView('projects');
        return;
      }
    } else if (metadata.view && metadata.view !== activeView) {
      changeView(metadata.view);
      return;
    } else if (notification.type === NotificationType.NEW_MESSAGE) {
      changeView('chat');
      return;
    }

    if (wasUnread) {
      addToast('Notification marked as read.', 'success');
    }
  }, [user, addToast, changeView, activeView]);

  const renderView = () => {
    if (!user) return null;
    if (activeView === 'project-detail' && selectedProject) {
      return (
        <ProjectDetailView
          project={selectedProject}
          user={user}
          onBack={() => changeView('projects')}
          addToast={addToast}
          isOnline={isOnline}
          onStartChat={handleStartChat}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        if (user.role === Role.OWNER || user.role === Role.ADMIN) {
          return (
            <OwnerDashboard
              user={user}
              addToast={addToast}
              onSelectProject={handleSelectProject}
              setActiveView={changeView}
            />
          );
        }
        return (
          <Dashboard
            user={user}
            addToast={addToast}
            activeView={activeView}
            setActiveView={changeView}
            onSelectProject={handleSelectProject}
          />
        );
      case 'my-day': return <MyDayView user={user} addToast={addToast} />;
      case 'foreman-dashboard': return <ForemanDashboard user={user} addToast={addToast} />;
      case 'principal-dashboard': return <PrincipalAdminDashboard user={user} addToast={addToast} />;
      case 'projects': return <ProjectsView user={user} addToast={addToast} onSelectProject={handleSelectProject} />;
      case 'all-tasks': return <AllTasksView user={user} addToast={addToast} isOnline={isOnline} />;
      case 'map': return <ProjectsMapView user={user} addToast={addToast} />;
      case 'time':
        return <TimeTrackingView user={user} addToast={addToast} setActiveView={changeView} />;
      case 'timesheets': return <TimesheetsView user={user} addToast={addToast} />;
      case 'documents': return <DocumentsView user={user} addToast={addToast} isOnline={isOnline} settings={companySettings} />;
      case 'safety':
        return <SafetyView user={user} addToast={addToast} setActiveView={changeView} />;
      case 'financials': return <FinancialsView user={user} addToast={addToast} />;
      case 'users': return <TeamView user={user} addToast={addToast} onStartChat={handleStartChat} />;
      case 'equipment': return <EquipmentView user={user} addToast={addToast} />;
      case 'templates': return <TemplatesView user={user} addToast={addToast} />;
      case 'tools':
        return <ToolsView user={user} addToast={addToast} setActiveView={changeView} />;
      case 'audit-log': return <AuditLogView user={user} addToast={addToast} />;
      case 'settings': return <SettingsView user={user} addToast={addToast} settings={companySettings} onSettingsUpdate={(s) => setCompanySettings(prev => ({ ...prev!, ...s }))} />;
      case 'chat': return <ChatView user={user} addToast={addToast} initialRecipient={initialChatRecipient} />;
      case 'clients': return <ClientsView user={user} addToast={addToast} />;
      case 'invoices': return <InvoicesView user={user} addToast={addToast} />;
      case 'todos': return <TodosView user={user} addToast={addToast} />;
      case 'procurement-vendors': return <VendorsView user={user} addToast={addToast} />;
      case 'procurement-pos': return <PurchaseOrdersView user={user} addToast={addToast} />;
      case 'accounts': return <AccountsDashboard user={user} addToast={addToast} />;
      case 'financial-reports': return <FinancialReports user={user} addToast={addToast} />;
      default:
        return (
          <Dashboard
            user={user}
            addToast={addToast}
            activeView={activeView}
            setActiveView={changeView}
            onSelectProject={handleSelectProject}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <p>Loading application...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    switch (authView) {
      case 'landing':
        return (
          <DualPortalHome
            onLocalLogin={async (credentials) => {
              try {
                const res = await login(credentials);
                if (res.mfaRequired) {
                  addToast('MFA required — continue in classic login.', 'success');
                  setAuthView('classic-login');
                }
              } catch { }
            }}
            onAdminLocalLogin={async (credentials) => {
              try {
                const res = await login(credentials);
                if (!res.mfaRequired) {
                  setAuthView('login');
                  changeView('principal-dashboard');
                }
              } catch { }
            }}
            onSwitchToRegister={() => setAuthView('register')}
            onSwitchToForgotPassword={() => setAuthView('forgot-password')}
            addToast={addToast}
          />
        );
      case 'login':
        return (
          <MultiTenantLogin
            onSwitchToRegister={() => setAuthView('register')}
            onSwitchToForgotPassword={() => setAuthView('forgot-password')}
            onLocalLogin={async (credentials) => {
              try {
                const targetAdminEmail = 'adrian.stanca1@gmail.com';
                const isAdminCreds = credentials.email.trim().toLowerCase() === targetAdminEmail && credentials.password === 'Cumparavinde1';
                if (isAdminCreds) {
                  const res = await login(credentials);
                  if (!res.mfaRequired) {
                    setAuthView('login');
                    changeView('principal-dashboard');
                  }
                  return;
                }
                const res = await login(credentials);
                if (res.mfaRequired) {
                  addToast('MFA required — continue in classic login.', 'success');
                  setAuthView('classic-login');
                }
              } catch (_) {
                // AuthContext handles error & state
              }
            }}
            addToast={addToast}
          />
        );
      case 'admin-login':
        return (
          <AdminLogin
            onLocalLogin={async (credentials) => {
              try {
                const res = await login(credentials);
                if (!res.mfaRequired) {
                  setAuthView('login');
                  changeView('principal-dashboard');
                }
              } catch { }
            }}
            onBack={() => setAuthView('landing')}
            addToast={addToast}
          />
        );
      case 'classic-login':
        return <Login onSwitchToRegister={() => setAuthView('register')} onSwitchToForgotPassword={() => setAuthView('forgot-password')} />;
      case 'register':
        return <UserRegistration onSwitchToLogin={() => setAuthView('login')} />;
      case 'forgot-password':
        return <ForgotPassword onSwitchToLogin={() => setAuthView('login')} />;
      case 'reset-password':
        if (resetToken) {
          return <ResetPassword token={resetToken} onSuccess={() => { setAuthView('login'); setResetToken(null); window.history.pushState({}, '', window.location.pathname); }} />;
        }
        // Fallback to login if no token
        return <Login onSwitchToRegister={() => setAuthView('register')} onSwitchToForgotPassword={() => setAuthView('forgot-password')} />;
      case 'accept-invite':
        if (inviteToken) {
          return <AcceptInvite token={inviteToken} onCancel={() => { setAuthView('login'); setInviteToken(null); window.history.pushState({}, '', window.location.pathname); }} />;
        }
        return (
          <LandingPage
            onCompanyPortal={() => setAuthView('login')}
            onAdminPortal={() => setAuthView('admin-login')}
          />
        );
      default:
        return <Login onSwitchToRegister={() => setAuthView('register')} onSwitchToForgotPassword={() => setAuthView('forgot-password')} />;
    }
  }

  const viewEvaluation = evaluateViewAccess(user, activeView);
  const viewContent = viewEvaluation.allowed ? renderView() : null;

  return (
    <div className="relative flex h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent dark:from-primary/20" aria-hidden="true"></div>
      <div className="pointer-events-none absolute inset-y-0 right-[-10%] w-1/2 rounded-full bg-primary/5 blur-3xl dark:bg-primary/10" aria-hidden="true"></div>
      <Sidebar
        user={user}
        activeView={activeView}
        setActiveView={changeView}
        onLogout={handleLogout}
        pendingTimesheetCount={pendingTimesheetCount}
        openIncidentCount={openIncidentCount}
        unreadMessageCount={unreadMessageCount}
      />
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onLogout={handleLogout}
          onSearchClick={() => setIsSearchModalOpen(true)}
          onCommandPaletteClick={() => setIsCommandPaletteOpen(true)}
          isOnline={isOnline}
          unreadNotificationCount={unreadNotificationCount}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onMarkAllNotificationsAsRead={async () => {
            if (!user) return;
            await api.markAllNotificationsAsRead(user.id);
            setUnreadNotificationCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
          }}
          addToast={addToast}
        />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <ErrorBoundary>
            <ViewAccessBoundary
              user={user}
              view={activeView}
              evaluation={viewEvaluation}
              fallbackView={viewEvaluation.fallbackView}
              onNavigate={changeView}
            >
              <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading view…</div>}>
                {viewContent}
              </Suspense>
            </ViewAccessBoundary>
          </ErrorBoundary>
        </main>
      </div>

      {isSearchModalOpen && <AISearchModal user={user} currentProject={selectedProject} onClose={() => setIsSearchModalOpen(false)} addToast={addToast} />}
      {isCommandPaletteOpen && (
        <CommandPalette
          user={user}
          onClose={() => setIsCommandPaletteOpen(false)}
          setActiveView={changeView}
          onProjectSelect={(p) => {
            setSelectedProject(p);
            setActiveView('project-detail');
          }}
        />
      )}

      <div className="fixed bottom-4 right-4 z-50 space-y-2" aria-live="polite" aria-atomic="false">
        {toasts.map(toast => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}

export default App;
