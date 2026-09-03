import type { RequestHandler } from 'express';
import { HttpError } from '../shared/errors/httpError.js';

export const authenticate: RequestHandler = (req, _res, next) => {
  if (!req.session.userId) {
    next(new HttpError(401, 'Authentication required'));
    return;
  }

  next();
};
