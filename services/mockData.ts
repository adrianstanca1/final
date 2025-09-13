// full contents of services/mockData.ts

import { Role, TodoStatus, TimesheetStatus, IncidentStatus, IncidentSeverity, TodoPriority, InvoiceStatus, QuoteStatus, ExpenseCategory, ExpenseStatus, NotificationType, DocumentStatus, EquipmentStatus } from '../types';

export const initialData = {
    companies: [
        { id: 1, name: 'ConstructCo', status: 'Active', subscriptionPlan: 'Enterprise', storageUsageGB: 125.5 },
        { id: 2, name: 'Renovate Ltd.', status: 'Active', subscriptionPlan: 'Pro', storageUsageGB: 42.1 },
    ],
    users: [
        { id: 0, name: 'Alex Nova', email: 'alex@asagents.com', role: Role.PRINCIPAL_ADMIN, companyId: null, avatarUrl: 'https://i.pravatar.cc/150?u=0' },
        { id: 1, name: 'Samantha Lee', email: 'sam@constructco.com', role: Role.ADMIN, companyId: 1, avatarUrl: 'https://i.pravatar.cc/150?u=1' },
        { id: 2, name: 'David Chen', email: 'david@constructco.com', role: Role.PM, companyId: 1, avatarUrl: 'https://i.pravatar.cc/150?u=2' },
        { id: 3, name: 'Maria Garcia', email: 'maria@constructco.com', role: Role.FOREMAN, companyId: 1, avatarUrl: 'https://i.pravatar.cc/150?u=3' },
        { id: 4, name: 'Bob Williams', email: 'bob@constructco.com', role: Role.OPERATIVE, companyId: 1, avatarUrl: 'https://i.pravatar.cc/150?u=4' },
        { id: 5, name: 'John Smith', email: 'john@renovate.com', role: Role.ADMIN, companyId: 2, avatarUrl: 'https://i.pravatar.cc/150?u=5' },
        { id: 6, name: 'Emily White', email: 'emily@renovate.com', role: Role.PM, companyId: 2, avatarUrl: 'https://i.pravatar.cc/150?u=6' },
        { id: 7, name: 'Carlos Diaz', email: 'carlos@constructco.com', role: Role.OPERATIVE, companyId: 1, avatarUrl: 'https://i.pravatar.cc/150?u=7' },
    ],
    projects: [
        { id: 101, companyId: 1, name: 'Downtown Tower', location: { address: '123 Main St, London', lat: 51.5074, lng: -0.1278 }, budget: 5000000, actualCost: 3250000, startDate: new Date('2023-01-15'), status: 'Active', imageUrl: 'https://picsum.photos/seed/tower/800/400', projectType: 'Commercial', workClassification: 'New Build', geofenceRadius: 200 },
        { id: 102, companyId: 1, name: 'North Bridge Retrofit', location: { address: '456 Oak Ave, Manchester', lat: 53.4808, lng: -2.2426 }, budget: 1200000, actualCost: 1350000, startDate: new Date('2022-11-01'), status: 'Completed', imageUrl: 'https://picsum.photos/seed/bridge/800/400', projectType: 'Infrastructure', workClassification: 'Retrofit' },
        { id: 201, companyId: 2, name: 'Victorian House Reno', location: { address: '789 Pine Ln, Bristol', lat: 51.4545, lng: -2.5879 }, budget: 250000, actualCost: 180000, startDate: new Date('2023-03-10'), status: 'Active', imageUrl: 'https://picsum.photos/seed/house/800/400', projectType: 'Residential', workClassification: 'Renovation', geofenceRadius: 100 },
    ],
    projectAssignments: [
        { id: 1, projectId: 101, userId: 2 },
        { id: 2, projectId: 101, userId: 3 },
        { id: 3, projectId: 101, userId: 4 },
        { id: 4, projectId: 101, userId: 7 },
        { id: 5, projectId: 102, userId: 2 },
        { id: 6, projectId: 201, userId: 6 },
    ],
    todos: [
        { id: 1, projectId: 101, text: 'Finalize foundation pouring', status: TodoStatus.IN_PROGRESS, priority: TodoPriority.HIGH, assigneeId: 3, dueDate: new Date(new Date().setDate(new Date().getDate() + 1)), createdAt: new Date(), updatedAt: new Date() },
        { id: 2, projectId: 101, text: 'Install HVAC system on floor 5', status: TodoStatus.TODO, priority: TodoPriority.MEDIUM, assigneeId: 4, dueDate: new Date(new Date().setDate(new Date().getDate() + 5)), dependsOn: [1], createdAt: new Date(), updatedAt: new Date() },
        { id: 3, projectId: 101, text: 'Source interior fixtures', status: TodoStatus.TODO, priority: TodoPriority.LOW, assigneeId: 2, dueDate: new Date(new Date().setDate(new Date().getDate() + 14)), createdAt: new Date(), updatedAt: new Date() },
        { id: 4, projectId: 201, text: 'Strip wallpaper in living room', status: TodoStatus.DONE, priority: TodoPriority.MEDIUM, assigneeId: 6, dueDate: null, completedAt: new Date(), completedBy: 6, createdAt: new Date(), updatedAt: new Date() },
        { id: 5, projectId: 101, text: 'Clear debris from west entrance', status: TodoStatus.TODO, priority: TodoPriority.MEDIUM, assigneeId: 7, dueDate: new Date(), createdAt: new Date(), updatedAt: new Date() },
        { id: 6, projectId: 101, text: 'Electrical wiring for Floor 5', status: TodoStatus.TODO, priority: TodoPriority.HIGH, assigneeId: 4, dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), dependsOn: [2], createdAt: new Date(), updatedAt: new Date() },
    ],
    timesheets: [
        { id: 1, userId: 4, projectId: 101, clockIn: new Date(new Date().setDate(new Date().getDate() - 1)), clockOut: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(17)), status: TimesheetStatus.PENDING },
        { id: 2, userId: 3, projectId: 101, clockIn: new Date(new Date().setDate(new Date().getDate() - 2)), clockOut: new Date(new Date(new Date().setDate(new Date().getDate() - 2)).setHours(17)), status: TimesheetStatus.APPROVED },
        { id: 3, userId: 4, projectId: 101, clockIn: new Date(), clockOut: null, status: TimesheetStatus.DRAFT },
    ],
    safetyIncidents: [
        { id: 1, companyId: 1, projectId: 101, description: 'Minor slip on wet surface, no injury.', timestamp: new Date(), status: IncidentStatus.RESOLVED, severity: IncidentSeverity.LOW, reportedById: 3 },
        { id: 2, companyId: 1, projectId: 101, description: 'Incorrect ladder usage observed.', timestamp: new Date(new Date().setDate(new Date().getDate() - 5)), status: IncidentStatus.REPORTED, severity: IncidentSeverity.MEDIUM, reportedById: 3 },
    ],
    equipment: [
        { id: 1, companyId: 1, name: 'Excavator CAT 320', status: 'In Use', projectId: 101 },
        { id: 2, companyId: 1, name: 'Crane Liebherr LTM 1070', status: 'Available', projectId: null },
        { id: 3, companyId: 1, name: 'Concrete Mixer', status: 'Maintenance', projectId: null },
    ],
    resourceAssignments: [
        { id: 1, companyId: 1, projectId: 101, resourceId: 4, resourceType: 'user', startDate: new Date('2023-01-15'), endDate: new Date('2024-01-15') },
        { id: 2, companyId: 1, projectId: 101, resourceId: 1, resourceType: 'equipment', startDate: new Date('2023-01-15'), endDate: new Date('2023-08-15') },
    ],
    clients: [
        { id: 1, companyId: 1, name: 'Global Real Estate Inc.', contactEmail: 'contact@gre.com', contactPhone: '555-0101', createdAt: new Date('2022-05-20')},
        { id: 2, companyId: 2, name: 'The Millers', contactEmail: 'millers@email.com', contactPhone: '555-0102', createdAt: new Date('2023-01-10')},
    ],
    invoices: [
        { id: 1, companyId: 1, clientId: 1, projectId: 102, invoiceNumber: 'INV-001', issuedAt: new Date('2023-02-01'), dueAt: new Date('2023-03-01'), total: 500000, amountPaid: 500000, status: InvoiceStatus.PAID },
        { id: 2, companyId: 1, clientId: 1, projectId: 101, invoiceNumber: 'INV-002', issuedAt: new Date(), dueAt: new Date(new Date().setDate(new Date().getDate() + 30)), total: 750000, amountPaid: 0, status: InvoiceStatus.SENT },
    ],
    quotes: [
        { id: 1, companyId: 2, clientId: 2, projectId: 201, quoteNumber: 'QT-001', issuedAt: new Date('2023-02-15'), total: 245000, status: QuoteStatus.ACCEPTED },
    ],
    expenses: [
        { id: 1, companyId: 1, userId: 2, projectId: 101, amount: 550, currency: 'GBP', description: 'Client lunch meeting', category: ExpenseCategory.OTHER, status: ExpenseStatus.APPROVED, submittedAt: new Date(new Date().setDate(new Date().getDate() - 10))},
        { id: 2, companyId: 1, userId: 3, projectId: 101, amount: 120, currency: 'GBP', description: 'Safety vests', category: ExpenseCategory.MATERIALS, status: ExpenseStatus.PENDING, submittedAt: new Date()},
    ],
    projectTemplates: [
        { id: 1, companyId: 1, name: 'Standard Commercial Build', description: 'Template for new commercial projects', templateTasks: [{ text: 'Site Survey', priority: TodoPriority.HIGH }, { text: 'Permit Application', priority: TodoPriority.HIGH }], documentCategories: ['Blueprints', 'Permits', 'Contracts'] },
    ],
    notifications: [
        { id: 1, userId: 1, type: NotificationType.APPROVAL_REQUEST, message: 'Bob Williams submitted a timesheet for approval.', isRead: false, timestamp: new Date() },
        { id: 2, userId: 4, type: NotificationType.TASK_ASSIGNED, message: 'You were assigned to "Install HVAC system".', isRead: true, timestamp: new Date(new Date().setDate(new Date().getDate() - 1)) },
    ],
    auditLogs: [
        { id: 1, companyId: 1, actorId: 2, action: 'project_status_changed', timestamp: new Date(new Date().setDate(new Date().getDate() - 1)), target: { type: 'Project', id: 102, name: 'North Bridge Retrofit' } },
        { id: 2, companyId: 1, actorId: 1, action: 'user_login', timestamp: new Date() }
    ],
    conversations: [
        { id: 'c1', participantIds: [2, 3], lastMessage: { id: 'm1', conversationId: 'c1', senderId: 3, content: 'Hey, can you check the rebar delivery status?', timestamp: new Date(new Date().getTime() - 5 * 60000), isRead: false } },
    ],
    documents: [
        { id: 1, companyId: 1, projectId: 101, name: 'Foundation_Blueprint_v2.pdf', url: '#', category: 'Blueprints', uploadedAt: new Date(), uploadedById: 2, version: 2 },
    ]
};