import React, { useMemo } from 'react';
import { User, View } from '../../types';
import { Avatar } from '../ui/Avatar';
import { RoleBadge } from '../ui/RoleBadge';
import { buildNavigationForUser, NavigationBadgeCounts } from '../../utils/navigation';

interface SidebarProps {
  user: User | null;
  activeView: View;
  setActiveView: (view: View) => void;
  onLogout: () => void;
  pendingTimesheetCount: number;
  openIncidentCount: number;
  unreadMessageCount: number;
  companyName?: string;
}


interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  view: View;
  activeView: View;
  setActiveView: (view: View) => void;
  badgeCount?: number;
  description?: string;
}

interface NavSectionProps {
  title: string;
  children: React.ReactNode;
}

const NavSection: React.FC<NavSectionProps> = ({ title, children }) => (
  <div className="space-y-2">
    <h2 className="px-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const NavItem: React.FC<NavItemProps> = ({ icon, label, view, activeView, setActiveView, badgeCount, description }) => {
  const isActive = activeView === view;
  return (
    <button
      onClick={() => setActiveView(view)}
      className={`group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
        isActive
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'border border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/70 hover:text-foreground'
      }`}
      title={description}
    >
      <span className="flex items-center gap-3 text-left">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-colors ${
            isActive
              ? 'border-primary-foreground/60 bg-primary-foreground/20'
              : 'border-border bg-card group-hover:border-primary/40 group-hover:text-primary'
          }`}
          aria-hidden
        >
          {icon}
        </span>
        <span className="font-medium leading-tight">{label}</span>
      </span>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="ml-auto inline-flex min-w-[1.75rem] justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  );
};

const formatCompany = (companyName?: string) => {
  if (!companyName) return null;
  return companyName;
};

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeView,
  setActiveView,
  onLogout,
  pendingTimesheetCount,
  openIncidentCount,
  unreadMessageCount,
  companyName,
}) => {
  if (!user) return null;

  const navigationCounts = useMemo<NavigationBadgeCounts>(
    () => ({
      pendingTimesheetCount,
      openIncidentCount,
      unreadMessageCount,
    }),
    [pendingTimesheetCount, openIncidentCount, unreadMessageCount]
  );

  const navigationSections = useMemo(
    () => buildNavigationForUser(user, navigationCounts),
    [user, navigationCounts]
  );

  const displayName = `${user.firstName} ${user.lastName}`.trim();
  const formattedCompany = formatCompany(companyName);

  return (
    <aside className="flex h-full w-72 flex-shrink-0 flex-col border-r border-border/80 bg-card/95 p-5">
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-8 w-8 text-primary" aria-hidden>
            <path
              fill="currentColor"
              d="M12 2l9.196 5.31a1 1 0 01.5.866v10.648a1 1 0 01-.5.866L12 24l-9.196-4.31a1 1 0 01-.5-.866V8.176a1 1 0 01.5-.866L12 2z"
              opacity={0.12}
            />
            <path
              fill="currentColor"
              d="M12 4.5l-6.5 3.752v7.496L12 19.5l6.5-3.752V8.252L12 4.5zm0 1.732l5 2.886v5.764l-5 2.886-5-2.886V9.118l5-2.886z"
            />
          </svg>
          <div className="leading-tight">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">AS Agents</p>
            <p className="text-lg font-semibold text-foreground">Project Command</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-4">
          <div className="flex items-center gap-3">
            <Avatar name={displayName} imageUrl={user.avatar} className="h-12 w-12" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <RoleBadge role={user.role} className="mt-1" />
              {formattedCompany && (
                <p className="mt-1 truncate text-xs text-muted-foreground">{formattedCompany}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-6 overflow-y-auto pr-1">
        {navigationSections.map(section => (
          <NavSection key={section.id} title={section.title}>
            {section.items.map(item => (
              <NavItem
                key={item.id}
                view={item.view}
                icon={item.icon}
                label={item.label}
                activeView={activeView}
                setActiveView={setActiveView}
                badgeCount={item.badgeCount}
                description={item.description}
              />
            ))}
          </NavSection>
        ))}
      </nav>

      <div className="mt-6">
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200/70 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7l-5 5 5 5M4 12h11" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
};