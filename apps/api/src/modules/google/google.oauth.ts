import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Credentials } from 'google-auth-library';
import type { CookieOptions, Request, Response } from 'express';
import { Router } from 'express';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { logger } from '../../shared/logger/logger.js';
import { ensureFolder } from './drive.service.js';
import { GOOGLE_SCOPES, createOAuthClient, getConnection, mapGoogleError } from './google.client.js';
import { GoogleConnectionModel } from './google.connection.model.js';
import { decryptToken, encryptToken } from './token.crypto.js';

const STATE_COOKIE = 'kraven_google_state';
const STATE_TTL_MS = 10 * 60 * 1000;

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    signed: true,
    secure: env.nodeEnv === 'production',
    // Lax: the cookie must accompany Google's top-level redirect back to the callback.
    sameSite: 'lax',
    path: '/google/oauth'
  };
}

/** `nonce.userId` in the signed cookie, with the user id bound into the `state` param via HMAC. */
function stateFor(nonce: string, userId: string) {
  return createHmac('sha256', env.sessionSecret).update(`${nonce}.${userId}`).digest('hex');
}

function requireConfigured() {
  if (!env.google.clientId || !env.google.clientSecret) throw new HttpError(409, 'Google OAuth is not configured on the server (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)');
}

function webUrl(path: string) {
  return new URL(path, env.portalBaseUrl).toString();
}

export const googleRoutes = Router();

googleRoutes.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const connection = await getConnection();
    res.json({
      connected: connection?.status === 'connected',
      needsReconnect: connection?.status === 'disconnected',
      email: connection?.email ?? null,
      connectedAt: connection?.connectedAt?.toISOString() ?? null,
      lastError: connection?.lastError ?? null,
      configured: Boolean(env.google.clientId && env.google.clientSecret)
    });
  })
);

googleRoutes.get(
  '/oauth/start',
  asyncHandler(async (req: Request, res: Response) => {
    requireConfigured();
    const nonce = randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, nonce, { ...cookieOptions(), maxAge: STATE_TTL_MS });
    const url = createOAuthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state: `${nonce}.${stateFor(nonce, req.session.userId!)}`
    });
    res.redirect(302, url);
  })
);

googleRoutes.get(
  '/oauth/callback',
  asyncHandler(async (req: Request, res: Response) => {
    const nonce: unknown = req.signedCookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, cookieOptions());
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const [stateNonce, mac] = state.split('.');
    const expected = typeof nonce === 'string' ? stateFor(nonce, req.session.userId!) : '';
    const valid =
      typeof nonce === 'string' &&
      stateNonce === nonce &&
      Boolean(mac) &&
      mac.length === expected.length &&
      timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
    if (!valid) throw new HttpError(400, 'Google sign-in could not be verified (it may have expired). Start the connection again');

    requireConfigured();
    if (typeof req.query.error === 'string') {
      res.redirect(302, webUrl('/dashboard/crm?google=denied'));
      return;
    }
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!code) throw new HttpError(400, 'Google did not send an authorization code. Start the connection again');

    const client = createOAuthClient();
    let tokens: Credentials;
    try {
      tokens = (await client.getToken(code)).tokens;
    } catch (error) {
      logger.warn({ error }, 'google token exchange failed');
      const mapped = mapGoogleError(error);
      throw mapped.statusCode === 409 || mapped.statusCode === 400
        ? new HttpError(400, 'Google rejected the authorization code (it may have expired). Start the connection again')
        : mapped;
    }
    const existing = await getConnection();
    const refreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : existing?.refreshToken;
    if (!refreshToken) throw new HttpError(400, 'Google did not return a refresh token, try connecting again');
    client.setCredentials(tokens);
    const info = await client.getTokenInfo(tokens.access_token ?? '').catch((error: unknown) => {
      logger.warn({ error }, 'google token info lookup failed');
      throw mapGoogleError(error);
    });
    const email = info.email ?? existing?.email;
    if (!email) throw new HttpError(400, 'Could not read the Google account email');

    await GoogleConnectionModel.deleteMany({});
    const connection = await GoogleConnectionModel.create({
      email,
      refreshToken,
      accessToken: tokens.access_token ?? undefined,
      expiryDate: tokens.expiry_date ?? undefined,
      scopes: (tokens.scope ?? GOOGLE_SCOPES.join(' ')).split(' '),
      rootFolderId: existing?.rootFolderId,
      connectedBy: req.session.userId,
      connectedAt: new Date(),
      status: 'connected'
    });

    try {
      const rootFolderId = await ensureFolder(env.google.rootFolderName);
      connection.rootFolderId = rootFolderId;
      await connection.save();
    } catch (error) {
      logger.warn({ error }, 'google root folder setup failed');
    }
    res.redirect(302, webUrl('/dashboard/crm?google=connected'));
  })
);

googleRoutes.post(
  '/disconnect',
  asyncHandler(async (_req, res) => {
    const connection = await getConnection();
    if (connection) {
      try {
        await createOAuthClient().revokeToken(decryptToken(connection.refreshToken));
      } catch (error) {
        logger.warn({ error }, 'google token revoke failed');
      }
      // A deliberate disconnect removes the connection (no "Reconnect" banner); drive folder ids are re-found by name.
      await connection.deleteOne();
    }
    res.json({ connected: false });
  })
);
