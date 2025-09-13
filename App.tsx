import React, { useState, useEffect, useCallback } from 'react';
import { User, View, Project, Role, Notification, CompanySettings, IncidentStatus, TimesheetStatus } from './types';
import { api } from './services/mockApi';
import { Login } from './components/Login';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/Dashboard';
import { MyDayView } from './components/MyDayView';
import { ForemanDashboard } from './components/ForemanDashboard';
import { PrincipalAdminDashboard } from './components/PrincipalAdminDashboard';
import { ProjectsView } from './components/ProjectsView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { AllTasksView } from './components/AllTasksView';
import { ProjectsMapView } from './components/ProjectsMapView';
import { TimeTrackingView } from './components/TimeTrackingView';
import { TimesheetsView } from './components/TimesheetsView';
import { DocumentsView } from './components/DocumentsView';
import { SafetyView } from './components/SafetyView';
import { FinancialsView } from './components/FinancialsView';
import { TeamView } from './components/TeamView';
import { EquipmentView } from './components/EquipmentView';
import { TemplatesView } from './components/TemplatesView';
import { ToolsView } from './components/ToolsView';
import { AuditLogView } from './components/AuditLogView';
import { SettingsView } from './components/SettingsView';
import { ChatView } from './components/ChatView';
import { ClientsView } from './components/ClientsView';
import { AISearchModal } from './components/AISearchModal';
import { CommandPalette } from './components/CommandPalette';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useCommandPalette } from './hooks/useCommandPalette';
import { useReminderService } from './hooks/useReminderService';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const ToastMessage: React.FC<{ toast: Toast; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const baseClasses = 'p-4 rounded-md shadow-lg text-sm font-medium animate-toast-in';
  const typeClasses = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[toast.type]}`}>
      {toast.message}
    </div>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null);
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

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToasts(currentToasts => [...currentToasts, { id: Date.now(), message, type }]);
  }, []);

  const dismissToast = (id: number) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  };

  const { isOnline } = useOfflineSync(addToast);
  const { isCommandPaletteOpen, setIsCommandPaletteOpen } = useCommandPalette();
  useReminderService(user);
  
  useEffect(() => {
    if (user && user.companyId) {
      api.getCompanySettings(user.companyId).then(setCompanySettings);
    }
  }, [user]);

  useEffect(() => {
    if(companySettings) {
      document.documentElement.classList.toggle('dark', companySettings.theme === 'dark');
    }
  }, [companySettings]);

  const updateBadgeCounts = useCallback(async (user: User) => {
    if (!user.companyId) return;
    try {
      const [timesheets, incidents, conversations, notifications] = await Promise.all([
        api.getTimesheetsByCompany(user.companyId, user.id),
        api.getSafetyIncidentsByCompany(user.companyId),
        api.getConversationsForUser(user.id),
        api.getNotificationsForUser(user.id),
      ]);
      setPendingTimesheetCount(timesheets.filter(t => t.status === TimesheetStatus.PENDING).length);
      setOpenIncidentCount(incidents.filter(i => i.status !== IncidentStatus.RESOLVED).length);
      setUnreadMessageCount(conversations.filter(c => c.lastMessage && !c.lastMessage.isRead).length);
      setUnreadNotificationCount(notifications.filter(n => !n.isRead).length);
    } catch (error) {
      addToast("Could not update notification counts.", "error");
    }
  }, [addToast]);
  
  useEffect(() => {
    if(user) updateBadgeCounts(user);
  }, [user, updateBadgeCounts]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    let defaultView: View = 'dashboard';
    if (loggedInUser.role === Role.OPERATIVE) defaultView = 'my-day';
    if (loggedInUser.role === Role.FOREMAN) defaultView = 'foreman-dashboard';
    if (loggedInUser.role === Role.PRINCIPAL_ADMIN) defaultView = 'principal-dashboard';
    setActiveView(defaultView);
  };

  const handleLogout = () => {
    setUser(null);
    setActiveView('dashboard');
    setSelectedProject(null);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };
  
  const handleStartChat = (recipient: User) => {
      setInitialChatRecipient(recipient);
      setActiveView('chat');
  };

  const renderView = () => {
    if (!user) return null;
    if (selectedProject) {
      return <ProjectDetailView project={selectedProject} user={user} onBack={() => setSelectedProject(null)} addToast={addToast} isOnline={isOnline} onStartChat={handleStartChat}/>;
    }

    switch (activeView) {
      // FIX: Added missing 'activeView' prop to the Dashboard component.
      case 'dashboard': return <Dashboard user={user} addToast={addToast} activeView={activeView} setActiveView={setActiveView} onSelectProject={handleSelectProject} />;
      case 'my-day': return <MyDayView user={user} addToast={addToast} />;
      case 'foreman-dashboard': return <ForemanDashboard user={user} addToast={addToast} />;
      case 'principal-dashboard': return <PrincipalAdminDashboard user={user} addToast={addToast} />;
      case 'projects': return <ProjectsView user={user} addToast={addToast} onSelectProject={handleSelectProject} />;
      case 'all-tasks': return <AllTasksView user={user} addToast={addToast} isOnline={isOnline} />;
      case 'map': return <ProjectsMapView user={user} addToast={addToast} />;
      case 'time': return <TimeTrackingView user={user} addToast={addToast} setActiveView={setActiveView} />;
      case 'timesheets': return <TimesheetsView user={user} addToast={addToast} />;
      case 'documents': return <DocumentsView user={user} addToast={addToast} isOnline={isOnline} settings={companySettings} />;
      case 'safety': return <SafetyView user={user} addToast={addToast} />;
      case 'financials': return <FinancialsView user={user} addToast={addToast} />;
      case 'users': return <TeamView user={user} addToast={addToast} onStartChat={handleStartChat} />;
      case 'equipment': return <EquipmentView user={user} addToast={addToast} />;
      case 'templates': return <TemplatesView user={user} addToast={addToast} />;
      case 'tools': return <ToolsView user={user} addToast={addToast} setActiveView={setActiveView} />;
      case 'audit-log': return <AuditLogView user={user} addToast={addToast} />;
      case 'settings': return <SettingsView user={user} addToast={addToast} settings={companySettings} onSettingsUpdate={(s) => setCompanySettings(prev => ({...prev!, ...s}))} />;
      case 'chat': return <ChatView user={user} addToast={addToast} initialRecipient={initialChatRecipient}/>;
      case 'clients': return <ClientsView user={user} addToast={addToast}/>;
      // FIX: Added missing 'activeView' prop to the Dashboard component.
      default: return <Dashboard user={user} addToast={addToast} activeView={activeView} setActiveView={setActiveView} onSelectProject={handleSelectProject} />;
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <Sidebar
        user={user}
        activeView={activeView}
        setActiveView={(v) => { setSelectedProject(null); setActiveView(v); }}
        onLogout={handleLogout}
        pendingTimesheetCount={pendingTimesheetCount}
        openIncidentCount={openIncidentCount}
        unreadMessageCount={unreadMessageCount}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          user={user} 
          onLogout={handleLogout} 
          onSearchClick={() => setIsSearchModalOpen(true)}
          onCommandPaletteClick={() => setIsCommandPaletteOpen(true)}
          unreadNotificationCount={unreadNotificationCount}
          onNotificationClick={() => { /* Implement navigation */ }}
          onMarkAllNotificationsAsRead={() => updateBadgeCounts(user)}
        />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {renderView()}
        </main>
      </div>
      
      {isSearchModalOpen && <AISearchModal user={user} currentProject={selectedProject} onClose={() => setIsSearchModalOpen(false)} addToast={addToast} />}
      {isCommandPaletteOpen && <CommandPalette user={user} onClose={() => setIsCommandPaletteOpen(false)} setActiveView={setActiveView} />}
      
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}

export default App;
