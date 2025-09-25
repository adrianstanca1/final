// FIX: Renamed UserRole to Role and converted to an enum for use as values.
export var Role;
(function (Role) {
    Role["OWNER"] = "OWNER";
    Role["ADMIN"] = "ADMIN";
    Role["PROJECT_MANAGER"] = "PROJECT_MANAGER";
    Role["FOREMAN"] = "FOREMAN";
    Role["OPERATIVE"] = "OPERATIVE";
    Role["CLIENT"] = "CLIENT";
    // FIX: Added missing roles
    Role["PRINCIPAL_ADMIN"] = "PRINCIPAL_ADMIN";
    // FIX: Removed duplicate PM role. The original PROJECT_MANAGER should be used.
})(Role || (Role = {}));
// FIX: Converted Permission to an enum for use as values in hasPermission checks.
export var Permission;
(function (Permission) {
    Permission["VIEW_ALL_PROJECTS"] = "VIEW_ALL_PROJECTS";
    Permission["VIEW_ASSIGNED_PROJECTS"] = "VIEW_ASSIGNED_PROJECTS";
    Permission["CREATE_PROJECT"] = "CREATE_PROJECT";
    Permission["MANAGE_PROJECT_DETAILS"] = "MANAGE_PROJECT_DETAILS";
    Permission["MANAGE_PROJECT_TEMPLATES"] = "MANAGE_PROJECT_TEMPLATES";
    Permission["VIEW_ALL_TASKS"] = "VIEW_ALL_TASKS";
    Permission["MANAGE_ALL_TASKS"] = "MANAGE_ALL_TASKS";
    Permission["SUBMIT_TIMESHEET"] = "SUBMIT_TIMESHEET";
    Permission["VIEW_ALL_TIMESHEETS"] = "VIEW_ALL_TIMESHEETS";
    Permission["MANAGE_TIMESHEETS"] = "MANAGE_TIMESHEETS";
    Permission["UPLOAD_DOCUMENTS"] = "UPLOAD_DOCUMENTS";
    Permission["VIEW_DOCUMENTS"] = "VIEW_DOCUMENTS";
    Permission["SUBMIT_SAFETY_REPORT"] = "SUBMIT_SAFETY_REPORT";
    Permission["VIEW_SAFETY_REPORTS"] = "VIEW_SAFETY_REPORTS";
    Permission["MANAGE_SAFETY_REPORTS"] = "MANAGE_SAFETY_REPORTS";
    Permission["VIEW_FINANCES"] = "VIEW_FINANCES";
    Permission["MANAGE_FINANCES"] = "MANAGE_FINANCES";
    Permission["VIEW_TEAM"] = "VIEW_TEAM";
    Permission["MANAGE_TEAM"] = "MANAGE_TEAM";
    Permission["MANAGE_EQUIPMENT"] = "MANAGE_EQUIPMENT";
    Permission["VIEW_AUDIT_LOG"] = "VIEW_AUDIT_LOG";
    Permission["SEND_DIRECT_MESSAGE"] = "SEND_DIRECT_MESSAGE";
    Permission["ACCESS_ALL_TOOLS"] = "ACCESS_ALL_TOOLS";
    Permission["SUBMIT_EXPENSE"] = "SUBMIT_EXPENSE";
    // Added missing permission values used in the codebase
    Permission["EDIT_USER"] = "EDIT_USER";
    Permission["MANAGE_USERS"] = "MANAGE_USERS";
    Permission["VIEW_PROJECT"] = "VIEW_PROJECT";
    Permission["EDIT_PROJECTS"] = "EDIT_PROJECTS";
})(Permission || (Permission = {}));
// FIX: Converted status types to enums for type safety and value usage.
export var TodoStatus;
(function (TodoStatus) {
    TodoStatus["TODO"] = "TODO";
    TodoStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TodoStatus["DONE"] = "DONE";
})(TodoStatus || (TodoStatus = {}));
export var TodoPriority;
(function (TodoPriority) {
    TodoPriority["LOW"] = "LOW";
    TodoPriority["MEDIUM"] = "MEDIUM";
    TodoPriority["HIGH"] = "HIGH";
})(TodoPriority || (TodoPriority = {}));
export var ExpenseStatus;
(function (ExpenseStatus) {
    ExpenseStatus["PENDING"] = "PENDING";
    ExpenseStatus["APPROVED"] = "APPROVED";
    ExpenseStatus["REJECTED"] = "REJECTED";
    ExpenseStatus["PAID"] = "PAID";
})(ExpenseStatus || (ExpenseStatus = {}));
export var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "DRAFT";
    InvoiceStatus["SENT"] = "SENT";
    InvoiceStatus["PAID"] = "PAID";
    InvoiceStatus["OVERDUE"] = "OVERDUE";
    InvoiceStatus["CANCELLED"] = "CANCELLED";
})(InvoiceStatus || (InvoiceStatus = {}));
export var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "INFO";
    NotificationType["SUCCESS"] = "SUCCESS";
    NotificationType["WARNING"] = "WARNING";
    NotificationType["ERROR"] = "ERROR";
    // FIX: Added missing notification types
    NotificationType["APPROVAL_REQUEST"] = "APPROVAL_REQUEST";
    NotificationType["TASK_ASSIGNED"] = "TASK_ASSIGNED";
    NotificationType["NEW_MESSAGE"] = "NEW_MESSAGE";
    NotificationType["SAFETY_ALERT"] = "SAFETY_ALERT";
    NotificationType["DOCUMENT_COMMENT"] = "DOCUMENT_COMMENT";
})(NotificationType || (NotificationType = {}));
export var TimesheetStatus;
(function (TimesheetStatus) {
    TimesheetStatus["PENDING"] = "PENDING";
    TimesheetStatus["APPROVED"] = "APPROVED";
    TimesheetStatus["REJECTED"] = "REJECTED";
    TimesheetStatus["DRAFT"] = "DRAFT";
})(TimesheetStatus || (TimesheetStatus = {}));
export var IncidentSeverity;
(function (IncidentSeverity) {
    IncidentSeverity["LOW"] = "LOW";
    IncidentSeverity["MEDIUM"] = "MEDIUM";
    IncidentSeverity["HIGH"] = "HIGH";
    IncidentSeverity["CRITICAL"] = "CRITICAL";
})(IncidentSeverity || (IncidentSeverity = {}));
export var IncidentStatus;
(function (IncidentStatus) {
    IncidentStatus["REPORTED"] = "REPORTED";
    IncidentStatus["UNDER_INVESTIGATION"] = "UNDER_INVESTIGATION";
    IncidentStatus["RESOLVED"] = "RESOLVED";
})(IncidentStatus || (IncidentStatus = {}));
export var EquipmentStatus;
(function (EquipmentStatus) {
    EquipmentStatus["AVAILABLE"] = "AVAILABLE";
    EquipmentStatus["IN_USE"] = "IN_USE";
    EquipmentStatus["MAINTENANCE"] = "MAINTENANCE";
    EquipmentStatus["OUT_OF_ORDER"] = "OUT_OF_ORDER";
})(EquipmentStatus || (EquipmentStatus = {}));
// FIX: Added missing status enums
export var QuoteStatus;
(function (QuoteStatus) {
    QuoteStatus["DRAFT"] = "DRAFT";
    QuoteStatus["SENT"] = "SENT";
    QuoteStatus["ACCEPTED"] = "ACCEPTED";
    QuoteStatus["REJECTED"] = "REJECTED";
})(QuoteStatus || (QuoteStatus = {}));
export var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["DRAFT"] = "DRAFT";
    DocumentStatus["IN_REVIEW"] = "IN_REVIEW";
    DocumentStatus["APPROVED"] = "APPROVED";
})(DocumentStatus || (DocumentStatus = {}));
export var AvailabilityStatus;
(function (AvailabilityStatus) {
    AvailabilityStatus["AVAILABLE"] = "AVAILABLE";
    AvailabilityStatus["ON_PROJECT"] = "ON_PROJECT";
    AvailabilityStatus["ON_LEAVE"] = "ON_LEAVE";
})(AvailabilityStatus || (AvailabilityStatus = {}));
export var ExpenseCategory;
(function (ExpenseCategory) {
    ExpenseCategory["MATERIALS"] = "MATERIALS";
    ExpenseCategory["LABOR"] = "LABOR";
    ExpenseCategory["EQUIPMENT"] = "EQUIPMENT";
    ExpenseCategory["SUBCONTRACTOR"] = "SUBCONTRACTOR";
    ExpenseCategory["PERMITS"] = "PERMITS";
    ExpenseCategory["OTHER"] = "OTHER";
})(ExpenseCategory || (ExpenseCategory = {}));
// FIX: Added RolePermissions constant for hasPermission check
export const RolePermissions = {
    [Role.OWNER]: new Set(Object.values(Permission)),
    [Role.ADMIN]: new Set([
        Permission.VIEW_ALL_PROJECTS, Permission.CREATE_PROJECT, Permission.MANAGE_PROJECT_DETAILS, Permission.VIEW_ALL_TASKS, Permission.MANAGE_ALL_TASKS,
        Permission.VIEW_ALL_TIMESHEETS, Permission.MANAGE_TIMESHEETS, Permission.UPLOAD_DOCUMENTS, Permission.VIEW_DOCUMENTS, Permission.VIEW_SAFETY_REPORTS,
        Permission.MANAGE_SAFETY_REPORTS, Permission.VIEW_FINANCES, Permission.MANAGE_FINANCES, Permission.VIEW_TEAM, Permission.MANAGE_TEAM,
        Permission.MANAGE_EQUIPMENT, Permission.VIEW_AUDIT_LOG, Permission.SEND_DIRECT_MESSAGE, Permission.ACCESS_ALL_TOOLS, Permission.SUBMIT_EXPENSE,
        Permission.MANAGE_PROJECT_TEMPLATES
    ]),
    [Role.PROJECT_MANAGER]: new Set([
        Permission.VIEW_ALL_PROJECTS, Permission.MANAGE_PROJECT_DETAILS, Permission.VIEW_ALL_TASKS, Permission.MANAGE_ALL_TASKS, Permission.VIEW_ALL_TIMESHEETS,
        Permission.MANAGE_TIMESHEETS, Permission.UPLOAD_DOCUMENTS, Permission.VIEW_DOCUMENTS, Permission.VIEW_SAFETY_REPORTS, Permission.VIEW_FINANCES,
        Permission.VIEW_TEAM, Permission.MANAGE_EQUIPMENT, Permission.SEND_DIRECT_MESSAGE, Permission.SUBMIT_EXPENSE
    ]),
    [Role.FOREMAN]: new Set([
        Permission.VIEW_ASSIGNED_PROJECTS, Permission.SUBMIT_TIMESHEET, Permission.UPLOAD_DOCUMENTS, Permission.VIEW_DOCUMENTS,
        Permission.SUBMIT_SAFETY_REPORT, Permission.VIEW_SAFETY_REPORTS, Permission.SEND_DIRECT_MESSAGE, Permission.SUBMIT_EXPENSE
    ]),
    [Role.OPERATIVE]: new Set([
        Permission.VIEW_ASSIGNED_PROJECTS, Permission.SUBMIT_TIMESHEET, Permission.VIEW_DOCUMENTS, Permission.SUBMIT_SAFETY_REPORT, Permission.SUBMIT_EXPENSE
    ]),
    [Role.CLIENT]: new Set([Permission.VIEW_ASSIGNED_PROJECTS, Permission.VIEW_DOCUMENTS]),
    [Role.PRINCIPAL_ADMIN]: new Set(Object.values(Permission)),
};
//# sourceMappingURL=types.js.map