import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Permission, Role } from '../types.js';
import { hasPermission } from '../services/auth.js';
const iconClass = 'h-5 w-5';
const icons = {
    dashboard: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" }) })),
    tasks: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 8l2 2 4-4" }) })),
    projects: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" }) })),
    map: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m0 13V7m0 0L9 4" }) })),
    time: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" }) })),
    timesheets: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" }) })),
    documents: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) })),
    safety: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" }) })),
    financials: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" }) })),
    team: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" }) })),
    chat: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" }) })),
    equipment: (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: [_jsx("path", { d: "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" }), _jsx("path", { d: "M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" })] })),
    templates: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 10h16M4 14h16M4 18h16" }) })),
    tools: (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: [_jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" }), _jsx("path", { d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" })] })),
    audit: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M3 4a1 1 0 011-1h16a1 1 0 011 1v14a1 1 0 01-1 1h-6l-4 4v-4H4a1 1 0 01-1-1V4z" }) })),
    settings: (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: [_jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" }), _jsx("path", { d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" })] })),
    clients: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857M9 7a3 3 0 116 0 3 3 0 01-6 0zm10 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" }) })),
    invoices: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2m-4 4h4m-4 4h4m-4 4h4m-8-8h.01m-.01 4h.01m-.01 4h.01" }) })),
};
const navigationSchema = [
    {
        id: 'overview',
        title: 'Overview',
        items: [
            {
                id: 'dashboard',
                label: (user) => {
                    if (user.role === Role.OPERATIVE)
                        return 'My Day';
                    if (user.role === Role.FOREMAN)
                        return 'Field Dashboard';
                    if (user.role === Role.PRINCIPAL_ADMIN)
                        return 'Platform Overview';
                    return 'Operations Dashboard';
                },
                view: 'dashboard',
                icon: icons.dashboard,
                description: 'Stay on top of your jobs, resources, and risk alerts.',
                getView: (user) => {
                    if (user.role === Role.OPERATIVE)
                        return 'my-day';
                    if (user.role === Role.FOREMAN)
                        return 'foreman-dashboard';
                    if (user.role === Role.PRINCIPAL_ADMIN)
                        return 'principal-dashboard';
                    return 'dashboard';
                },
            },
            {
                id: 'all-tasks',
                label: 'Task Command Center',
                view: 'all-tasks',
                icon: icons.tasks,
                description: 'Monitor and reassign open tasks across the portfolio.',
                requiredPermissions: [Permission.VIEW_ALL_TASKS],
            },
            {
                id: 'projects',
                label: 'Project Portfolio',
                view: 'projects',
                icon: icons.projects,
                description: 'Access every job you own or are assigned to.',
                isVisible: (user) => hasPermission(user, Permission.VIEW_ALL_PROJECTS) ||
                    hasPermission(user, Permission.VIEW_ASSIGNED_PROJECTS),
            },
            {
                id: 'map',
                label: 'Geospatial Map',
                view: 'map',
                icon: icons.map,
                description: 'Visualise active projects on a live map.',
                isVisible: (user) => hasPermission(user, Permission.VIEW_ALL_PROJECTS) ||
                    hasPermission(user, Permission.VIEW_ASSIGNED_PROJECTS),
            },
        ],
    },
    {
        id: 'operations',
        title: 'Site Operations',
        items: [
            {
                id: 'time',
                label: 'Time Clock',
                view: 'time',
                icon: icons.time,
                description: 'Clock in/out and capture labour hours.',
                requiredPermissions: [Permission.SUBMIT_TIMESHEET],
            },
            {
                id: 'timesheets',
                label: 'Timesheet Approvals',
                view: 'timesheets',
                icon: icons.timesheets,
                description: 'Review pending submissions awaiting approval.',
                requiredPermissions: [Permission.VIEW_ALL_TIMESHEETS],
                getBadge: (counts) => counts.pendingTimesheetCount,
            },
            {
                id: 'documents',
                label: 'Document Vault',
                view: 'documents',
                icon: icons.documents,
                description: 'Manage drawings, RFIs, and permits by project.',
                requiredPermissions: [Permission.VIEW_DOCUMENTS],
            },
            {
                id: 'safety',
                label: 'Safety & Compliance',
                view: 'safety',
                icon: icons.safety,
                description: 'Track incidents, toolbox talks, and inspections.',
                requiredPermissions: [Permission.VIEW_SAFETY_REPORTS],
                getBadge: (counts) => counts.openIncidentCount,
            },
            {
                id: 'equipment',
                label: 'Equipment Control',
                view: 'equipment',
                icon: icons.equipment,
                description: 'Monitor utilisation and maintenance windows.',
                requiredPermissions: [Permission.MANAGE_EQUIPMENT],
            },
        ],
    },
    {
        id: 'collaboration',
        title: 'Collaboration',
        items: [
            {
                id: 'team',
                label: 'Workforce',
                view: 'users',
                icon: icons.team,
                description: 'Coordinate staffing and availability.',
                requiredPermissions: [Permission.VIEW_TEAM],
            },
            {
                id: 'chat',
                label: 'Team Chat',
                view: 'chat',
                icon: icons.chat,
                description: 'Direct messaging across crews and offices.',
                requiredPermissions: [Permission.SEND_DIRECT_MESSAGE],
                getBadge: (counts) => counts.unreadMessageCount,
            },
            {
                id: 'clients',
                label: 'Client Directory',
                view: 'clients',
                icon: icons.clients,
                description: 'Centralise client contacts and account health.',
                isVisible: (user) => hasPermission(user, Permission.VIEW_ALL_PROJECTS) ||
                    user.role === Role.ADMIN ||
                    user.role === Role.OWNER,
            },
        ],
    },
    {
        id: 'business',
        title: 'Commercial',
        items: [
            {
                id: 'financials',
                label: 'Financials',
                view: 'financials',
                icon: icons.financials,
                description: 'Track burn rate, budget variances, and forecasts.',
                requiredPermissions: [Permission.VIEW_FINANCES],
            },
            {
                id: 'invoices',
                label: 'Invoices',
                view: 'invoices',
                icon: icons.invoices,
                description: 'Review accounts receivable and billing status.',
                requiredPermissions: [Permission.VIEW_FINANCES],
            },
            {
                id: 'templates',
                label: 'Project Templates',
                view: 'templates',
                icon: icons.templates,
                description: 'Standardise bids, schedules, and document packs.',
                requiredPermissions: [Permission.MANAGE_PROJECT_TEMPLATES],
            },
            {
                id: 'tools',
                label: 'Intelligence Tools',
                view: 'tools',
                icon: icons.tools,
                description: 'AI co-pilots for risk, bidding, and reporting.',
                requiredPermissions: [Permission.ACCESS_ALL_TOOLS],
            },
            {
                id: 'audit',
                label: 'Audit Log',
                view: 'audit-log',
                icon: icons.audit,
                description: 'Trace configuration and data changes platform-wide.',
                requiredPermissions: [Permission.VIEW_AUDIT_LOG],
            },
            {
                id: 'settings',
                label: 'Workspace Settings',
                view: 'settings',
                icon: icons.settings,
                description: 'Control company preferences, integrations, and theme.',
            },
        ],
    },
];
const resolveLabel = (item, user) => {
    if (typeof item.label === 'function') {
        return item.label(user);
    }
    return item.label;
};
const shouldRenderItem = (item, user) => {
    if (item.roles && !item.roles.includes(user.role)) {
        return false;
    }
    if (item.excludeRoles && item.excludeRoles.includes(user.role)) {
        return false;
    }
    if (item.requiredPermissions && !item.requiredPermissions.every(permission => hasPermission(user, permission))) {
        return false;
    }
    if (item.anyPermissions && !item.anyPermissions.some(permission => hasPermission(user, permission))) {
        return false;
    }
    if (item.isVisible && !item.isVisible(user)) {
        return false;
    }
    return true;
};
export const buildNavigationForUser = (user, counts) => {
    return navigationSchema
        .map(section => {
        const items = section.items
            .filter(item => shouldRenderItem(item, user))
            .map(item => {
            const resolvedView = item.getView ? item.getView(user) : item.view;
            const badge = item.getBadge ? item.getBadge(counts, user) : undefined;
            return {
                id: item.id,
                label: resolveLabel(item, user),
                view: resolvedView,
                icon: item.icon,
                badgeCount: badge,
                description: item.description,
            };
        });
        if (items.length === 0) {
            return null;
        }
        if (section.roles && !section.roles.includes(user.role)) {
            return null;
        }
        return {
            id: section.id,
            title: section.title,
            items,
        };
    })
        .filter((section) => Boolean(section));
};
//# sourceMappingURL=navigation.js.map