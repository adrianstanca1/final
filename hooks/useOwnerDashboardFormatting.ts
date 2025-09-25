import { IncidentSeverity } from '../types';

// Utility hook for formatting and display logic used in the OwnerDashboard
export const useOwnerDashboardFormatting = () => {
  // Format currency with locale-appropriate formatting
  const formatCurrency = (value: number, currency: string = 'GBP') =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value || 0);

  // Clamp percentage between 0-100 and round to nearest integer
  const clampPercentage = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

  // Format Markdown content with styled HTML elements
  const renderMarkdownSummary = (summary: string) =>
    summary
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line, index) => ({
        key: `${line}-${index}`,
        html: line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
          .replace(/^[-•]\s+/, '• '),
      }));

  // Get color classes based on alert severity
  const getAlertColorClass = (severity: string): string => {
    if (severity === 'critical') return 'bg-destructive';
    if (severity === 'warning') return 'bg-amber-500';
    return 'bg-primary';
  };

  // Format days since last incident
  const formatDaysSinceLastIncident = (days: number | null): string => {
    if (days === null) return '—';
    if (days === 0) return 'Today';
    return `${days} day${days === 1 ? '' : 's'}`;
  };

  // Get status color for a project
  const getProjectStatusColor = (status: string): string => {
    if (status === 'ACTIVE') return 'green';
    if (status === 'ON_HOLD') return 'yellow';
    return 'red';
  };

  // Get color for workforce availability tag
  const getAvailabilityTagColor = (availability: string | null): string => {
    if (availability === 'ON_PROJECT') return 'blue';
    if (availability === 'ON_LEAVE') return 'gray';
    return 'green';
  };

  // Format workforce helper text based on compliance and crew status
  const getWorkforceHelperText = (complianceRate: number, crewOnShift: number): string => {
    if (complianceRate > 0) {
      const baseText = `${complianceRate}% approvals`;
      const crewText = crewOnShift ? ` • ${crewOnShift} clocked in` : '';
      return baseText + crewText;
    } else if (crewOnShift) {
      return `${crewOnShift} team members clocked in`;
    } else {
      return 'No approvals submitted';
    }
  };

  // Get indicator for workforce health
  const getWorkforceIndicator = (complianceRate: number, crewOnShift: number): 'warning' | 'positive' | 'neutral' => {
    if (complianceRate < 80) return 'warning';
    if (crewOnShift > 0) return 'positive';
    return 'neutral';
  };

  return {
    formatCurrency,
    clampPercentage,
    renderMarkdownSummary,
    getAlertColorClass,
    formatDaysSinceLastIncident,
    getProjectStatusColor,
    getAvailabilityTagColor,
    getWorkforceHelperText,
    getWorkforceIndicator
  };
};