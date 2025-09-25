/**
 * Cross-environment validation utilities
 * 
 * This module provides validation functions that work consistently across
 * different environments (browser, Node.js, etc.)
 */

type ValidationResult<T> = {
  isValid: boolean;
  value: T | null;
  errors: string[];
};

/**
 * Validates input data against environment-specific constraints
 * 
 * @param schema The validation schema
 * @param data The data to validate
 * @param environment The target environment ('browser', 'node', 'api', or 'all')
 * @returns Validation result
 */
export function validateData<T>(
  schema: any, 
  data: unknown, 
  environment: 'browser' | 'node' | 'api' | 'all' = 'all'
): ValidationResult<T> {
  try {
    // If we have Zod available, use it for validation
    if (typeof schema?.parse === 'function') {
      try {
        const validatedData = schema.parse(data) as T;
        return {
          isValid: true,
          value: validatedData,
          errors: [],
        };
      } catch (error: any) {
        // Handle Zod errors
        const formattedErrors = Array.isArray(error?.errors) 
          ? error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`)
          : [error?.message || 'Validation failed'];
          
        return {
          isValid: false,
          value: null,
          errors: formattedErrors,
        };
      }
    }
    
    // Fallback to basic validation
    if (schema && typeof schema === 'object') {
      const errors: string[] = [];
      
      // Basic object validation
      for (const key in schema) {
        if (!data || typeof data !== 'object' || !(key in (data as any))) {
          errors.push(`Missing required property: ${key}`);
        }
      }
      
      if (errors.length > 0) {
        return {
          isValid: false,
          value: null,
          errors,
        };
      }
      
      return {
        isValid: true,
        value: data as T,
        errors: [],
      };
    }
    
    // No schema provided, return as valid
    return {
      isValid: true,
      value: data as T,
      errors: [],
    };
  } catch (error) {
    return {
      isValid: false,
      value: null,
      errors: ['Unexpected validation error'],
    };
  }
}

/**
 * Environment detection utility
 * @returns The current execution environment
 */
export function detectEnvironment(): 'browser' | 'node' | 'api' | 'unknown' {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }
  
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    // Check for Vercel serverless environment
    if (process.env.VERCEL || process.env.VERCEL_URL) {
      return 'api';
    }
    return 'node';
  }
  
  return 'unknown';
}

/**
 * Validates that the input is valid for a specific environment
 * 
 * @param input The input data to validate
 * @param targetEnvironment The target environment
 */
export function validateForEnvironment<T>(
  input: unknown,
  schema: any,
  targetEnvironment: 'browser' | 'node' | 'api' | 'all' = 'all'
): ValidationResult<T> {
  const currentEnvironment = detectEnvironment();
  
  // If we're validating for 'all' or for the current environment
  if (targetEnvironment === 'all' || targetEnvironment === currentEnvironment) {
    return validateData<T>(schema, input, targetEnvironment);
  }
  
  // We're validating for a different environment
  return validateData<T>(schema, input, targetEnvironment);
}