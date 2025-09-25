import React from 'react';
import { TimesheetStatus, IncidentStatus, IncidentSeverity, InvoiceStatus, QuoteStatus, TodoStatus, DocumentStatus, EquipmentStatus } from '../../types';
import { Tag } from './Tag';

export const TimesheetStatusBadge: React.FC<{ status: TimesheetStatus }> = ({ status }) => {
    const statusMap = {
        [TimesheetStatus.PENDING]: { label: 'Pending', color: 'yellow', indicator: 'yellow' },
        [TimesheetStatus.APPROVED]: { label: 'Approved', color: 'green', indicator: 'green' },
        [TimesheetStatus.REJECTED]: { label: 'Rejected', color: 'red', indicator: 'red' },
        [TimesheetStatus.DRAFT]: { label: 'Draft', color: 'gray', indicator: 'gray' },
    };
    const { label, color, indicator } = statusMap[status] || { label: 'Unknown', color: 'gray', indicator: 'gray' };
    return <Tag label={label} color={color as any} statusIndicator={indicator as any} />;
};

export const IncidentStatusBadge: React.FC<{ status: IncidentStatus }> = ({ status }) => {
    const statusMap = {
        [IncidentStatus.REPORTED]: { label: 'Reported', color: 'blue', indicator: 'blue' },
        [IncidentStatus.UNDER_INVESTIGATION]: { label: 'Investigating', color: 'yellow', indicator: 'yellow' },
        [IncidentStatus.RESOLVED]: { label: 'Resolved', color: 'green', indicator: 'green' },
    };
    const { label, color, indicator } = statusMap[status] || { label: 'Unknown', color: 'gray', indicator: 'gray' };
    return <Tag label={label} color={color as any} statusIndicator={indicator as any} />;
};

export const IncidentSeverityBadge: React.FC<{ severity: IncidentSeverity }> = ({ severity }) => {
    const severityMap = {
        [IncidentSeverity.LOW]: { label: 'Low', color: 'green', indicator: 'green' },
        [IncidentSeverity.MEDIUM]: { label: 'Medium', color: 'yellow', indicator: 'yellow' },
        [IncidentSeverity.HIGH]: { label: 'High', color: 'red', indicator: 'red' },
    };
    const { label, color, indicator } = severityMap[severity] || { label: 'Unknown', color: 'gray', indicator: 'gray' };
    return <Tag label={label} color={color as any} statusIndicator={indicator as any} />;
};

export const InvoiceStatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
    const statusMap = {
        [InvoiceStatus.DRAFT]: { label: 'Draft', color: 'gray', indicator: 'gray' },
        [InvoiceStatus.SENT]: { label: 'Sent', color: 'blue', indicator: 'blue' },
        [InvoiceStatus.PAID]: { label: 'Paid', color: 'green', indicator: 'green' },
        [InvoiceStatus.OVERDUE]: { label: 'Overdue', color: 'red', indicator: 'red' },
    };
    const { label, color, indicator } = statusMap[status] || { label: 'Unknown', color: 'gray', indicator: 'gray' };
    return <Tag label={label} color={color as any} statusIndicator={indicator as any} />;
};

export const QuoteStatusBadge: React.FC<{ status: QuoteStatus }> = ({ status }) => {
    const statusMap = {
        [QuoteStatus.DRAFT]: { label: 'Draft', color: 'gray', indicator: 'gray' },
        [QuoteStatus.SENT]: { label: 'Sent', color: 'blue', indicator: 'blue' },
        [QuoteStatus.ACCEPTED]: { label: 'Accepted', color: 'green', indicator: 'green' },
        [QuoteStatus.REJECTED]: { label: 'Rejected', color: 'red', indicator: 'red' },
    };
    const { label, color, indicator } = statusMap[status] || { label: 'Unknown', color: 'gray', indicator: 'gray' };
    return <Tag label={label} color={color as any} statusIndicator={indicator as any} />;
};

export const TodoStatusBadge: React.FC<{ status: TodoStatus }> = ({ status }) => {
    const statusMap = {
        [TodoStatus.TODO]: { label: 'To Do', color: 'yellow', indicator: 'yellow' },
        [TodoStatus.IN_PROGRESS]: { label: 'In Progress', color: 'blue', indicator: 'blue' },
        [TodoStatus.DONE]: { label: 'Done', color: 'green', indicator: 'green' },
    };
    const { label, color, indicator } = statusMap[status] || { label: 'Unknown', color: 'gray', indicator: 'gray' };
    return <Tag label={label} color={color as any} statusIndicator={indicator as any} />;
};

export const DocumentStatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => {
    const statusMap = {
        [DocumentStatus.DRAFT]: { label: 'Draft', color: 'gray', indicator: 'gray' },
        [DocumentStatus.IN_REVIEW]: { label: 'In Review', color: 'yellow', indicator: 'yellow' },
        [DocumentStatus.APPROVED]: { label: 'Approved', color: 'green', indicator: 'green' },
    };
    const { label, color, indicator } = statusMap[status] || { label: 'Unknown', color: 'gray', indicator: 'gray' };
    return <Tag label={label} color={color as any} statusIndicator={indicator as any} />;
};

export const EquipmentStatusBadge: React.FC<{ status: EquipmentStatus }> = ({ status }) => {
    const statusMap = {
        [EquipmentStatus.AVAILABLE]: { label: 'Available', color: 'green', indicator: 'green' },
        [EquipmentStatus.IN_USE]: { label: 'In Use', color: 'blue', indicator: 'blue' },
        [EquipmentStatus.MAINTENANCE]: { label: 'Maintenance', color: 'yellow', indicator: 'yellow' },
        [EquipmentStatus.OUT_OF_ORDER]: { label: 'Out of Order', color: 'red', indicator: 'red' },
    };
    const { label, color, indicator } = statusMap[status] || { label: 'Unknown', color: 'gray', indicator: 'gray' };
    return <Tag label={label} color={color as any} statusIndicator={indicator as any} />;
};
