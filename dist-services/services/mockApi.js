// A mock API that persists data using a browser-like storage adapter.
// Supports offline queuing for write operations.
import { initialData } from './mockData.js';
import { IncidentSeverity, InvoiceStatus, Role, TimesheetStatus, IncidentStatus, ExpenseStatus, TodoStatus, TodoPriority, RolePermissions } from '../types.js';
import { createPasswordRecord, sanitizeUser, upgradeLegacyPassword, verifyPassword } from '../utils/password.js';
import { getStorage } from '../utils/storage.js';
import { apiCache } from './cacheService.js';
import { ValidationService } from './validationService.js';
import { safeString } from '../utils/string.js';
import { computeProjectPortfolioSummary } from '../utils/projectPortfolio.js';
import { getInvoiceFinancials } from '../utils/finance.js';
// Create instances
// Use apiCache directly from cacheService
const securityValidation = {
    checkRateLimit: (key, limit, windowMs) => true, // Simplified for mock
    checkSqlInjection: (input) => false, // Simplified for mock
    checkXss: (input) => false // Simplified for mock
};
// Base64 utilities
const encodeBase64 = (value) => {
    if (typeof btoa === 'function') {
        return btoa(value);
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(value, 'binary').toString('base64');
    }
    throw new Error('Base64 encoding is not supported in this environment.');
};
const decodeBase64 = (value) => {
    if (typeof atob === 'function') {
        return atob(value);
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(value, 'base64').toString('binary');
    }
    throw new Error('Base64 decoding is not supported in this environment.');
};
const delay = (ms = 50) => new Promise(res => setTimeout(res, ms));
// Helper function for type-safe enum normalization
const normalizeToEnum = (value, enumObj) => {
    if (value === null || value === undefined)
        return null;
    let strValue;
    if (typeof value === 'string') {
        strValue = value.toUpperCase();
    }
    else if (typeof value === 'number') {
        strValue = String(value).toUpperCase();
    }
    else {
        return null;
    }
    const enumValues = Object.values(enumObj);
    return enumValues.includes(strValue) ? strValue : null;
};
// Helper for string normalization when not working with enums
const normalizeStringValue = (value) => {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'string')
        return value.toUpperCase();
    if (typeof value === 'number')
        return String(value).toUpperCase();
    return null;
};
// Type-safe versions for specific enums
const normalizeTodoStatus = (value) => {
    return normalizeToEnum(value, TodoStatus);
};
const normalizeTimesheetStatus = (value) => {
    return normalizeToEnum(value, TimesheetStatus);
};
const normalizeIncidentStatus = (value) => {
    return normalizeToEnum(value, IncidentStatus);
};
const normalizeIncidentSeverity = (value) => {
    return normalizeToEnum(value, IncidentSeverity);
};
const isApprovedExpense = (value) => {
    const status = normalizeToEnum(value, ExpenseStatus);
    return status === ExpenseStatus.APPROVED || status === ExpenseStatus.PAID;
};
const ensureNotAborted = (signal) => {
    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
};
// Removed duplicate delay function - already exists elsewhere
// Enhanced API with caching, validation, and rate limiting
const withCache = (key, fetcher, ttl) => {
    const cached = apiCache.get(key);
    if (cached)
        return Promise.resolve(cached);
    return fetcher().then(result => {
        apiCache.set(key, result, ttl);
        return result;
    });
};
const withValidation = (data, rules) => {
    const result = ValidationService.validate(data, rules);
    if (!result.isValid) {
        throw new Error(`Validation failed: ${Object.values(result.errors).flat().join(', ')}`);
    }
    return result.sanitizedData;
};
const withRateLimit = (key, limit = 100, windowMs = 60000) => {
    if (!securityValidation.checkRateLimit(key, limit, windowMs)) {
        throw new Error('Rate limit exceeded. Please try again later.');
    }
};
const withSecurity = (input) => {
    if (securityValidation.checkSqlInjection(input)) {
        throw new Error('Invalid input detected');
    }
    if (securityValidation.checkXss(input)) {
        throw new Error('Invalid input detected');
    }
};
const JWT_SECRET = 'your-super-secret-key-for-mock-jwt';
const MOCK_ACCESS_TOKEN_LIFESPAN = 15 * 60 * 1000; // 15 minutes
const MOCK_REFRESH_TOKEN_LIFESPAN = 7 * 24 * 60 * 60 * 1000; // 7 days
const MOCK_RESET_TOKEN_LIFESPAN = 60 * 60 * 1000; // 1 hour
const normalizeEmail = (email) => email.trim().toLowerCase();
const normalizeInviteToken = (token) => token.trim().toUpperCase();
// In-memory store for password reset tokens for this mock implementation
const passwordResetTokens = new Map();
const storage = getStorage();
const BASE_INVITE_TOKENS = [
    ['JOIN-CONSTRUCTCO', {
            companyId: '1',
            allowedRoles: [Role.ADMIN, Role.PROJECT_MANAGER, Role.FOREMAN, Role.OPERATIVE],
            suggestedRole: Role.PROJECT_MANAGER,
        }],
    ['JOIN-RENOVATE', {
            companyId: '2',
            allowedRoles: [Role.ADMIN, Role.PROJECT_MANAGER, Role.FOREMAN, Role.OPERATIVE],
            suggestedRole: Role.FOREMAN,
        }],
    ['JOIN-CLIENT', {
            companyId: '3',
            allowedRoles: [Role.CLIENT],
            suggestedRole: Role.CLIENT,
        }],
];
const inviteTokenDirectory = new Map();
const resetInviteTokens = () => {
    inviteTokenDirectory.clear();
    BASE_INVITE_TOKENS.forEach(([token, config]) => {
        inviteTokenDirectory.set(token, { ...config });
    });
};
resetInviteTokens();
const defaultCompanySettings = () => ({
    theme: 'light',
    accessibility: { highContrast: false },
    timeZone: 'Europe/London',
    dateFormat: 'DD/MM/YYYY',
    currency: 'GBP',
    workingHours: {
        start: '08:00',
        end: '17:00',
        workDays: [1, 2, 3, 4, 5],
    },
    features: {
        projectManagement: true,
        timeTracking: true,
        financials: true,
        documents: true,
        safety: true,
        equipment: true,
        reporting: true,
    },
});
const mergeCompanySettings = (current, updates) => {
    const mergedWorkingHours = updates.workingHours
        ? {
            ...current.workingHours,
            ...updates.workingHours,
            ...(updates.workingHours.workDays
                ? { workDays: [...updates.workingHours.workDays] }
                : {}),
        }
        : current.workingHours;
    const mergedFeatures = updates.features
        ? { ...current.features, ...updates.features }
        : current.features;
    const mergedAccessibility = updates.accessibility
        ? { ...current.accessibility, ...updates.accessibility }
        : current.accessibility;
    return {
        ...current,
        ...updates,
        workingHours: mergedWorkingHours,
        features: mergedFeatures,
        accessibility: mergedAccessibility,
    };
};
const defaultUserPreferences = () => ({
    theme: 'system',
    language: 'en',
    notifications: {
        email: true,
        push: false,
        sms: false,
        taskReminders: true,
        projectUpdates: true,
        systemAlerts: true,
    },
    dashboard: {
        defaultView: 'dashboard',
        pinnedWidgets: [],
        hiddenWidgets: [],
    },
});
const createToken = (payload, expiresIn) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const extendedPayload = { ...payload, iat: Date.now(), exp: Math.floor((Date.now() + expiresIn) / 1000) };
    const encodedHeader = encodeBase64(JSON.stringify(header));
    const encodedPayload = encodeBase64(JSON.stringify(extendedPayload));
    const signature = encodeBase64(JWT_SECRET);
    return `${encodedHeader}.${encodedPayload}.${signature}`;
};
/**
 * Decodes a token and validates its expiration.
 * @param token The JWT to decode.
 * @returns The decoded payload if the token is valid and not expired, otherwise null.
 */
const decodeToken = (token) => {
    try {
        const payload = JSON.parse(decodeBase64(token.split('.')[1]));
        // This check ensures the token has not expired.
        if (payload.exp * 1000 < Date.now()) {
            throw new Error("Token expired");
        }
        return payload;
    }
    catch (e) {
        console.error("Token decode/validation failed:", e);
        return null;
    }
};
const STORAGE_PREFIX = 'asagents_';
const clone = (value) => JSON.parse(JSON.stringify(value));
const readJson = (key, fallback) => {
    try {
        const stored = storage.getItem(key);
        if (!stored) {
            return fallback;
        }
        return JSON.parse(stored);
    }
    catch (error) {
        console.error(`Failed to read ${key} from storage`, error);
        return fallback;
    }
};
const writeJson = (key, value) => {
    storage.setItem(key, JSON.stringify(value));
};
const DEFAULT_COLLECTIONS = {
    companies: clone(initialData.companies),
    users: clone(initialData.users),
    projects: clone(initialData.projects),
    todos: clone(initialData.todos),
    timeEntries: clone(initialData.timeEntries),
    safetyIncidents: clone(initialData.safetyIncidents),
    equipment: clone(initialData.equipment),
    clients: clone(initialData.clients),
    invoices: clone(initialData.invoices),
    expenses: clone(initialData.expenses || []),
    siteUpdates: clone(initialData.siteUpdates),
    projectMessages: clone(initialData.projectMessages),
    notifications: clone(initialData.notifications || []),
    quotes: clone(initialData.quotes || []),
    auditLogs: [],
    resourceAssignments: [],
    conversations: [],
    messages: [],
    projectAssignments: [],
    projectTemplates: [],
    whiteboardNotes: [],
    documents: [],
    projectInsights: clone(initialData.projectInsights || []),
    financialForecasts: [],
};
const readCollection = (key) => {
    const storageKey = `${STORAGE_PREFIX}${String(key)}`;
    try {
        const stored = storage.getItem(storageKey);
        if (stored) {
            return JSON.parse(stored);
        }
    }
    catch (error) {
        console.error(`Failed to hydrate ${String(key)} from storage`, error);
    }
    const fallback = clone(DEFAULT_COLLECTIONS[key]);
    storage.setItem(storageKey, JSON.stringify(fallback));
    return fallback;
};
const createDb = () => ({
    companies: readCollection('companies'),
    users: readCollection('users'),
    projects: readCollection('projects'),
    todos: readCollection('todos'),
    timeEntries: readCollection('timeEntries'),
    safetyIncidents: readCollection('safetyIncidents'),
    equipment: readCollection('equipment'),
    clients: readCollection('clients'),
    invoices: readCollection('invoices'),
    expenses: readCollection('expenses'),
    siteUpdates: readCollection('siteUpdates'),
    projectMessages: readCollection('projectMessages'),
    notifications: readCollection('notifications'),
    quotes: readCollection('quotes'),
    auditLogs: readCollection('auditLogs'),
    resourceAssignments: readCollection('resourceAssignments'),
    conversations: readCollection('conversations'),
    messages: readCollection('messages'),
    projectAssignments: readCollection('projectAssignments'),
    projectTemplates: readCollection('projectTemplates'),
    whiteboardNotes: readCollection('whiteboardNotes'),
    documents: readCollection('documents'),
    projectInsights: readCollection('projectInsights'),
    financialForecasts: readCollection('financialForecasts'),
});
let db = createDb();
const saveDb = () => {
    Object.keys(db).forEach(key => {
        storage.setItem(`${STORAGE_PREFIX}${String(key)}`, JSON.stringify(db[key]));
    });
};
const findUserByEmail = (email) => {
    const normalized = normalizeEmail(email);
    return db.users.find(u => u.email && u.email.toLowerCase() === normalized);
};
const sanitizeUserForReturn = (user) => sanitizeUser(user);
const sanitizeUsersForReturn = (users) => users.map(u => sanitizeUserForReturn(u));
const findProjectById = (projectId) => {
    if (projectId == null) {
        return undefined;
    }
    return db.projects.find(project => project.id != null && safeString(project.id) === safeString(projectId));
};
const resolveCompanyIdFromProject = (projectId) => {
    const project = findProjectById(projectId);
    return project?.companyId != null ? String(project.companyId) : null;
};
const resolveCompanyIdFromUser = (userId) => {
    if (userId == null) {
        return null;
    }
    const user = db.users.find(candidate => candidate.id != null && safeString(candidate.id) === safeString(userId));
    return user?.companyId != null ? String(user.companyId) : null;
};
const resolveCompanyIdForInvoice = (invoice) => {
    // Access properties safely without type assertions
    const invoiceAny = invoice;
    const directCompany = invoiceAny.companyId;
    if (directCompany != null) {
        return safeString(directCompany);
    }
    const projectCompany = resolveCompanyIdFromProject(invoice.projectId);
    if (projectCompany) {
        return projectCompany;
    }
    if (invoice.clientId != null) {
        const client = db.clients.find(candidate => candidate.id != null && safeString(candidate.id) === safeString(invoice.clientId));
        if (client?.companyId != null) {
            return safeString(client.companyId);
        }
    }
    return null;
};
const resolveCompanyIdForExpense = (expense) => {
    // Access properties safely without type assertions
    const expenseAny = expense;
    const directCompany = expenseAny.companyId;
    if (directCompany != null) {
        return safeString(directCompany);
    }
    const projectCompany = resolveCompanyIdFromProject(expenseAny.projectId);
    if (projectCompany) {
        return projectCompany;
    }
    const userId = expenseAny.userId;
    if (userId != null) {
        return resolveCompanyIdFromUser(userId);
    }
    return null;
};
const getCompanyCurrency = (companyId) => {
    const company = db.companies.find(entry => entry.id != null && String(entry.id) === String(companyId));
    // Access properties safely without type assertions
    if (!company) {
        return 'GBP';
    }
    const companyAny = company;
    const directCurrency = companyAny.currency;
    if (typeof directCurrency === 'string' && directCurrency.trim().length > 0) {
        return directCurrency;
    }
    const settings = companyAny.settings;
    const settingsCurrency = settings?.currency;
    if (typeof settingsCurrency === 'string' && settingsCurrency.trim().length > 0) {
        return settingsCurrency;
    }
    return 'GBP';
};
const safeNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return 0;
};
const parseDate = (value) => {
    if (!value) {
        return null;
    }
    const parsed = value instanceof Date ? value : new Date(safeString(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const getMonthLabel = (date) => date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
const MILLISECONDS_PER_HOUR = 1000 * 60 * 60;
const MILLISECONDS_PER_DAY = MILLISECONDS_PER_HOUR * 24;
// Helper functions for date operations
const getDateRanges = () => {
    const now = new Date();
    const isoNow = now.toISOString();
    const nowTime = now.getTime();
    // Start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    // Week range
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const weekday = weekStart.getDay();
    const isoWeekday = weekday === 0 ? 6 : weekday - 1;
    weekStart.setDate(weekStart.getDate() - isoWeekday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return {
        now,
        isoNow,
        nowTime,
        startOfMonth,
        weekStart,
        weekEnd
    };
};
// Helper function for timesheet hours calculation
const getTimesheetHours = (entry) => {
    // Access properties safely without type assertions
    const entryAny = entry;
    const start = parseDate(entry.startTime ?? entryAny.clockIn);
    const end = parseDate(entry.endTime ?? entryAny.clockOut);
    if (start && end) {
        return Math.max(0, (end.getTime() - start.getTime()) / MILLISECONDS_PER_HOUR);
    }
    const recorded = safeNumber(entryAny.duration ?? entry.duration);
    if (recorded <= 0) {
        return 0;
    }
    if (recorded > 48) {
        return recorded / 60;
    }
    return recorded;
};
// Helper functions for operational insights
const getRelevantCompanyData = (companyId) => {
    const projects = db.projects.filter(project => project.companyId === companyId);
    const projectIds = new Set();
    for (const project of projects) {
        if (project.id != null) {
            projectIds.add(String(project.id));
        }
    }
    const companyUsers = db.users.filter(user => user.companyId === companyId);
    const userIds = new Set();
    for (const user of companyUsers) {
        if (user.id != null) {
            userIds.add(String(user.id));
        }
    }
    return { projects, projectIds, companyUsers, userIds };
};
const getCompanyTodos = (projectIds, userIds) => {
    return db.todos.filter(todo => {
        // Access properties safely without unnecessary type assertions
        const todoAny = todo;
        const projectId = todoAny.projectId;
        if (projectId != null && projectIds.has(safeString(projectId))) {
            return true;
        }
        const assignee = todoAny.assignedTo ?? todoAny.assigneeId;
        return assignee != null && userIds.has(safeString(assignee));
    });
};
const getCompanyTimesheets = (companyId) => {
    return db.timeEntries.filter(entry => {
        const projectCompany = resolveCompanyIdFromProject(entry.projectId);
        if (projectCompany === companyId) {
            return true;
        }
        const userCompany = resolveCompanyIdFromUser(entry.userId);
        return userCompany === companyId;
    });
};
const getTimesheetMetrics = (timesheets, dates) => {
    const submittedTimesheets = timesheets.filter(entry => {
        const status = normalizeTimesheetStatus(entry.status);
        return status !== null && status !== TimesheetStatus.DRAFT;
    });
    const approvedTimesheets = submittedTimesheets.filter(entry => normalizeTimesheetStatus(entry.status) === TimesheetStatus.APPROVED);
    const pendingApprovals = submittedTimesheets.filter(entry => normalizeTimesheetStatus(entry.status) === TimesheetStatus.PENDING).length;
    const activeTimesheets = timesheets.filter(entry => {
        const status = normalizeTimesheetStatus(entry.status);
        if (status !== TimesheetStatus.PENDING) {
            return false;
        }
        const hasEnded = entry.endTime != null || entry.clockOut != null;
        return !hasEnded;
    }).length;
    const complianceRate = submittedTimesheets.length
        ? (approvedTimesheets.length / submittedTimesheets.length) * 100
        : 0;
    const hoursLogged = submittedTimesheets
        .map(entry => getTimesheetHours(entry))
        .filter(hours => hours > 0);
    const totalHoursLogged = hoursLogged.reduce((sum, hours) => sum + hours, 0);
    const averageHours = hoursLogged.length ? totalHoursLogged / hoursLogged.length : 0;
    const overtimeHours = hoursLogged.reduce((sum, hours) => sum + Math.max(0, hours - 8), 0);
    const approvedThisWeek = approvedTimesheets.filter(entry => {
        const completionDate = parseDate(entry.updatedAt ?? entry.endTime ?? entry.clockOut ?? entry.approvedAt);
        if (!completionDate) {
            return false;
        }
        return completionDate >= dates.weekStart && completionDate < dates.weekEnd;
    }).length;
    return {
        submittedTimesheets,
        approvedTimesheets,
        pendingApprovals,
        activeTimesheets,
        complianceRate,
        averageHours,
        overtimeHours,
        approvedThisWeek
    };
};
const getTaskMetrics = (todos, dates) => {
    const tasksWithDueDates = todos.filter(todo => parseDate(todo.dueDate ?? todo.due_at));
    const tasksDueSoon = tasksWithDueDates.filter(todo => {
        // Access properties safely without type assertions
        const todoAny = todo;
        const due = parseDate(todoAny.dueDate ?? todoAny.due_at);
        if (!due) {
            return false;
        }
        const time = due.getTime();
        return time >= dates.nowTime && time <= dates.nowTime + 7 * MILLISECONDS_PER_DAY;
    }).length;
    const overdueTasks = tasksWithDueDates.filter(todo => {
        // Access properties safely without type assertions
        const todoAny = todo;
        const due = parseDate(todoAny.dueDate ?? todoAny.due_at);
        if (!due) {
            return false;
        }
        const status = normalizeTodoStatus(todoAny.status);
        return due.getTime() < dates.nowTime && status !== TodoStatus.DONE;
    }).length;
    const tasksInProgress = todos.filter(todo => normalizeTodoStatus(todo.status) === TodoStatus.IN_PROGRESS).length;
    return { tasksDueSoon, overdueTasks, tasksInProgress };
};
const getSafetyMetrics = (incidents, dates) => {
    const openIncidents = incidents.filter(incident => {
        const status = normalizeIncidentStatus(incident.status);
        return status !== IncidentStatus.RESOLVED;
    });
    const highSeverity = openIncidents.filter(incident => {
        const severity = normalizeIncidentSeverity(incident.severity);
        return severity === IncidentSeverity.HIGH || severity === IncidentSeverity.CRITICAL;
    }).length;
    const lastIncidentDate = incidents.reduce((latest, incident) => {
        const date = parseDate(incident.incidentDate ?? incident.timestamp ?? incident.createdAt);
        if (!date) {
            return latest;
        }
        if (!latest || date.getTime() > latest.getTime()) {
            return date;
        }
        return latest;
    }, null);
    const daysSinceLastIncident = lastIncidentDate
        ? Math.max(0, Math.floor((dates.nowTime - lastIncidentDate.getTime()) / MILLISECONDS_PER_DAY))
        : null;
    return { openIncidents, highSeverity, daysSinceLastIncident };
};
const getFinancialMetrics = (expenses, invoices, dates) => {
    const approvedExpensesThisMonth = expenses.reduce((sum, expense) => {
        if (!isApprovedExpense(expense.status)) {
            return sum;
        }
        // Access properties safely without type assertions
        const expenseAny = expense;
        const expenseDate = parseDate(expense.date ?? expenseAny.submittedAt ?? expenseAny.createdAt);
        if (!expenseDate || expenseDate < dates.startOfMonth) {
            return sum;
        }
        return sum + safeNumber(expense.amount);
    }, 0);
    const outstandingReceivables = invoices.reduce((sum, invoice) => {
        const financials = getInvoiceFinancials(invoice);
        return sum + financials.balance;
    }, 0);
    return { approvedExpensesThisMonth, outstandingReceivables };
};
const upgradeLegacyUsers = () => {
    const legacyUsersToUpgrade = db.users.filter(u => u.password && (!u.passwordHash || !u.passwordSalt));
    if (legacyUsersToUpgrade.length === 0) {
        return;
    }
    Promise.all(legacyUsersToUpgrade.map(user => upgradeLegacyPassword(user)))
        .then(() => {
        saveDb();
    })
        .catch(error => console.error('Failed to upgrade legacy user credentials', error));
};
upgradeLegacyUsers();
const ensureUserPermissionConsistency = () => {
    let updated = false;
    db.users.forEach(user => {
        if (user.role && (!user.permissions || user.permissions.length === 0)) {
            user.permissions = Array.from(RolePermissions[user.role]);
            updated = true;
        }
    });
    if (updated) {
        saveDb();
    }
};
ensureUserPermissionConsistency();
const addAuditLog = (actorId, action, target) => {
    const newLog = {
        id: String(Date.now() + Math.random()),
        actorId,
        action,
        target,
        timestamp: new Date().toISOString(),
    };
    db.auditLogs.push(newLog);
    saveDb();
};
// Helper functions for registration
const validateBasicCredentials = (credentials) => {
    if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required.');
    }
    if (!credentials.termsAccepted) {
        throw new Error('You must accept the terms and conditions to create an account.');
    }
    const normalizedEmail = normalizeEmail(credentials.email);
    if (findUserByEmail(normalizedEmail)) {
        throw new Error('An account with this email already exists.');
    }
    return normalizedEmail;
};
const createNewCompany = (credentials) => {
    const companyName = credentials.companyName?.trim();
    const companyType = credentials.companyType;
    const companyEmail = credentials.companyEmail ? normalizeEmail(credentials.companyEmail) : undefined;
    const companyPhone = credentials.companyPhone?.trim();
    const companyWebsite = credentials.companyWebsite?.trim();
    if (!companyName || !companyType) {
        throw new Error('Company information is incomplete.');
    }
    const timestamp = String(Date.now());
    const companyId = timestamp;
    const companyRecord = {
        id: companyId,
        name: companyName,
        type: companyType,
        email: companyEmail,
        phone: companyPhone,
        website: companyWebsite,
        status: 'Active',
        subscriptionPlan: 'FREE',
        storageUsageGB: 0,
        settings: defaultCompanySettings(),
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'United Kingdom',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    db.companies.push(companyRecord);
    inviteTokenDirectory.set(`JOIN-${companyId}`, {
        companyId,
        allowedRoles: [Role.ADMIN, Role.PROJECT_MANAGER, Role.FOREMAN, Role.OPERATIVE],
        suggestedRole: Role.ADMIN,
    });
    return { companyId, companyRecord, userRole: Role.OWNER };
};
const joinExistingCompany = (credentials) => {
    const normalizedToken = credentials.inviteToken ? normalizeInviteToken(credentials.inviteToken) : '';
    if (!normalizedToken) {
        throw new Error('An invite token is required to join an existing company.');
    }
    const inviteDetails = inviteTokenDirectory.get(normalizedToken);
    if (!inviteDetails) {
        throw new Error('Invalid invite token.');
    }
    const companyId = inviteDetails.companyId;
    const companyRecord = db.companies.find(c => c.id === companyId);
    if (!companyRecord) {
        throw new Error('Company not found for invite token.');
    }
    if (credentials.role && !inviteDetails.allowedRoles.includes(credentials.role)) {
        throw new Error('Selected role is not permitted for this invite.');
    }
    const userRole = credentials.role && inviteDetails.allowedRoles.includes(credentials.role)
        ? credentials.role
        : inviteDetails.suggestedRole || inviteDetails.allowedRoles[0];
    return { companyId, companyRecord, userRole };
};
const validatePassword = (password) => {
    const trimmedPassword = password.trim();
    const passwordRequirements = [
        trimmedPassword.length >= 8,
        /[A-Z]/.test(trimmedPassword),
        /[a-z]/.test(trimmedPassword),
        /\d/.test(trimmedPassword),
        /[^A-Za-z0-9]/.test(trimmedPassword),
    ];
    if (!passwordRequirements.every(Boolean)) {
        throw new Error('Password does not meet the minimum complexity requirements.');
    }
    return trimmedPassword;
};
export const authApi = {
    register: async (credentials) => {
        await delay();
        const normalizedEmail = validateBasicCredentials(credentials);
        const password = validatePassword(credentials.password);
        const firstName = credentials.firstName?.trim();
        const lastName = credentials.lastName?.trim();
        const phone = credentials.phone?.trim();
        // Handle company creation or joining
        let result;
        if (credentials.companySelection === 'create') {
            result = createNewCompany(credentials);
        }
        else if (credentials.companySelection === 'join') {
            result = joinExistingCompany(credentials);
        }
        else {
            throw new Error('Invalid company selection.');
        }
        const { companyId, companyRecord, userRole } = result;
        const passwordRecord = await createPasswordRecord(password);
        const createdAt = new Date().toISOString();
        const newUser = {
            id: String(Date.now() + Math.random()),
            firstName,
            lastName,
            email: normalizedEmail,
            passwordHash: passwordRecord.hash,
            passwordSalt: passwordRecord.salt,
            phone,
            role: userRole,
            permissions: Array.from(RolePermissions[userRole]),
            companyId,
            isActive: true,
            isEmailVerified: true,
            mfaEnabled: false,
            createdAt,
            updatedAt: createdAt,
            preferences: defaultUserPreferences(),
        };
        if (credentials.updatesOptIn === false) {
            newUser.preferences.notifications.projectUpdates = false;
        }
        db.users.push(newUser);
        const resolvedCompany = companyRecord || db.companies.find(c => c.id === companyId);
        if (resolvedCompany?.name) {
            addAuditLog(newUser.id, 'USER_REGISTERED', { type: 'Company', id: companyId, name: resolvedCompany.name });
            if (credentials.companySelection === 'create') {
                addAuditLog(newUser.id, 'COMPANY_CREATED', { type: 'Company', id: companyId, name: resolvedCompany.name });
            }
        }
        saveDb();
        const user = db.users.find(u => u.id === newUser.id);
        const company = db.companies.find(c => c.id === companyId);
        const token = createToken({ userId: user.id, companyId: company.id, role: user.role }, MOCK_ACCESS_TOKEN_LIFESPAN);
        const refreshToken = createToken({ userId: user.id }, MOCK_REFRESH_TOKEN_LIFESPAN);
        return { success: true, token, refreshToken, user: sanitizeUserForReturn(user), company };
    },
    checkEmailAvailability: async (email) => {
        await delay(120);
        if (!email) {
            return { available: false };
        }
        const normalized = normalizeEmail(email);
        return { available: !findUserByEmail(normalized) };
    },
    lookupInviteToken: async (token) => {
        await delay(200);
        if (!token) {
            throw new Error('An invite token is required.');
        }
        const normalizedToken = normalizeInviteToken(token);
        const details = inviteTokenDirectory.get(normalizedToken);
        if (!details) {
            throw new Error('Invite token not recognized.');
        }
        const company = db.companies.find(c => c.id === details.companyId);
        if (!company) {
            throw new Error('Company not found for invite token.');
        }
        return {
            companyId: company.id,
            companyName: company.name || 'Unnamed Company',
            companyType: company.type,
            allowedRoles: details.allowedRoles,
            suggestedRole: details.suggestedRole,
        };
    },
    login: async (credentials) => {
        await delay(200);
        const normalizedEmail = normalizeEmail(credentials.email);
        const user = findUserByEmail(normalizedEmail);
        if (!user) {
            throw new Error("Invalid email or password.");
        }
        const needsUpgrade = !!user.password && (!user.passwordHash || !user.passwordSalt);
        if (needsUpgrade) {
            await upgradeLegacyPassword(user);
            saveDb();
        }
        if (!user.passwordHash || !user.passwordSalt) {
            throw new Error("Invalid email or password.");
        }
        const isValid = await verifyPassword(credentials.password, user.passwordHash, user.passwordSalt);
        if (!isValid) {
            throw new Error("Invalid email or password.");
        }
        if (user.mfaEnabled) {
            return { success: true, mfaRequired: true, userId: user.id };
        }
        return authApi.finalizeLogin(user.id);
    },
    verifyMfa: async (userId, code) => {
        await delay(200);
        if (code !== '123456') {
            throw new Error("Invalid MFA code.");
        }
        return authApi.finalizeLogin(userId);
    },
    finalizeLogin: async (userId) => {
        await delay();
        const user = db.users.find(u => u.id === userId);
        if (!user)
            throw new Error("User not found during finalization.");
        const company = db.companies.find(c => c.id === user.companyId);
        if (!company)
            throw new Error("Company not found for user.");
        const token = createToken({ userId: user.id, companyId: company.id, role: user.role }, MOCK_ACCESS_TOKEN_LIFESPAN);
        const refreshToken = createToken({ userId: user.id }, MOCK_REFRESH_TOKEN_LIFESPAN);
        return { success: true, token, refreshToken, user: sanitizeUserForReturn(user), company };
    },
    refreshToken: async (refreshToken) => {
        await delay();
        const decoded = decodeToken(refreshToken);
        if (!decoded)
            throw new Error("Invalid refresh token");
        const user = db.users.find(u => u.id === decoded.userId);
        if (!user)
            throw new Error("User not found for refresh token");
        const token = createToken({ userId: user.id, companyId: user.companyId, role: user.role }, MOCK_ACCESS_TOKEN_LIFESPAN);
        return { token };
    },
    /**
     * Gets user and company info from a token.
     * This function validates the token, including its expiration.
     * The client (`AuthContext`) is responsible for catching an expiry error and using the refresh token.
     */
    me: async (token) => {
        await delay();
        const decoded = decodeToken(token);
        if (!decoded)
            throw new Error("Invalid or expired token");
        const user = db.users.find(u => u.id === decoded.userId);
        const company = db.companies.find(c => c.id === decoded.companyId);
        if (!user || !company)
            throw new Error("User or company not found");
        return { user: sanitizeUserForReturn(user), company };
    },
    requestPasswordReset: async (email) => {
        await delay(300);
        const user = email ? findUserByEmail(email) : undefined;
        if (user) {
            const token = `reset-${Date.now()}-${Math.random()}`;
            passwordResetTokens.set(token, { userId: user.id, expires: Date.now() + MOCK_RESET_TOKEN_LIFESPAN });
            console.log(`Password reset for ${email}. Token: ${token}`); // Simulate sending email
        }
        // Always return success to prevent user enumeration attacks
        return { success: true };
    },
    resetPassword: async (token, newPassword) => {
        await delay(300);
        const tokenData = passwordResetTokens.get(token);
        if (!tokenData || tokenData.expires < Date.now()) {
            throw new Error("Invalid or expired password reset token.");
        }
        const userIndex = db.users.findIndex(u => u.id === tokenData.userId);
        if (userIndex === -1) {
            throw new Error("User not found.");
        }
        const passwordRecord = await createPasswordRecord(newPassword);
        db.users[userIndex].passwordHash = passwordRecord.hash;
        db.users[userIndex].passwordSalt = passwordRecord.salt;
        delete db.users[userIndex].password;
        saveDb();
        passwordResetTokens.delete(token);
        return { success: true };
    },
};
let offlineQueue = readJson('asagents_offline_queue', []);
let failedSyncActions = readJson('asagents_failed_sync_actions', []);
const saveQueues = () => {
    writeJson('asagents_offline_queue', offlineQueue);
    writeJson('asagents_failed_sync_actions', failedSyncActions);
};
const addToOfflineQueue = (type, payload) => {
    offlineQueue.push({ id: Date.now(), type, payload, retries: 0 });
    saveQueues();
};
export const processOfflineQueue = async () => {
    if (offlineQueue.length === 0)
        return { successCount: 0, movedToFailedCount: 0 };
    let successCount = 0;
    let movedToFailedCount = 0;
    const processingQueue = [...offlineQueue];
    offlineQueue = [];
    for (const action of processingQueue) {
        try {
            await delay(100);
            console.log(`Successfully synced action: ${action.type}`, action.payload);
            successCount++;
        }
        catch (error) {
            action.retries++;
            action.error = error instanceof Error ? error.message : "Unknown sync error";
            if (action.retries >= 3) {
                failedSyncActions.push(action);
                movedToFailedCount++;
            }
            else {
                offlineQueue.push(action);
            }
        }
    }
    saveQueues();
    return { successCount, movedToFailedCount };
};
export const getFailedSyncActions = () => [...failedSyncActions];
export const retryFailedAction = async (id) => {
    const actionIndex = failedSyncActions.findIndex(a => a.id === id);
    if (actionIndex > -1) {
        const [action] = failedSyncActions.splice(actionIndex, 1);
        action.retries = 0;
        offlineQueue.push(action);
        saveQueues();
        await processOfflineQueue();
    }
};
export const discardFailedAction = (id) => {
    failedSyncActions = failedSyncActions.filter(a => a.id !== id);
    saveQueues();
};
export const formatFailedActionForUI = (action) => ({
    id: action.id,
    summary: `${action.type.replace(/_/g, ' ')}: ${JSON.stringify(action.payload).substring(0, 100)}...`,
    error: action.error || 'Unknown Error',
    timestamp: new Date(action.id).toLocaleString(),
});
export const resetMockApi = () => {
    Object.keys(DEFAULT_COLLECTIONS).forEach(key => {
        const defaults = clone(DEFAULT_COLLECTIONS[key]);
        writeJson(`${STORAGE_PREFIX}${String(key)}`, defaults);
    });
    db = createDb();
    offlineQueue = [];
    failedSyncActions = [];
    writeJson('asagents_offline_queue', offlineQueue);
    writeJson('asagents_failed_sync_actions', failedSyncActions);
    passwordResetTokens.clear();
    resetInviteTokens();
    upgradeLegacyUsers();
};
export const api = {
    getCompanySettings: async (companyId) => {
        await delay();
        const company = db.companies.find(c => c.id === companyId);
        if (!company) {
            throw new Error('Company not found');
        }
        if (!company.settings) {
            company.settings = defaultCompanySettings();
            saveDb();
        }
        return clone(company.settings);
    },
    updateCompanySettings: async (companyId, updates, actorId) => {
        await delay();
        const company = db.companies.find(c => c.id === companyId);
        if (!company) {
            throw new Error('Company not found');
        }
        const currentSettings = company.settings || defaultCompanySettings();
        const merged = mergeCompanySettings(currentSettings, updates);
        company.settings = clone(merged);
        company.updatedAt = new Date().toISOString();
        saveDb();
        if (actorId && company.name) {
            addAuditLog(actorId, 'COMPANY_SETTINGS_UPDATED', {
                type: 'Company',
                id: companyId,
                name: company.name,
            });
        }
        return clone(merged);
    },
    getTimesheetsByCompany: async (companyId, userId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.timeEntries.map(te => ({ ...te, clockIn: new Date(te.clockIn), clockOut: te.clockOut ? new Date(te.clockOut) : null }));
    },
    getSafetyIncidentsByCompany: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.safetyIncidents.filter(incident => resolveCompanyIdFromProject(incident.projectId) === companyId);
    },
    getConversationsForUser: async (userId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.conversations.filter(c => c.participantIds?.includes(userId));
    },
    getNotificationsForUser: async (userId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.notifications.filter(n => n.userId === userId).map(n => ({ ...n, timestamp: new Date(n.timestamp) }));
    },
    markAllNotificationsAsRead: async (userId) => {
        await delay();
        db.notifications.forEach(n => {
            if (n.userId === userId) {
                n.isRead = true;
                n.read = true;
            }
        });
        saveDb();
    },
    markNotificationAsRead: async (notificationId) => {
        await delay();
        const notification = db.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.isRead = true;
            notification.read = true;
            saveDb();
        }
    },
    getProjectsByManager: async (managerId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.projects.filter(p => ('managerId' in p) && p.managerId === managerId);
    },
    getUsersByCompany: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.users.filter(u => u.companyId === companyId);
    },
    getProjectById: async (projectId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        const project = db.projects.find(p => p.id === projectId);
        return project ? project : null;
    },
    getEquipmentByCompany: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.equipment.filter(e => e.companyId === companyId);
    },
    getResourceAssignments: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.resourceAssignments;
    },
    getAuditLogsByCompany: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.auditLogs;
    },
    getTodosByProjectIds: async (projectIds, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        const idSet = new Set(projectIds);
        return db.todos.filter(t => idSet.has(t.projectId));
    },
    getDocumentsByProject: async (projectId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.documents.filter(d => d.projectId === projectId);
    },
    getUsersByProject: async (projectId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        const assignments = db.projectAssignments.filter(pa => pa.projectId === projectId);
        const userIds = new Set(assignments.map(a => a.userId));
        return sanitizeUsersForReturn(db.users.filter(u => userIds.has(u.id)));
    },
    getProjectInsights: async (projectId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.projectInsights
            .filter(insight => insight.projectId === projectId)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .map(insight => ({
            id: insight.id,
            projectId: insight.projectId,
            summary: insight.summary || '',
            type: insight.type || 'CUSTOM',
            createdAt: insight.createdAt || new Date().toISOString(),
            createdBy: insight.createdBy || 'system',
            model: insight.model,
            metadata: insight.metadata,
        }));
    },
    createProjectInsight: async (data, userId) => {
        await delay();
        if (!data.projectId) {
            throw new Error('projectId is required to create an insight.');
        }
        if (!data.summary.trim()) {
            throw new Error('summary is required to create an insight.');
        }
        const newInsight = {
            id: String(Date.now() + Math.random()),
            projectId: data.projectId,
            summary: data.summary,
            type: data.type || 'CUSTOM',
            createdAt: new Date().toISOString(),
            createdBy: userId,
            model: data.model,
            metadata: data.metadata,
        };
        db.projectInsights.push(newInsight);
        const project = db.projects.find(p => p.id === data.projectId);
        addAuditLog(userId, 'generated_project_insight', project ? { type: 'project', id: project.id, name: project.name || '' } : undefined);
        saveDb();
        return newInsight;
    },
    getFinancialForecasts: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        return db.financialForecasts
            .filter(forecast => forecast.companyId === companyId)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .map(forecast => ({
            id: forecast.id,
            companyId: forecast.companyId,
            summary: forecast.summary || '',
            horizonMonths: typeof forecast.horizonMonths === 'number'
                ? forecast.horizonMonths
                : Number(forecast.metadata?.horizonMonths) || 3,
            createdAt: forecast.createdAt || new Date().toISOString(),
            createdBy: forecast.createdBy || 'system',
            model: forecast.model,
            metadata: forecast.metadata,
        }));
    },
    createFinancialForecast: async (data, userId) => {
        await delay();
        if (!data.companyId) {
            throw new Error('companyId is required to create a financial forecast.');
        }
        if (!data.summary.trim()) {
            throw new Error('summary is required to create a financial forecast.');
        }
        const newForecast = {
            id: String(Date.now() + Math.random()),
            companyId: data.companyId,
            summary: data.summary,
            horizonMonths: data.horizonMonths,
            createdAt: new Date().toISOString(),
            createdBy: userId,
            model: data.model,
            metadata: data.metadata,
        };
        db.financialForecasts.push(newForecast);
        const company = db.companies.find(c => c.id === data.companyId);
        addAuditLog(userId, 'generated_financial_forecast', company ? { type: 'company', id: company.id, name: company.name || '' } : undefined);
        saveDb();
        return newForecast;
    },
    getExpensesByCompany: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        const projectIds = new Set(db.projects.filter(p => p.companyId === companyId).map(p => p.id));
        return db.expenses.filter(e => projectIds.has(e.projectId));
    },
    updateTodo: async (todoId, updates, userId) => {
        await delay();
        const todoIndex = db.todos.findIndex(t => t.id === todoId);
        if (todoIndex === -1)
            throw new Error("Todo not found");
        db.todos[todoIndex] = { ...db.todos[todoIndex], ...updates, updatedAt: new Date().toISOString() };
        saveDb();
        return db.todos[todoIndex];
    },
    getProjectsByUser: async (userId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        const assignments = db.projectAssignments.filter(pa => pa.userId === userId);
        const projectIds = new Set(assignments.map(a => a.projectId));
        return db.projects.filter(p => projectIds.has(p.id));
    },
    updateEquipment: async (equipmentId, updates, userId) => {
        await delay();
        const index = db.equipment.findIndex(e => e.id === equipmentId);
        if (index === -1)
            throw new Error("Equipment not found");
        db.equipment[index] = { ...db.equipment[index], ...updates };
        saveDb();
        return db.equipment[index];
    },
    createEquipment: async (data, userId) => {
        await delay();
        const newEquipment = { ...data, id: String(Date.now()), companyId: db.users.find(u => u.id === userId)?.companyId };
        db.equipment.push(newEquipment);
        saveDb();
        return newEquipment;
    },
    createResourceAssignment: async (data, userId) => {
        const newAssignment = { ...data, id: String(Date.now()) };
        db.resourceAssignments.push(newAssignment);
        saveDb();
        return newAssignment;
    },
    updateResourceAssignment: async (id, data, userId) => {
        const index = db.resourceAssignments.findIndex(a => a.id === id);
        db.resourceAssignments[index] = { ...db.resourceAssignments[index], ...data };
        saveDb();
        return db.resourceAssignments[index];
    },
    deleteResourceAssignment: async (id, userId) => {
        db.resourceAssignments = db.resourceAssignments.filter(a => a.id !== id);
        saveDb();
    },
    uploadDocument: async (data, userId) => {
        const newDoc = { ...data, id: String(Date.now()), uploadedBy: userId, version: 1, uploadedAt: new Date().toISOString() };
        db.documents.push(newDoc);
        saveDb();
        return newDoc;
    },
    getDocumentsByCompany: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        return db.documents;
    },
    getProjectsByCompany: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        return db.projects.filter(p => p.companyId === companyId);
    },
    getProjectPortfolioSummary: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        const scopedIds = options?.projectIds?.map(String);
        const idFilter = scopedIds && scopedIds.length > 0 ? new Set(scopedIds) : null;
        const scopedProjects = db.projects.filter(project => {
            if (project.companyId !== companyId) {
                return false;
            }
            if (idFilter) {
                return project.id != null && idFilter.has(String(project.id));
            }
            return true;
        });
        return computeProjectPortfolioSummary(scopedProjects);
    },
    findGrants: async (keywords, location) => {
        await delay(1000);
        return [{ id: 'g1', name: 'Green Retrofit Grant', agency: 'Gov UK', amount: '£50,000', description: 'For sustainable energy retrofits.', url: '#' }];
    },
    analyzeForRisks: async (text) => {
        await delay(1000);
        return { summary: 'Low risk detected.', identifiedRisks: [{ severity: 'Low', description: 'Ambiguous payment terms.', recommendation: 'Clarify payment schedule before signing.' }] };
    },
    generateBidPackage: async (url, strengths, userId) => {
        await delay(1500);
        return { summary: 'Executive summary...', coverLetter: 'Dear Sir/Madam...', checklist: ['Form A', 'Form B'] };
    },
    generateSafetyAnalysis: async (incidents, projectId, userId) => {
        await delay(1500);
        return { report: `Analysis for project #${projectId}:\n- Common issue: Slips on wet surfaces (${incidents.length} incidents).\n- Recommendation: Increase signage and regular clean-up patrols.` };
    },
    getCompanies: async (options) => {
        ensureNotAborted(options?.signal);
        return db.companies;
    },
    getPlatformUsageMetrics: async (options) => {
        ensureNotAborted(options?.signal);
        return [
            { name: 'Active Users (24h)', value: db.users.length - 2, unit: 'users' },
            { name: 'API Calls (24h)', value: 12543, unit: 'calls' },
        ];
    },
    updateTimesheetEntry: async (id, data, userId) => {
        const index = db.timeEntries.findIndex(t => t.id === id);
        db.timeEntries[index] = { ...db.timeEntries[index], ...data };
        saveDb();
        return db.timeEntries[index];
    },
    submitTimesheet: async (data, userId) => {
        const newTimesheet = { ...data, id: String(Date.now()), status: TimesheetStatus.PENDING };
        db.timeEntries.push(newTimesheet);
        saveDb();
        return newTimesheet;
    },
    updateTimesheetStatus: async (id, status, userId, reason) => {
        const index = db.timeEntries.findIndex(t => t.id === id);
        db.timeEntries[index].status = status;
        if (reason)
            db.timeEntries[index].rejectionReason = reason;
        saveDb();
        return db.timeEntries[index];
    },
    generateDailySummary: async (projectId, date, userId) => {
        await delay(1000);
        return `Summary for ${date.toDateString()}:\n- Task A completed.\n- Task B in progress.`;
    },
    getFinancialKPIsForCompany: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        const currency = getCompanyCurrency(companyId);
        const invoices = db.invoices.filter(invoice => resolveCompanyIdForInvoice(invoice) === companyId);
        const invoiceTotals = invoices.reduce((acc, invoice) => {
            const total = safeNumber(invoice.total ?? invoice.amount ?? 0);
            const amountPaid = safeNumber(invoice.amountPaid ?? 0);
            const explicitBalance = invoice.balance;
            const balance = explicitBalance != null ? safeNumber(explicitBalance) : Math.max(total - amountPaid, 0);
            acc.pipeline += total;
            acc.collected += amountPaid > 0 ? Math.min(total, amountPaid) : total - balance;
            acc.outstanding += balance;
            return acc;
        }, { pipeline: 0, collected: 0, outstanding: 0 });
        const approvedExpenseStatuses = new Set([ExpenseStatus.APPROVED, ExpenseStatus.PAID]);
        const expenses = db.expenses.filter(expense => {
            if (resolveCompanyIdForExpense(expense) !== companyId) {
                return false;
            }
            if (!expense.status) {
                return false;
            }
            const status = String(expense.status);
            return approvedExpenseStatuses.has(status);
        });
        const expenseTotal = expenses.reduce((sum, expense) => sum + safeNumber(expense.amount), 0);
        const profitabilityRaw = invoiceTotals.collected > 0
            ? ((invoiceTotals.collected - expenseTotal) / invoiceTotals.collected) * 100
            : 0;
        const profitability = Math.round(Math.max(-100, Math.min(100, profitabilityRaw)) * 10) / 10;
        const companyProjects = db.projects.filter(project => project.companyId === companyId);
        const marginValues = companyProjects
            .map(project => {
            const budget = safeNumber(project.budget);
            if (budget <= 0) {
                return null;
            }
            const actual = safeNumber(project.actualCost ?? project.spent ?? 0);
            const margin = ((budget - actual) / budget) * 100;
            return Math.max(-100, Math.min(100, margin));
        })
            .filter((value) => value !== null);
        const projectMargin = marginValues.length
            ? Math.round((marginValues.reduce((sum, value) => sum + value, 0) / marginValues.length) * 10) / 10
            : 0;
        const cashFlow = Math.round((invoiceTotals.collected - expenseTotal) * 100) / 100;
        return {
            profitability,
            projectMargin,
            cashFlow,
            currency,
        };
    },
    getMonthlyFinancials: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        const monthlyMap = new Map();
        const registerMonth = (date) => {
            const key = getMonthKey(date);
            if (!monthlyMap.has(key)) {
                const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                monthlyMap.set(key, {
                    label: getMonthLabel(date),
                    date: monthStart,
                    revenue: 0,
                    expense: 0,
                });
            }
            return monthlyMap.get(key) || { month: key.split('-')[1], year: parseInt(key.split('-')[0]), revenue: 0, expenses: 0, profit: 0 };
        };
        for (const invoice of db.invoices) {
            if (resolveCompanyIdForInvoice(invoice) !== companyId) {
                continue;
            }
            const issuedDate = parseDate(invoice.issueDate ?? invoice.issuedAt ?? invoice.createdAt);
            if (!issuedDate) {
                continue;
            }
            const monthBucket = registerMonth(issuedDate);
            monthBucket.revenue += safeNumber(invoice.total ?? invoice.amount ?? 0);
        }
        const approvedExpenseStatuses = new Set([ExpenseStatus.APPROVED, ExpenseStatus.PAID]);
        for (const expense of db.expenses) {
            if (resolveCompanyIdForExpense(expense) !== companyId) {
                continue;
            }
            if (!expense.status || !approvedExpenseStatuses.has(String(expense.status))) {
                continue;
            }
            const expenseDate = parseDate(expense.date ?? expense.createdAt ?? expense.submittedAt);
            if (!expenseDate) {
                continue;
            }
            const monthBucket = registerMonth(expenseDate);
            monthBucket.expense += safeNumber(expense.amount);
        }
        return Array.from(monthlyMap.values())
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(entry => ({
            month: entry.label,
            revenue: Math.round(entry.revenue * 100) / 100,
            profit: Math.round((entry.revenue - entry.expense) * 100) / 100,
        }));
    },
    getCostBreakdown: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        const approvedExpenseStatuses = new Set([ExpenseStatus.APPROVED, ExpenseStatus.PAID]);
        const totals = new Map();
        for (const expense of db.expenses) {
            if (resolveCompanyIdForExpense(expense) !== companyId) {
                continue;
            }
            if (!expense.status || !approvedExpenseStatuses.has(String(expense.status))) {
                continue;
            }
            const category = (expense.category ?? 'Uncategorised').toString();
            const amount = safeNumber(expense.amount);
            if (amount <= 0) {
                continue;
            }
            totals.set(category, (totals.get(category) ?? 0) + amount);
        }
        return Array.from(totals.entries())
            .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
            .sort((a, b) => b.amount - a.amount);
    },
    getOperationalInsights: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        await delay();
        ensureNotAborted(options?.signal);
        // Use the date helper function
        const dateRanges = getDateRanges();
        const { isoNow } = dateRanges;
        const companyCurrency = getCompanyCurrency(companyId);
        // Get relevant data for the company
        const { projects, projectIds, userIds } = getRelevantCompanyData(companyId);
        // Get relevant records
        const relevantTodos = getCompanyTodos(projectIds, userIds);
        const relevantTimesheets = getCompanyTimesheets(companyId);
        const safetyIncidents = db.safetyIncidents.filter(incident => resolveCompanyIdFromProject(incident.projectId) === companyId);
        const invoices = db.invoices.filter(invoice => resolveCompanyIdForInvoice(invoice) === companyId);
        const expenses = db.expenses.filter(expense => resolveCompanyIdForExpense(expense) === companyId);
        // Calculate metrics using helper functions
        const timesheetMetrics = getTimesheetMetrics(relevantTimesheets, dateRanges);
        const taskMetrics = getTaskMetrics(relevantTodos, dateRanges);
        const safetyMetrics = getSafetyMetrics(safetyIncidents, dateRanges);
        const financialMetrics = getFinancialMetrics(expenses, invoices, dateRanges);
        // Calculate project metrics
        const portfolioSummary = computeProjectPortfolioSummary(projects);
        const activeProjects = portfolioSummary.activeProjects > 0
            ? portfolioSummary.activeProjects
            : projects.filter(project => normalizeStringValue(project.status) === 'ACTIVE').length;
        const atRiskActiveProjects = projects.reduce((count, project) => {
            const status = normalizeStringValue(project.status);
            if (status === 'COMPLETED' || status === 'CANCELLED') {
                return count;
            }
            const budget = safeNumber(project.budget);
            if (budget <= 0) {
                return count;
            }
            const actual = safeNumber(project.actualCost ?? project.spent ?? 0);
            return actual > budget * 1.05 ? count + 1 : count;
        }, 0);
        // Calculate burn rate
        const burnRatePerActiveProject = activeProjects > 0
            ? financialMetrics.approvedExpensesThisMonth / activeProjects
            : financialMetrics.approvedExpensesThisMonth;
        // Generate alerts
        const alerts = [];
        const formatCurrencyForAlert = (value) => new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: companyCurrency,
            maximumFractionDigits: 0,
        }).format(Math.round(value));
        if (timesheetMetrics.submittedTimesheets.length > 0 && timesheetMetrics.complianceRate < 85) {
            alerts.push({
                id: 'low-timesheet-compliance',
                severity: timesheetMetrics.complianceRate < 60 ? 'critical' : 'warning',
                message: `Timesheet approvals are at ${Math.round(timesheetMetrics.complianceRate)}%. Clear pending entries to restore compliance.`,
            });
        }
        if (safetyMetrics.highSeverity > 0) {
            alerts.push({
                id: 'high-severity-incidents',
                severity: 'critical',
                message: `${safetyMetrics.highSeverity} high-severity incident${safetyMetrics.highSeverity === 1 ? ' requires' : 's require'} immediate action.`,
            });
        }
        if (taskMetrics.overdueTasks > 0) {
            alerts.push({
                id: 'overdue-field-tasks',
                severity: 'warning',
                message: `${taskMetrics.overdueTasks} task${taskMetrics.overdueTasks === 1 ? ' is' : 's are'} past due. Rebalance crew priorities.`,
            });
        }
        if (financialMetrics.outstandingReceivables > 0) {
            alerts.push({
                id: 'outstanding-receivables',
                severity: financialMetrics.outstandingReceivables > 100000 ? 'warning' : 'info',
                message: `${formatCurrencyForAlert(financialMetrics.outstandingReceivables)} outstanding in receivables.`,
            });
        }
        // Return structured insights
        return {
            updatedAt: isoNow,
            safety: {
                openIncidents: safetyMetrics.openIncidents.length,
                highSeverity: safetyMetrics.highSeverity,
                daysSinceLastIncident: safetyMetrics.daysSinceLastIncident,
            },
            workforce: {
                complianceRate: Math.round(timesheetMetrics.complianceRate * 10) / 10,
                approvedThisWeek: timesheetMetrics.approvedThisWeek,
                overtimeHours: Math.round(timesheetMetrics.overtimeHours * 10) / 10,
                averageHours: Math.round(timesheetMetrics.averageHours * 10) / 10,
                activeTimesheets: timesheetMetrics.activeTimesheets,
                pendingApprovals: timesheetMetrics.pendingApprovals,
            },
            schedule: {
                atRiskProjects: atRiskActiveProjects,
                overdueProjects: portfolioSummary.overdueProjects,
                tasksDueSoon: taskMetrics.tasksDueSoon,
                overdueTasks: taskMetrics.overdueTasks,
                tasksInProgress: taskMetrics.tasksInProgress,
                averageProgress: Math.round(portfolioSummary.averageProgress * 10) / 10,
            },
            financial: {
                currency: companyCurrency,
                approvedExpensesThisMonth: Math.round(financialMetrics.approvedExpensesThisMonth * 100) / 100,
                burnRatePerActiveProject: Math.round(burnRatePerActiveProject * 100) / 100,
                outstandingReceivables: Math.round(financialMetrics.outstandingReceivables * 100) / 100,
            },
            alerts,
        };
    },
    getInvoicesByCompany: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        return db.invoices;
    },
    getQuotesByCompany: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        return db.quotes;
    },
    getClientsByCompany: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        return db.clients
            .filter(client => client.companyId === companyId)
            .map(client => ({
            ...client,
            isActive: client.isActive ?? true,
        }));
    },
    updateClient: async (id, data, userId) => {
        const index = db.clients.findIndex(c => c.id === id);
        if (index === -1) {
            throw new Error('Client not found');
        }
        db.clients[index] = {
            ...db.clients[index],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        saveDb();
        return db.clients[index];
    },
    createClient: async (data, userId) => {
        const timestamp = new Date().toISOString();
        const user = db.users.find(u => u.id === userId);
        if (!user)
            throw new Error('User not found');
        const companyId = user.companyId;
        const newClient = {
            isActive: true,
            createdAt: timestamp,
            updatedAt: timestamp,
            contactPerson: data.contactPerson || '',
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone || data.phone,
            paymentTerms: data.paymentTerms || 'Net 30',
            billingAddress: data.billingAddress || '',
            address: data.address || { street: '', city: '', state: '', zipCode: '', country: '' },
            ...data,
            id: String(Date.now()),
            companyId,
        };
        db.clients.push(newClient);
        saveDb();
        return newClient;
    },
    updateInvoice: async (id, data, userId) => {
        await delay();
        const index = db.invoices.findIndex(i => i.id === id);
        if (index === -1)
            throw new Error("Invoice not found");
        const existingInvoice = db.invoices[index];
        const companyId = existingInvoice.companyId ?? db.users.find(u => u.id === userId)?.companyId;
        const updatedInvoiceNumber = (data.invoiceNumber ?? existingInvoice.invoiceNumber);
        if (!updatedInvoiceNumber) {
            throw new Error("Invoice number is required.");
        }
        const hasDuplicateNumber = db.invoices.some((invoice, invoiceIndex) => {
            if (invoiceIndex === index)
                return false;
            if (!invoice.invoiceNumber)
                return false;
            return invoice.invoiceNumber === updatedInvoiceNumber;
        });
        if (hasDuplicateNumber) {
            throw new Error("Invoice number already exists.");
        }
        const oldStatus = existingInvoice?.status;
        db.invoices[index] = {
            ...existingInvoice,
            ...data,
            companyId: existingInvoice.companyId ?? companyId,
            invoiceNumber: updatedInvoiceNumber,
        };
        if (oldStatus !== data.status) {
            addAuditLog(userId, `UPDATE_INVOICE_STATUS: ${oldStatus} -> ${data.status}`, { type: 'Invoice', id: id, name: updatedInvoiceNumber });
        }
        else {
            addAuditLog(userId, 'UPDATE_INVOICE', { type: 'Invoice', id: id, name: updatedInvoiceNumber });
        }
        saveDb();
        return db.invoices[index];
    },
    createInvoice: async (data, userId) => {
        await delay();
        const companyId = db.users.find(u => u.id === userId)?.companyId;
        if (!companyId) {
            throw new Error("Unable to determine company for invoice creation.");
        }
        const companyInvoices = db.invoices.filter(inv => {
            if (!inv.companyId)
                return true;
            return inv.companyId === companyId;
        });
        const extractNumber = (invoiceNumber) => {
            if (!invoiceNumber)
                return 0;
            const regex = /(\d+)$/;
            const match = regex.exec(invoiceNumber);
            return match ? parseInt(match[1], 10) : 0;
        };
        const existingNumbers = new Set(companyInvoices
            .map(inv => inv.invoiceNumber)
            .filter((value) => Boolean(value)));
        let counter = companyInvoices.reduce((max, inv) => {
            const numeric = extractNumber(inv.invoiceNumber);
            return Math.max(max, numeric);
        }, 0);
        let invoiceNumber;
        do {
            counter += 1;
            invoiceNumber = `INV-${String(counter).padStart(3, '0')}`;
        } while (existingNumbers.has(invoiceNumber));
        if (!invoiceNumber) {
            throw new Error("Failed to generate invoice number.");
        }
        const newInvoice = {
            ...data,
            id: String(Date.now()),
            companyId,
            invoiceNumber,
        };
        db.invoices.push(newInvoice);
        addAuditLog(userId, 'CREATE_INVOICE', { type: 'Invoice', id: newInvoice.id, name: newInvoice.invoiceNumber });
        saveDb();
        return newInvoice;
    },
    recordPaymentForInvoice: async (id, data, userId) => {
        await delay();
        const index = db.invoices.findIndex(i => i.id === id);
        if (index === -1)
            throw new Error("Invoice not found");
        const inv = db.invoices[index];
        if (!inv)
            throw new Error('Invoice not found');
        if (!inv.payments)
            inv.payments = [];
        const newPayment = { ...data, id: String(Date.now()), createdBy: userId, date: new Date().toISOString(), invoiceId: id };
        inv.payments.push(newPayment);
        inv.amountPaid = (inv.amountPaid || 0) + data.amount;
        const balance = (inv.total || 0) - (inv.amountPaid || 0);
        inv.balance = balance;
        if (balance <= 0 && inv.status !== InvoiceStatus.CANCELLED) {
            inv.status = InvoiceStatus.PAID;
            addAuditLog(userId, `RECORD_PAYMENT (amount: ${data.amount})`, { type: 'Invoice', id: id, name: inv.invoiceNumber });
            addAuditLog(userId, `UPDATE_INVOICE_STATUS: ${InvoiceStatus.SENT} -> ${InvoiceStatus.PAID}`, { type: 'Invoice', id: id, name: inv.invoiceNumber });
        }
        else {
            addAuditLog(userId, `RECORD_PAYMENT (amount: ${data.amount})`, { type: 'Invoice', id: id, name: inv.invoiceNumber });
        }
        saveDb();
        return inv;
    },
    submitExpense: async (data, userId) => {
        const newExpense = { ...data, id: String(Date.now()), userId, status: ExpenseStatus.PENDING, submittedAt: new Date().toISOString() };
        db.expenses.push(newExpense);
        saveDb();
        return newExpense;
    },
    updateExpense: async (id, data, userId) => {
        const index = db.expenses.findIndex(e => e.id === id);
        db.expenses[index] = { ...db.expenses[index], ...data, status: ExpenseStatus.PENDING };
        saveDb();
        return db.expenses[index];
    },
    clockIn: async (projectId, userId) => {
        const newEntry = { id: String(Date.now()), userId, projectId, clockIn: new Date(), clockOut: null, status: TimesheetStatus.DRAFT };
        db.timeEntries.push(newEntry);
        saveDb();
        return newEntry;
    },
    clockOut: async (userId) => {
        const entry = db.timeEntries.find(t => t.userId === userId && t.clockOut === null);
        if (!entry)
            throw new Error("Not clocked in");
        entry.clockOut = new Date();
        entry.status = TimesheetStatus.PENDING;
        saveDb();
        return entry;
    },
    getTimesheetsByUser: async (userId, options) => {
        ensureNotAborted(options?.signal);
        return db.timeEntries.filter(t => t.userId === userId).map(te => ({ ...te, clockIn: new Date(te.clockIn), clockOut: te.clockOut ? new Date(te.clockOut) : null }));
    },
    createSafetyIncident: async (data, userId) => {
        const newIncident = { ...data, id: String(Date.now()), reportedById: userId, timestamp: new Date().toISOString(), status: IncidentStatus.REPORTED };
        db.safetyIncidents.push(newIncident);
        saveDb();
        return newIncident;
    },
    updateSafetyIncidentStatus: async (id, status, userId) => {
        const index = db.safetyIncidents.findIndex(i => i.id === id);
        if (index === -1)
            throw new Error('Safety incident not found');
        db.safetyIncidents[index].status = status;
        saveDb();
        return db.safetyIncidents[index];
    },
    createProject: async (data, templateId, userId) => {
        const companyId = db.users.find(u => u.id === userId)?.companyId;
        const newProject = { ...data, id: String(Date.now()), companyId, status: 'PLANNING', actualCost: 0 };
        db.projects.push(newProject);
        db.projectAssignments.push({ userId, projectId: newProject.id });
        saveDb();
        return newProject;
    },
    updateProject: async (id, data, userId) => {
        const index = db.projects.findIndex(p => p.id === id);
        db.projects[index] = { ...db.projects[index], ...data };
        saveDb();
        return db.projects[index];
    },
    getProjectTemplates: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        return db.projectTemplates;
    },
    createProjectTemplate: async (data, userId) => {
        const newTemplate = { ...data, id: String(Date.now()) };
        db.projectTemplates.push(newTemplate);
        saveDb();
        return newTemplate;
    },
    getProjectAssignmentsByCompany: async (companyId, options) => {
        ensureNotAborted(options?.signal);
        return db.projectAssignments;
    },
    getUserPerformanceMetrics: async (userId) => {
        return { totalHours: 120, tasksCompleted: 15 };
    },
    createUser: async (data, userId) => {
        const newUser = {
            ...data,
            id: String(Date.now()),
            companyId: db.users.find(u => u.id === userId)?.companyId,
        };
        if (newUser.email) {
            newUser.email = normalizeEmail(newUser.email);
        }
        if (data?.password) {
            const passwordRecord = await createPasswordRecord(data.password);
            newUser.passwordHash = passwordRecord.hash;
            newUser.passwordSalt = passwordRecord.salt;
            delete newUser.password;
        }
        db.users.push(newUser);
        saveDb();
        return sanitizeUserForReturn(newUser);
    },
    updateUser: async (id, data, projectIds, userId) => {
        const index = db.users.findIndex(u => u.id === id);
        if (index === -1)
            throw new Error("User not found");
        const updates = { ...data };
        if (updates.email) {
            updates.email = normalizeEmail(updates.email);
        }
        if (data?.password) {
            const passwordRecord = await createPasswordRecord(data.password);
            updates.passwordHash = passwordRecord.hash;
            updates.passwordSalt = passwordRecord.salt;
            delete updates.password;
        }
        db.users[index] = { ...db.users[index], ...updates };
        delete db.users[index].password;
        // Only update project assignments if the projectIds array is explicitly passed
        // This allows for profile-only updates by omitting the projectIds argument
        if (projectIds !== undefined) {
            db.projectAssignments = db.projectAssignments.filter(pa => pa.userId !== id);
            projectIds.forEach(pid => db.projectAssignments.push({ userId: id, projectId: String(pid) }));
        }
        saveDb();
        return sanitizeUserForReturn(db.users[index]);
    },
    prioritizeTasks: async (tasks, projects, userId) => {
        await delay(1000);
        const sortedTasks = tasks.toSorted((a, b) => (b.priority === TodoPriority.HIGH ? 1 : -1) - (a.priority === TodoPriority.HIGH ? 1 : -1));
        return { prioritizedTaskIds: sortedTasks.map(t => t.id) };
    },
    getMessagesForConversation: async (conversationId, userId, options) => {
        ensureNotAborted(options?.signal);
        return db.messages.filter(m => m.conversationId === conversationId).map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
    },
    sendMessage: async (senderId, recipientId, content, conversationId) => {
        let convo = conversationId ? db.conversations.find(c => c.id === conversationId) : db.conversations.find(c => c.participantIds?.includes(senderId) && c.participantIds?.includes(recipientId));
        if (!convo) {
            convo = { id: String(Date.now()), participantIds: [senderId, recipientId], lastMessage: null };
            db.conversations.push(convo);
        }
        const newMessage = { id: String(Date.now()), conversationId: convo.id, senderId, content, timestamp: new Date(), isRead: false };
        db.messages.push(newMessage);
        convo.lastMessage = newMessage;
        saveDb();
        return { conversation: convo, message: newMessage };
    },
    getWhiteboardNotesByProject: async (projectId, options) => {
        ensureNotAborted(options?.signal);
        return db.whiteboardNotes.filter(n => n.projectId === projectId);
    },
    createWhiteboardNote: async (data, userId) => {
        const newNote = { ...data, id: String(Date.now()) };
        db.whiteboardNotes.push(newNote);
        saveDb();
        return newNote;
    },
    updateWhiteboardNote: async (id, data, userId) => {
        const index = db.whiteboardNotes.findIndex(n => n.id === id);
        db.whiteboardNotes[index] = { ...db.whiteboardNotes[index], ...data };
        saveDb();
        return db.whiteboardNotes[index];
    },
    deleteWhiteboardNote: async (id, userId) => {
        db.whiteboardNotes = db.whiteboardNotes.filter(n => n.id !== id);
        saveDb();
    },
    createTodo: async (data, userId) => {
        const newTodo = { ...data, id: String(Date.now()), status: TodoStatus.TODO, createdAt: new Date().toISOString() };
        db.todos.push(newTodo);
        saveDb();
        return newTodo;
    },
    bulkUpdateTodos: async (ids, updates, userId) => {
        const idSet = new Set(ids.map(String));
        db.todos.forEach(t => {
            if (idSet.has(t.id)) {
                Object.assign(t, updates);
            }
        });
        saveDb();
    },
    getSiteUpdatesByProject: async (projectId, options) => {
        ensureNotAborted(options?.signal);
        return db.siteUpdates.filter(s => s.projectId === projectId);
    },
    getProjectMessages: async (projectId, options) => {
        ensureNotAborted(options?.signal);
        return db.projectMessages.filter(p => p.projectId === projectId);
    },
    getWeatherForLocation: async (lat, lng, options) => {
        ensureNotAborted(options?.signal);
        return { temperature: 18, condition: 'Sunny', windSpeed: 10, icon: '☀️' };
    },
    createSiteUpdate: async (data, userId) => {
        const newUpdate = { ...data, id: String(Date.now()), userId, timestamp: new Date().toISOString() };
        db.siteUpdates.push(newUpdate);
        saveDb();
        return newUpdate;
    },
    sendProjectMessage: async (data, userId) => {
        const newMessage = { ...data, id: String(Date.now()), senderId: userId, timestamp: new Date().toISOString() };
        db.projectMessages.push(newMessage);
        saveDb();
        return newMessage;
    },
    assignUserToProject: async (userId, projectId) => {
        await delay();
        const user = db.users.find(u => u.id === userId);
        if (!user)
            throw new Error("User not found");
        if (projectId) {
            const project = db.projects.find(p => p.id === projectId);
            if (!project)
                throw new Error("Project not found");
            user.currentProjectId = projectId;
        }
        else {
            user.currentProjectId = undefined;
        }
        saveDb();
    },
    unassignUserFromProject: async (userId) => {
        await delay();
        const user = db.users.find(u => u.id === userId);
        if (!user)
            throw new Error("User not found");
        user.currentProjectId = undefined;
        saveDb();
    }
};
//# sourceMappingURL=mockApi.js.map