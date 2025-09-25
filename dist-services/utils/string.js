/**
 * Safely converts any value to a string
 * Used for consistent string comparisons in the application
 *
 * @param value - Value to convert to a string
 * @returns String representation of the value, or empty string for null/undefined
 */
export const safeString = (value) => {
    if (value === null || value === undefined) {
        return '';
    }
    // Handle various value types
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return String(value);
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        }
        catch (e) {
            console.warn('Failed to stringify object:', e);
            return Object.prototype.toString.call(value);
        }
    }
    return String(value);
};
/**
 * Safely converts any value to a number
 *
 * @param value - Value to convert to a number
 * @param defaultValue - Default value if conversion fails
 * @returns Numeric representation of the value, or defaultValue for invalid conversions
 */
export const safeNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined) {
        return defaultValue;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : defaultValue;
    }
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '')
            return defaultValue;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : defaultValue;
    }
    return defaultValue;
};
//# sourceMappingURL=string.js.map