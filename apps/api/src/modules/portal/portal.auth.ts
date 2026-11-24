import type { Request, RequestHandler } from 'express';
import { HttpError } from '../../shared/errors/httpError.js';
import { ClientModel } from '../clients/client.model.js';
import { readPortalCookie } from './portal.cookie.js';
import { isPortalOpen } from './portal.rules.js';

export interface PortalRequestContext {
  clientId: string;
  slug: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `requirePortalAccess`: the client the portal cookie belongs to. */
    portal?: PortalRequestContext;
  }
}

/**
 * Guards `/public/portal/*` content routes. Checks the signed portal cookie on every request against the
 * client's current portal state: enabled, not expired, and `accessVersion` unchanged (code rotation and
 * revoke bump it). Sets `req.portal.clientId`; read it with `getPortalClientId(req)`.
 */
export const requirePortalAccess: RequestHandler = async (req, _res, next) => {
  try {
    const payload = readPortalCookie(req);
    if (!payload) throw new HttpError(401, 'Portal access required');

    const client = await ClientModel.findById(payload.clientId).select('portalAccess').lean();
    const access = client?.portalAccess;
    if (!access?.slug || !isPortalOpen(access) || (access.accessVersion ?? 0) !== payload.accessVersion) {
      throw new HttpError(401, 'Portal access required');
    }

    req.portal = { clientId: payload.clientId, slug: access.slug };
    next();
  } catch (error) {
    next(error);
  }
};

export function getPortalClientId(req: Request) {
  if (!req.portal) throw new HttpError(401, 'Portal access required');
  return req.portal.clientId;
}
