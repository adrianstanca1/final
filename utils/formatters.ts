import { format } from 'date-fns';

export { formatCurrency } from './finance';

/**
 * Format a date string into a readable format
 * @param value Date string to format
 * @returns Formatted date string or placeholder if invalid
 */
export const formatDate = (value?: string | Date): string => {
  if (!value) return '—';
  
  // Convert to Date if string
  const dateObj = typeof value === 'string' ? new Date(value) : value;
  
  // Check if date is valid
  if (Number.isNaN(dateObj.getTime())) return '—';
  
  // Format date
  return format(dateObj, 'd MMM yyyy');
};