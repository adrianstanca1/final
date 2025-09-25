/**
 * Comprehensive validation service for data integrity and security
 */
export class ValidationService {
    static { this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; }
    static { this.phoneRegex = /^[\+]?[1-9][\d]{0,15}$/; }
    static { this.urlRegex = /^https?:\/\/.+/; }
    static validate(data, rules) {
        const errors = {};
        const sanitizedData = { ...data };
        for (const rule of rules) {
            const fieldName = String(rule.field);
            const value = data[rule.field];
            const fieldErrors = [];
            // Required validation
            if (rule.required && (value === undefined || value === null || value === '')) {
                fieldErrors.push(`${fieldName} is required`);
                continue;
            }
            // Skip other validations if field is empty and not required
            if (!rule.required && (value === undefined || value === null || value === '')) {
                continue;
            }
            // Type validation
            if (rule.type) {
                const typeError = this.validateType(value, rule.type, fieldName);
                if (typeError)
                    fieldErrors.push(typeError);
            }
            // Length validation for strings
            if (typeof value === 'string') {
                if (rule.minLength && value.length < rule.minLength) {
                    fieldErrors.push(`${fieldName} must be at least ${rule.minLength} characters`);
                }
                if (rule.maxLength && value.length > rule.maxLength) {
                    fieldErrors.push(`${fieldName} must not exceed ${rule.maxLength} characters`);
                }
            }
            // Numeric range validation
            if (typeof value === 'number') {
                if (rule.min !== undefined && value < rule.min) {
                    fieldErrors.push(`${fieldName} must be at least ${rule.min}`);
                }
                if (rule.max !== undefined && value > rule.max) {
                    fieldErrors.push(`${fieldName} must not exceed ${rule.max}`);
                }
            }
            // Pattern validation
            if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
                fieldErrors.push(`${fieldName} format is invalid`);
            }
            // Custom validation
            if (rule.custom) {
                const customError = rule.custom(value);
                if (customError)
                    fieldErrors.push(customError);
            }
            // Sanitization
            if (rule.sanitize) {
                sanitizedData[rule.field] = rule.sanitize(value);
            }
            if (fieldErrors.length > 0) {
                errors[fieldName] = fieldErrors;
            }
        }
        return {
            isValid: Object.keys(errors).length === 0,
            errors,
            sanitizedData: Object.keys(errors).length === 0 ? sanitizedData : undefined,
        };
    }
    static validateType(value, type, fieldName) {
        switch (type) {
            case 'string':
                return typeof value !== 'string' ? `${fieldName} must be a string` : null;
            case 'number':
                return typeof value !== 'number' || isNaN(value) ? `${fieldName} must be a valid number` : null;
            case 'boolean':
                return typeof value !== 'boolean' ? `${fieldName} must be true or false` : null;
            case 'email':
                return typeof value === 'string' && this.emailRegex.test(value)
                    ? null
                    : `${fieldName} must be a valid email address`;
            case 'phone':
                return typeof value === 'string' && this.phoneRegex.test(value.replace(/\s/g, ''))
                    ? null
                    : `${fieldName} must be a valid phone number`;
            case 'url':
                return typeof value === 'string' && this.urlRegex.test(value)
                    ? null
                    : `${fieldName} must be a valid URL`;
            case 'date':
                const date = new Date(value);
                return !isNaN(date.getTime()) ? null : `${fieldName} must be a valid date`;
            default:
                return null;
        }
    }
    // Sanitization helpers
    static { this.sanitizers = {
        trim: (value) => typeof value === 'string' ? value.trim() : value,
        toLowerCase: (value) => typeof value === 'string' ? value.toLowerCase() : value,
        toUpperCase: (value) => typeof value === 'string' ? value.toUpperCase() : value,
        removeSpecialChars: (value) => typeof value === 'string' ? value.replace(/[^a-zA-Z0-9\s]/g, '') : value,
        normalizePhone: (value) => typeof value === 'string' ? value.replace(/\D/g, '') : value,
        normalizeEmail: (value) => typeof value === 'string' ? value.toLowerCase().trim() : value,
        escapeHtml: (value) => {
            if (typeof value !== 'string')
                return value;
            return value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;');
        },
        limitLength: (maxLength) => (value) => typeof value === 'string' ? value.substring(0, maxLength) : value,
    }; }
    // Common validation rule sets
    static { this.commonRules = {
        email: {
            field: 'email',
            required: true,
            type: 'email',
            sanitize: this.sanitizers.normalizeEmail,
        },
        password: {
            field: 'password',
            required: true,
            type: 'string',
            minLength: 8,
            custom: (value) => {
                if (!/(?=.*[a-z])/.test(value))
                    return 'Password must contain at least one lowercase letter';
                if (!/(?=.*[A-Z])/.test(value))
                    return 'Password must contain at least one uppercase letter';
                if (!/(?=.*\d)/.test(value))
                    return 'Password must contain at least one number';
                return null;
            },
        },
        phone: {
            field: 'phone',
            type: 'phone',
            sanitize: this.sanitizers.normalizePhone,
        },
        name: {
            field: 'name',
            required: true,
            type: 'string',
            minLength: 2,
            maxLength: 50,
            sanitize: this.sanitizers.trim,
        },
        currency: {
            field: 'amount',
            required: true,
            type: 'number',
            min: 0,
            custom: (value) => {
                if (value < 0)
                    return 'Amount cannot be negative';
                if (value > 1000000)
                    return 'Amount exceeds maximum limit';
                return null;
            },
        },
    }; }
}
// Security validation helpers
export const securityValidation = {
    // Check for SQL injection patterns
    checkSqlInjection: (input) => {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
            /('|(\\')|(;)|(\\;)|(\|)|(\*)|(%)|(<)|(>)|(\{)|(\})|(\[)|(\]))/,
        ];
        return sqlPatterns.some(pattern => pattern.test(input));
    },
    // Check for XSS patterns
    checkXss: (input) => {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
        ];
        return xssPatterns.some(pattern => pattern.test(input));
    },
    // Validate file upload
    validateFile: (file, allowedTypes, maxSize) => {
        const errors = [];
        if (!allowedTypes.includes(file.type)) {
            errors.push(`File type ${file.type} is not allowed`);
        }
        if (file.size > maxSize) {
            errors.push(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    },
    // Rate limiting check
    checkRateLimit: (key, limit, windowMs) => {
        const now = Date.now();
        const windowKey = `rate_limit_${key}_${Math.floor(now / windowMs)}`;
        const current = parseInt(localStorage.getItem(windowKey) || '0');
        if (current >= limit) {
            return false;
        }
        localStorage.setItem(windowKey, (current + 1).toString());
        // Cleanup old entries
        setTimeout(() => {
            localStorage.removeItem(windowKey);
        }, windowMs);
        return true;
    },
};
//# sourceMappingURL=validationService.js.map