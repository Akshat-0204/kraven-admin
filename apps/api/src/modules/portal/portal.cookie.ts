import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env.js';

export const PORTAL_COOKIE_NAME = 'kraven_portal';
export const PORTAL_COOKIE_PATH = '/public/portal';
export const PORTAL_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface PortalCookiePayload {
  clientId: string;
  accessVersion: number;
  issuedAt: number;
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    signed: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    path: PORTAL_COOKIE_PATH
  };
}

export function setPortalCookie(res: Response, payload: Omit<PortalCookiePayload, 'issuedAt'>, now = Date.now()) {
  const value = `${payload.clientId}.${payload.accessVersion}.${now}`;
  res.cookie(PORTAL_COOKIE_NAME, value, { ...cookieOptions(), maxAge: PORTAL_SESSION_MAX_AGE_MS });
}

export function clearPortalCookie(res: Response) {
  res.clearCookie(PORTAL_COOKIE_NAME, cookieOptions());
}

/** Reads the signed cookie. Unsigned, tampered or malformed values yield `null`. */
export function readPortalCookie(req: Request, now = Date.now()): PortalCookiePayload | null {
  const value: unknown = req.signedCookies?.[PORTAL_COOKIE_NAME];
  if (typeof value !== 'string') return null;

  const match = /^([a-f0-9]{24})\.(\d{1,9})\.(\d{1,15})$/.exec(value);
  if (!match) return null;

  const payload = { clientId: match[1], accessVersion: Number(match[2]), issuedAt: Number(match[3]) };
  // Enforce the 30-day lifetime server-side too; the browser maxAge alone can be bypassed.
  if (payload.issuedAt > now + 60_000 || now - payload.issuedAt > PORTAL_SESSION_MAX_AGE_MS) return null;
  return payload;
}
