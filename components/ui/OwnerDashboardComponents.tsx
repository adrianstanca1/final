import React from 'react';
import { useOwnerDashboardFormatting } from '../../hooks/useOwnerDashboardFormatting';
import './ownerDashboard.css';

interface MiniBarChartProps {
  data: Array<{ label: string; value: number }>;
  accent?: 'primary' | 'emerald' | 'amber';
  emptyLabel: string;
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({ data, accent = 'primary', emptyLabel }) => {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  
  const max = Math.max(...data.map((item) => item.value), 1);
  const colorMap = {
    'emerald': 'bg-emerald-500',
    'amber': 'bg-amber-500',
    'primary': 'bg-primary',
  };
  
  const color = colorMap[accent];
  
  return (
    <div className="flex items-end gap-2">
      {data.map((item) => (
        <div className="flex flex-1 flex-col items-center gap-1" key={item.label}>
          <div className="text-xs font-semibold text-muted-foreground">{item.label}</div>
          <div className="flex h-32 w-full items-end overflow-hidden rounded bg-muted/60">
            <div
              className={`${color} chart-bar`}
              style={{ height: `${Math.max(6, (item.value / max) * 100)}%` }}
              title={`${item.label}: ${item.value.toLocaleString()}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

interface CostBreakdownListProps {
  data: Array<{ category: string; amount: number }>;
  currency: string;
}

export const CostBreakdownList: React.FC<CostBreakdownListProps> = ({ data, currency }) => {
  const { formatCurrency } = useOwnerDashboardFormatting();
  
  if (!data.length) {
    return <p className="text-sm text-muted-foreground">No approved costs recorded.</p>;
  }
  
  const total = data.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 1;
  
  return (
    <div className="space-y-3">
      {data.map((entry) => {
        const share = Math.round(((entry.amount || 0) / total) * 100);
        return (
          <div className="space-y-1" key={entry.category}>
            <div className="flex items-center justify-between text-sm font-semibold text-foreground">
              <span>{entry.category}</span>
              <span>{formatCurrency(entry.amount || 0, currency)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-muted">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${share}%`
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{share}% of tracked spend</p>
          </div>
        );
      })}
    </div>
  );
};

interface OperationalSignalsProps {
  openIncidentsCount: number;
  highSeverityCount: number;
  daysSinceLastIncident: number | null;
  approvedExpenseTotal: number;
  complianceRate: number;
  pendingTimesheetApprovals: number;
  invoicePipeline: number;
  burnRatePerProject: number | null;
  overtimeHours: number | null;
  currency: string;
  financialCurrency: string;
}

export const OperationalSignals: React.FC<OperationalSignalsProps> = ({
  openIncidentsCount,
  highSeverityCount,
  daysSinceLastIncident,
  approvedExpenseTotal,
  complianceRate,
  pendingTimesheetApprovals,
  invoicePipeline,
  burnRatePerProject,
  overtimeHours,
  currency,
  financialCurrency,
}) => {
  const { formatCurrency, formatDaysSinceLastIncident } = useOwnerDashboardFormatting();
  
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Open incidents</span>
        <span className="font-semibold text-foreground">
          {openIncidentsCount}
          {highSeverityCount > 0 && (
            <span className="text-xs font-medium text-destructive"> • {highSeverityCount} high</span>
          )}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Days since last incident</span>
        <span className="font-semibold text-foreground">
          {formatDaysSinceLastIncident(daysSinceLastIncident)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Approved expense run rate</span>
        <span className="font-semibold text-foreground">
          {formatCurrency(approvedExpenseTotal, currency)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Timesheet compliance</span>
        <span className={`font-semibold ${complianceRate < 80 ? 'text-amber-600' : 'text-foreground'}`}>
          {complianceRate}%
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Pending approvals</span>
        <span className="font-semibold text-foreground">{pendingTimesheetApprovals}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Approved cost this month</span>
        <span className="font-semibold text-foreground">
          {formatCurrency(approvedExpenseTotal, financialCurrency)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Invoice pipeline</span>
        <span className="font-semibold text-foreground">
          {formatCurrency(invoicePipeline, financialCurrency)}
        </span>
      </div>
      {(burnRatePerProject !== null || (overtimeHours !== null && overtimeHours > 0)) && (
        <p className="text-xs text-muted-foreground">
          {burnRatePerProject !== null && `Burn per active project: ${formatCurrency(burnRatePerProject, financialCurrency)}`}
          {overtimeHours !== null && overtimeHours > 0 && 
            `${burnRatePerProject !== null ? ' • ' : ''}${overtimeHours.toFixed(1)} overtime hrs`
          }
        </p>
      )}
    </div>
  );
};