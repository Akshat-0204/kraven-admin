import type { RequestHandler } from 'express';
import { HttpError } from '../shared/errors/httpError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function requestOrigin(origin?: string, referer?: string) {
  if (origin) return origin;
  if (!referer) return undefined;

  try {
    return new URL(referer).origin;
  } catch {
    return 'invalid';
  }
}

/**
 * CSRF defence: the session cookie is SameSite=None in production, so a browser will attach it to
 * cross-site requests. Reject state-changing requests whose Origin (or Referer) is not allowlisted.
 * Requests carrying neither header are not from a browser page and are let through.
 */
export function originCheck(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);

  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const origin = requestOrigin(req.get('origin'), req.get('referer'));

    if (origin !== undefined && !allowed.has(origin)) {
      next(new HttpError(403, 'Origin not allowed'));
      return;
    }

    next();
  };
}
