import { docs, type docs_v1 } from '@googleapis/docs';
import { drive, type drive_v3 } from '@googleapis/drive';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger/logger.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { GoogleConnectionModel } from './google.connection.model.js';
import { decryptToken, encryptToken } from './token.crypto.js';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/userinfo.email'
];

export function createOAuthClient() {
  return new OAuth2Client(env.google.clientId, env.google.clientSecret, env.google.redirectUri);
}

export async function getConnection() {
  return GoogleConnectionModel.findOne().sort({ createdAt: -1 });
}

/** Maps a googleapis error to an HttpError (404/403/quota/invalid_grant). */
export function mapGoogleError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  const e = error as { code?: number | string; status?: number; message?: string; errors?: { reason?: string }[]; response?: { status?: number; data?: { error?: string | { errors?: { reason?: string }[] } } } };
  const status = Number(e.status ?? e.response?.status ?? e.code);
  const data = e.response?.data?.error;
  const reasons = [
    ...(e.errors?.map((item) => item.reason) ?? []),
    ...(typeof data === 'object' ? (data.errors?.map((item) => item.reason) ?? []) : [])
  ];
  if (e.message?.includes('invalid_grant') || data === 'invalid_grant') {
    return new HttpError(409, 'Reconnect Google');
  }
  if (e.message?.includes('invalid_client') || data === 'invalid_client') {
    return new HttpError(409, 'Google OAuth credentials are invalid. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }
  if (status === 404) return new HttpError(404, 'Google file not found, or not shared with the connected Google account');
  if (status === 403 || status === 429) {
    if (reasons.some((reason) => reason && /quota|rateLimit|storageQuota/i.test(reason)) || status === 429) {
      return new HttpError(429, 'Google quota exceeded, try again shortly');
    }
    return new HttpError(403, 'The connected Google account does not have access to this file');
  }
  if (status === 401) return new HttpError(409, 'Reconnect Google');
  const code = String(e.code ?? '');
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|ETIMEDOUT|ESOCKETTIMEDOUT/.test(code)) {
    return new HttpError(503, 'Could not reach Google. Check the network connection and try again');
  }
  if (status === 400) {
    return new HttpError(400, `Google rejected the request: ${e.message ?? 'bad request'}`);
  }
  if (status >= 500 && status < 600) {
    return new HttpError(502, 'Google is having trouble right now. Try again shortly');
  }
  return new HttpError(502, `Google request failed: ${e.message ?? 'unknown error'}`);
}

export interface GoogleClients {
  drive: drive_v3.Drive;
  docs: docs_v1.Docs;
  email: string;
}

/** Loads the connection and returns authed Drive/Docs clients. Rotated tokens are persisted. */
export async function getAuthedClient(): Promise<GoogleClients> {
  const connection = await getConnection();
  if (!connection || connection.status !== 'connected') {
    throw new HttpError(409, connection ? 'Reconnect Google' : 'Google not connected');
  }

  const auth = createOAuthClient();
  auth.setCredentials({
    refresh_token: decryptToken(connection.refreshToken),
    access_token: connection.accessToken,
    expiry_date: connection.expiryDate
  });
  auth.on('tokens', (tokens) => {
    const update: Record<string, unknown> = {};
    if (tokens.access_token) update.accessToken = tokens.access_token;
    if (tokens.expiry_date) update.expiryDate = tokens.expiry_date;
    if (tokens.refresh_token) update.refreshToken = encryptToken(tokens.refresh_token);
    if (Object.keys(update).length > 0) void GoogleConnectionModel.updateOne({ _id: connection._id }, { $set: update }).catch((error: unknown) => {
        logger.warn({ error }, 'failed to persist refreshed google tokens');
      });
  });

  return { drive: drive({ version: 'v3', auth }), docs: docs({ version: 'v1', auth }), email: connection.email };
}

/** Runs a Google call, mapping errors; `invalid_grant` marks the connection disconnected. */
export async function withGoogle<T>(fn: (clients: GoogleClients) => Promise<T>): Promise<T> {
  const clients = await getAuthedClient();
  try {
    return await fn(clients);
  } catch (error) {
    const mapped = mapGoogleError(error);
    if (mapped.statusCode === 409 && mapped.message === 'Reconnect Google') {
      await GoogleConnectionModel.updateMany({}, { $set: { status: 'disconnected', lastError: 'Google rejected the stored token (invalid_grant)' } });
    }
    throw mapped;
  }
}

/** Route guard: 409 unless a Google account is connected. */
export async function requireGoogle() {
  const connection = await getConnection();
  if (!connection) throw new HttpError(409, 'Google not connected');
  if (connection.status !== 'connected') throw new HttpError(409, 'Reconnect Google');
  return connection;
}
