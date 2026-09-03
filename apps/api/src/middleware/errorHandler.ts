import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../shared/errors/httpError.js';
import { logger } from '../shared/logger/logger.js';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next;

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      message: 'Validation failed',
      issues: error.issues
    });
    return;
  }

  logger.error({ error }, 'unhandled API error');
  res.status(500).json({ message: 'Internal server error' });
};
