import React from 'react';
import { User, View, Role, Permission } from '../../types';
import { hasPermission } from '../../services/auth';

interface SidebarProps {
  user: User | null;
  activeView: View;
  setActiveView: (view: View) => void;
  onLogout: () => void;
  pendingTimesheetCount: number;
  openIncidentCount: number;
  unreadMessageCount: number;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  view: View;
  activeView: View;
  setActiveView: (view: View) => void;
  badgeCount?: number;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, view, activeView, setActiveView, badgeCount }) => (
  <button
    onClick={() => setActiveView(view)}
    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-md text-sm transition-colors ${
      activeView === view
        ? 'bg-primary text-primary-foreground font-semibold shadow'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    }`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </div>
    {badgeCount && badgeCount > 0 && (
      <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
        {badgeCount > 99 ? '99+' : badgeCount}
      </span>
    )}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ 
  user, 
  activeView, 
  setActiveView, 
  onLogout, 
  pendingTimesheetCount, 
  openIncidentCount, 
  unreadMessageCount 
}) => {
  if (!user) return null;

  const getDashboardView = (): View => {
    if (user.role === Role.OPERATIVE) return 'my-day';
    if (user.role === Role.FOREMAN) return 'foreman-dashboard';
    return 'dashboard';
  };

  const dashboardView = getDashboardView();
  const dashboardLabel = user.role === Role.OPERATIVE ? 'My Day' : 'Dashboard';

  const renderNavItems = () => {
    if (user.role === Role.PRINCIPAL_ADMIN) {
      return (
        <>
          <NavItem
            icon={<span className="text-lg">🏠</span>}
            label="Admin Dashboard"
            view="admin-dashboard"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">👥</span>}
            label="Team"
            view="team"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">⚙️</span>}
            label="Settings"
            view="settings"
            activeView={activeView}
            setActiveView={setActiveView}
          />
        </>
      );
    }

    if (user.role === Role.OWNER) {
      return (
        <>
          <NavItem
            icon={<span className="text-lg">🏠</span>}
            label="Owner Dashboard"
            view="owner-dashboard"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">🏗️</span>}
            label="Projects"
            view="projects"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">💰</span>}
            label="Financials"
            view="financials"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">👥</span>}
            label="Team"
            view="team"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">📊</span>}
            label="Reports"
            view="reports"
            activeView={activeView}
            setActiveView={setActiveView}
          />
        </>
      );
    }

    if (user.role === Role.PROJECT_MANAGER) {
      return (
        <>
          <NavItem
            icon={<span className="text-lg">🏠</span>}
            label={dashboardLabel}
            view={dashboardView}
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">🏗️</span>}
            label="Projects"
            view="projects"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">📋</span>}
            label="Tasks"
            view="tasks"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">👥</span>}
            label="Team"
            view="team"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">🛡️</span>}
            label="Safety"
            view="safety"
            activeView={activeView}
            setActiveView={setActiveView}
            badgeCount={openIncidentCount}
          />
          {hasPermission(user, Permission.MANAGE_FINANCES) && (
            <NavItem
              icon={<span className="text-lg">💰</span>}
              label="Financials"
              view="financials"
              activeView={activeView}
              setActiveView={setActiveView}
            />
          )}
          <NavItem
            icon={<span className="text-lg">🔧</span>}
            label="Equipment"
            view="equipment"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">📄</span>}
            label="Documents"
            view="documents"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">⏰</span>}
            label="Timesheets"
            view="timesheets"
            activeView={activeView}
            setActiveView={setActiveView}
            badgeCount={pendingTimesheetCount}
          />
        </>
      );
    }

    if (user.role === Role.FOREMAN) {
      return (
        <>
          <NavItem
            icon={<span className="text-lg">🏠</span>}
            label="Foreman Dashboard"
            view="foreman-dashboard"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">📋</span>}
            label="Tasks"
            view="tasks"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">👥</span>}
            label="Team"
            view="team"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">🛡️</span>}
            label="Safety"
            view="safety"
            activeView={activeView}
            setActiveView={setActiveView}
            badgeCount={openIncidentCount}
          />
          <NavItem
            icon={<span className="text-lg">⏰</span>}
            label="Time Tracking"
            view="time-tracking"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">💬</span>}
            label="Chat"
            view="chat"
            activeView={activeView}
            setActiveView={setActiveView}
            badgeCount={unreadMessageCount}
          />
        </>
      );
    }

    if (user.role === Role.OPERATIVE) {
      return (
        <>
          <NavItem
            icon={<span className="text-lg">🏠</span>}
            label="My Day"
            view="my-day"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">📋</span>}
            label="My Tasks"
            view="tasks"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">⏰</span>}
            label="Time Tracking"
            view="time-tracking"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">🛡️</span>}
            label="Safety"
            view="safety"
            activeView={activeView}
            setActiveView={setActiveView}
            badgeCount={openIncidentCount}
          />
          <NavItem
            icon={<span className="text-lg">💬</span>}
            label="Chat"
            view="chat"
            activeView={activeView}
            setActiveView={setActiveView}
            badgeCount={unreadMessageCount}
          />
        </>
      );
    }

    if (user.role === Role.CLIENT) {
      return (
        <>
          <NavItem
            icon={<span className="text-lg">🏠</span>}
            label="Dashboard"
            view="dashboard"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">🏗️</span>}
            label="My Projects"
            view="projects"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">💰</span>}
            label="Invoices"
            view="invoices"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">📄</span>}
            label="Documents"
            view="documents"
            activeView={activeView}
            setActiveView={setActiveView}
          />
          <NavItem
            icon={<span className="text-lg">💬</span>}
            label="Chat"
            view="chat"
            activeView={activeView}
            setActiveView={setActiveView}
            badgeCount={unreadMessageCount}
          />
        </>
      );
    }

    return null;
  };

  return (
    <aside className="flex h-full w-72 flex-shrink-0 flex-col border-r border-border/80 bg-card/95 p-5">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-8 w-8 text-primary" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2l9.196 5.31a1 1 0 01.5.866v10.648a1 1 0 01-.5.866L12 24l-9.196-4.31a1 1 0 01-.5-.866V8.176a1 1 0 01.5-.866L12 2z"
              opacity={0.12}
            />
            <path
              fill="currentColor"
              d="M12 4.4l7.196 4.15v8.9L12 21.6l-7.196-4.15v-8.9L12 4.4z"
            />
          </svg>
          <span className="text-xl font-bold text-foreground">BuildFlow</span>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold text-sm">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user.role.toLowerCase().replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-6 flex-1 space-y-2">
        {renderNavItems()}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-border/60">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <span className="text-lg">🚪</span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};