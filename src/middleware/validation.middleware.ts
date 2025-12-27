import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import logger from '../utils/logger';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        logger.warn('Validation error', { errors });
        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
        return;
      }

      // Handle unexpected errors
      logger.error('Unexpected validation error', { error });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  };
};
