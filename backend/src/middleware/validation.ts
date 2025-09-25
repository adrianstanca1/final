import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export interface ValidationError extends Error {
  status: number;
  errors: any[];
}

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new Error('Validation failed') as ValidationError;
        validationError.status = 400;
        validationError.errors = error.errors;
        return next(validationError);
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.query);
      req.query = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new Error('Query validation failed') as ValidationError;
        validationError.status = 400;
        validationError.errors = error.errors;
        return next(validationError);
      }
      next(error);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.params);
      req.params = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new Error('Params validation failed') as ValidationError;
        validationError.status = 400;
        validationError.errors = error.errors;
        return next(validationError);
      }
      next(error);
    }
  };
};