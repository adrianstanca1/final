/**
 * Format a number as currency (GBP)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GB', { 
    style: 'currency', 
    currency: 'GBP', 
    minimumFractionDigits: 0 
  }).format(amount);
};

/**
 * Format a number as a percentage
 */
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a number with thousands separators
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-GB').format(value);
};

/**
 * Format bytes as human readable string
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};