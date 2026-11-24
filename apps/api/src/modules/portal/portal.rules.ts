import type { PortalAccess } from './portalAccess.schema.js';

export const PORTAL_MAX_FAILED_ATTEMPTS = 5;
export const PORTAL_LOCKOUT_MS = 15 * 60 * 1000;
/** Failed verify attempts per IP per window, across all slugs. */
export const PORTAL_VERIFY_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 20 } as const;

export function isPortalOpen(access: Pick<PortalAccess, 'enabled' | 'expiresAt'>, now = new Date()) {
  if (!access.enabled) return false;
  return !access.expiresAt || new Date(access.expiresAt).getTime() > now.getTime();
}

export function isPortalLocked(access: Pick<PortalAccess, 'lockedUntil'>, now = new Date()) {
  return Boolean(access.lockedUntil && new Date(access.lockedUntil).getTime() > now.getTime());
}
