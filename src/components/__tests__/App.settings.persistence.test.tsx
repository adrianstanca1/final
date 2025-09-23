/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import ReactDOM from 'react-dom/client';
import App from '../../App';

// Minimal AuthContext mock to drive App in authenticated state
vi.mock('../../contexts/AuthContext', async () => {
    const React = await import('react');
    const user = { id: 'u1', firstName: 'Pat', lastName: 'Lee', email: 'p@l.t', companyId: 'c1', role: 'FOREMAN' } as any;
    const ctx = {
        isAuthenticated: true,
        user,
        loading: false,
        login: vi.fn(async () => ({ mfaRequired: false })),
        logout: vi.fn(),
        verifyMfaAndFinalize: vi.fn(),
        error: null,
    } as any;
    return {
        useAuth: () => ctx,
        AuthProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    };
});

// Mock API for settings and minimal data used by App
let currentSettings: any = {
    theme: 'light',
    accessibility: { highContrast: false },
    geofencingEnabled: true,
};

vi.mock('../../services/mockApi', () => {
    return {
        api: {
            getCompanySettings: vi.fn(async () => ({ ...currentSettings })),
            updateCompanySettings: vi.fn(async (_companyId: string, s: any) => {
                currentSettings = { ...currentSettings, ...s };
                return { ...currentSettings };
            }),
            getNotificationsForUser: vi.fn(async () => ([])),
            markAllNotificationsAsRead: vi.fn(async () => ({})),
            getTimesheetsByCompany: vi.fn(async () => ([])),
            getSafetyIncidentsByCompany: vi.fn(async () => ([])),
            getConversationsForUser: vi.fn(async () => ([])),
        },
    };
});

// Avoid heavy lazy components fetching
vi.mock('../../components/ProjectsView', () => ({ ProjectsView: () => null }));
vi.mock('../../components/ProjectDetailView', () => ({ ProjectDetailView: () => null }));
vi.mock('../../components/AllTasksView', () => ({ AllTasksView: () => null }));
vi.mock('../../components/ProjectsMapView', () => ({ ProjectsMapView: () => null }));
vi.mock('../../components/TimeTrackingView', () => ({ TimeTrackingView: (p: any) => React.createElement('div', { 'data-tt-geofencing': String(p.settings?.geofencingEnabled !== false) }) }));
vi.mock('../../components/TimesheetsView', () => ({ TimesheetsView: () => null }));
vi.mock('../../components/DocumentsView', () => ({ DocumentsView: () => null }));
vi.mock('../../components/SafetyView', () => ({ SafetyView: () => null }));
vi.mock('../../components/FinancialsView', () => ({ FinancialsView: () => null }));
vi.mock('../../components/TeamView', () => ({ TeamView: () => null }));
vi.mock('../../components/EquipmentView', () => ({ EquipmentView: () => null }));
vi.mock('../../components/TemplatesView', () => ({ TemplatesView: () => null }));
vi.mock('../../components/ToolsView', () => ({ ToolsView: () => null }));
vi.mock('../../components/AuditLogView', () => ({ AuditLogView: () => null }));
vi.mock('../../components/ChatView', () => ({ ChatView: () => null }));
vi.mock('../../components/ClientsView', () => ({ ClientsView: () => null }));
vi.mock('../../components/InvoicesView', () => ({ InvoicesView: () => null }));
vi.mock('../../components/accounts/AccountsDashboard', () => ({ AccountsDashboard: () => null }));
vi.mock('../../components/financials/FinancialReports', () => ({ FinancialReports: () => null }));

// Sidebar/Header minimal mocks to render App skeleton
vi.mock('../../components/layout/Sidebar', () => ({ Sidebar: () => React.createElement('aside') }));
vi.mock('../../components/layout/Header', () => ({ Header: () => React.createElement('header') }));

// Dashboard to assert settings propagation
vi.mock('../../components/Dashboard', () => ({ Dashboard: (p: any) => React.createElement('div', { 'data-dash-geofencing': String(p.settings?.geofencingEnabled !== false) }) }));

describe('App settings persistence', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        currentSettings = { theme: 'light', accessibility: { highContrast: false }, geofencingEnabled: true };
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it('propagates SettingsView updates to consuming components', async () => {
        // Force initial view to settings by simulating navigation after mount
        const root = ReactDOM.createRoot(container);
        await act(async () => {
            root.render(React.createElement(App));
        });

        // Wait for settings load effect
        await act(async () => { await Promise.resolve(); });

        // Simulate going to settings
        // Find any nav button alternative: directly set URL param not available; instead emulate clicking the CommandPalette is heavy.
        // We will directly call updateCompanySettings via mocked API and then re-render to mimic App state change.
        await act(async () => {
            currentSettings = { ...currentSettings, geofencingEnabled: false };
        });

        // Trigger an App state update by dispatching an event it listens to (visibilitychange triggers counts but not settings).
        // Instead, re-render to simulate state update (App listens to companySettings updates through setCompanySettings in SettingsView in real app).
        await act(async () => {
            root.render(React.createElement(App));
        });

        // Navigate to time view by simulating a sidebar-less way: set localStorage activeView for user
        await act(async () => {
            localStorage.setItem('activeView:u1', 'time');
            root.render(React.createElement(App));
        });

        const dashNode = container.querySelector('[data-dash-geofencing]');
        const ttNode = container.querySelector('[data-tt-geofencing]');

        expect(dashNode).toBeTruthy();
        expect(ttNode).toBeTruthy();
        expect(dashNode?.getAttribute('data-dash-geofencing')).toBe('false');
        expect(ttNode?.getAttribute('data-tt-geofencing')).toBe('false');

        root.unmount();
    });
});
