import React from 'react';
import {
    TimesheetStatus,
    IncidentStatus,
    IncidentSeverity,
    InvoiceStatus,
    QuoteStatus,
    TodoStatus,
    DocumentStatus,
    EquipmentStatus
} from '../../types';
import { Tag } from './Tag';

export const TimesheetStatusBadge: React.FC<{ status: TimesheetStatus }> = ({ status }) => {
    const statusMap = {
        [TimesheetStatus.PENDING]: { label: 'Pending', color: 'yellow', indicator: 'yellow' },
        [TimesheetStatus.APPROVED]: { label: 'Approved', color: 'green', indicator: 'green' },
        [TimesheetStatus.REJECTED]: { label: 'Rejected', color: 'red', indicator: 'red' },
        [TimesheetStatus.DRAFT]: { label: 'Draft', color: 'gray', indicator: 'gray' },
    } as const;

    const style = statusMap[status] || { label: 'Unknown', color: 'gray', indicator: 'gray' };
    return (
        <Tag
            label={style.label}
            color={style.color as any}
            statusIndicator={style.indicator as any}
        />
    );
};

export const IncidentStatusBadge: React.FC<{ status: IncidentStatus }> = ({ status }) => {
    const statusMap = {
        [IncidentStatus.REPORTED]: { label: 'Reported', color: 'blue', indicator: 'blue' },
        [IncidentStatus.UNDER_INVESTIGATION]: { label: 'Investigating', color: 'yellow', indicator: 'yellow' },
        [IncidentStatus.RESOLVED]: { label: 'Resolved', color: 'green', indicator: 'green' },
    } as const;

    const style = statusMap[status] || { label: 'Unknown', color: 'gray', indicator: 'gray' };
    return (
        <Tag
            label={style.label}
            color={style.color as any}
            statusIndicator={style.indicator as any}
        />
    );
};

export const IncidentSeverityBadge: React.FC<{ severity: IncidentSeverity }> = ({ severity }) => {
    const severityMap = {
        [IncidentSeverity.CRITICAL]: { label: 'Critical', color: 'red' },
        [IncidentSeverity.HIGH]: { label: 'High', color: 'red' },
        [IncidentSeverity.MEDIUM]: { label: 'Medium', color: 'yellow' },
        [IncidentSeverity.LOW]: { label: 'Low', color: 'green' },
    } as const;

    const style = severityMap[severity] || { label: 'Unknown', color: 'gray' };
    return <Tag label={style.label} color={style.color as any} />;
};

export const InvoiceStatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
    const statusMap = {
        [InvoiceStatus.DRAFT]: { label: 'Draft', color: 'gray' },
        [InvoiceStatus.SENT]: { label: 'Sent', color: 'blue' },
        [InvoiceStatus.PAID]: { label: 'Paid', color: 'green' },
        [InvoiceStatus.OVERDUE]: { label: 'Overdue', color: 'red' },
        [InvoiceStatus.CANCELLED]: { label: 'Cancelled', color: 'red' },
    } as const;

    const style = statusMap[status] || { label: status, color: 'gray' };
    return <Tag label={style.label} color={style.color as any} />;
};

export const QuoteStatusBadge: React.FC<{ status: QuoteStatus }> = ({ status }) => {
    const statusMap = {
        [QuoteStatus.DRAFT]: { label: 'Draft', color: 'gray' },
        [QuoteStatus.SENT]: { label: 'Sent', color: 'blue' },
        [QuoteStatus.ACCEPTED]: { label: 'Accepted', color: 'green' },
        [QuoteStatus.REJECTED]: { label: 'Rejected', color: 'red' },
    } as const;

    const style = statusMap[status] || { label: status, color: 'gray' };
    return <Tag label={style.label} color={style.color as any} />;
};

export const TodoStatusBadge: React.FC<{ status: TodoStatus }> = ({ status }) => {
    const statusMap = {
        [TodoStatus.TODO]: { label: 'To Do', color: 'gray', indicator: 'gray' },
        [TodoStatus.IN_PROGRESS]: { label: 'In Progress', color: 'blue', indicator: 'blue' },
        [TodoStatus.DONE]: { label: 'Done', color: 'green', indicator: 'green' },
    } as const;

    const style = statusMap[status] || { label: 'Unknown', color: 'gray', indicator: 'gray' };
    return (
        <Tag
            label={style.label}
            color={style.color as any}
            statusIndicator={style.indicator as any}
        />
    );
};

export const DocumentStatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => {
    const statusMap = {
        [DocumentStatus.DRAFT]: { label: 'Draft', color: 'gray' },
        [DocumentStatus.IN_REVIEW]: { label: 'In Review', color: 'yellow' },
        [DocumentStatus.APPROVED]: { label: 'Approved', color: 'green' },
    } as const;

    const style = statusMap[status] || { label: status, color: 'gray' };
    return <Tag label={style.label} color={style.color as any} />;
};

export const EquipmentStatusBadge: React.FC<{ status: EquipmentStatus }> = ({ status }) => {
    const statusMap = {
        [EquipmentStatus.AVAILABLE]: { label: 'Available', color: 'green', indicator: 'green' },
        [EquipmentStatus.IN_USE]: { label: 'In Use', color: 'blue', indicator: 'blue' },
        [EquipmentStatus.MAINTENANCE]: { label: 'Maintenance', color: 'yellow', indicator: 'yellow' },
        [EquipmentStatus.OUT_OF_ORDER]: { label: 'Out of Order', color: 'red', indicator: 'red' },
    } as const;

    const style = statusMap[status] || { label: status, color: 'gray', indicator: 'gray' };
    return (
        <Tag
            label={style.label}
            color={style.color as any}
            statusIndicator={style.indicator as any}
        />
    );
};