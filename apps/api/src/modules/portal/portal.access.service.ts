import type { PortalCodeResult, PortalSettingsRecord } from '@kraven/types';
import { portalCodeSchema, portalSettingsSchema, portalSlugSchema, portalVerifySchema } from '@kraven/validation';
import { isValidObjectId } from 'mongoose';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { ClientModel } from '../clients/client.model.js';
import { checkPortalCode, generatePortalCode, hashPortalCode, normalizePortalCode } from './portal.code.js';
import { PORTAL_LOCKOUT_MS, PORTAL_MAX_FAILED_ATTEMPTS, isPortalLocked, isPortalOpen } from './portal.rules.js';
import { serializePortalSettings } from './portal.serializer.js';

const INVALID_CODE_MESSAGE = 'Invalid link or access code';

/**
 * Checks a client's portal code. Unknown slug, wrong code, missing code, disabled and expired portals
 * all fail with the same 401. A locked slug fails with 429 without checking the code.
 * After PORTAL_MAX_FAILED_ATTEMPTS wrong codes the slug is locked for 15 minutes.
 */
export async function verifyPortalCode(rawSlug: string, body: unknown, now = new Date()) {
  const { code } = portalVerifySchema.parse(body);
  const slug = portalSlugSchema.safeParse(rawSlug);

  const client = slug.success
    ? await ClientModel.findOne({ 'portalAccess.slug': slug.data }).select('+portalAccess.codeHash')
    : null;
  const access = client?.portalAccess;

  if (!client || !access) {
    await checkPortalCode(code, undefined);
    throw new HttpError(401, INVALID_CODE_MESSAGE);
  }

  if (isPortalLocked(access, now)) {
    throw new HttpError(429, 'Too many attempts. Try again later.');
  }

  const valid = await checkPortalCode(code, access.codeHash);
  if (!valid || !isPortalOpen(access, now)) {
    if (access.codeHash) await recordFailedAttempt(String(client._id), now);
    throw new HttpError(401, INVALID_CODE_MESSAGE);
  }

  await ClientModel.updateOne(
    { _id: client._id },
    {
      $set: { 'portalAccess.failedAttempts': 0, 'portalAccess.lastLoginAt': now },
      $unset: { 'portalAccess.lockedUntil': 1 }
    }
  );
  await logActivity({
    entityType: 'Client',
    entityId: String(client._id),
    action: 'portal-login',
    description: 'Client signed in to the portal'
  });

  return { clientId: String(client._id), accessVersion: access.accessVersion ?? 0 };
}

/** Atomic increment, so parallel guesses cannot skip the lock. */
async function recordFailedAttempt(clientId: string, now: Date) {
  const updated = await ClientModel.findOneAndUpdate(
    { _id: clientId },
    { $inc: { 'portalAccess.failedAttempts': 1 } },
    { new: true }
  )
    .select('portalAccess')
    .lean();

  if ((updated?.portalAccess?.failedAttempts ?? 0) >= PORTAL_MAX_FAILED_ATTEMPTS) {
    await ClientModel.updateOne(
      { _id: clientId },
      {
        $set: {
          'portalAccess.failedAttempts': 0,
          'portalAccess.lockedUntil': new Date(now.getTime() + PORTAL_LOCKOUT_MS)
        }
      }
    );
  }
}

async function loadClientPortal(clientId: string) {
  if (!isValidObjectId(clientId)) throw new HttpError(404, 'Client not found');
  const client = await ClientModel.findById(clientId).select('+portalAccess.codeHash').lean();
  if (!client) throw new HttpError(404, 'Client not found');
  return client;
}

async function settingsFor(clientId: string): Promise<PortalSettingsRecord> {
  const client = await loadClientPortal(clientId);
  return serializePortalSettings(client.portalAccess, Boolean(client.portalAccess?.codeHash));
}

export function getPortalSettings(clientId: string) {
  return settingsFor(clientId);
}

export async function updatePortalSettings(clientId: string, body: unknown) {
  const input = portalSettingsSchema.parse(body);
  const client = await loadClientPortal(clientId);

  const taken = await ClientModel.findOne({ 'portalAccess.slug': input.slug, _id: { $ne: client._id } })
    .select('_id')
    .lean();
  if (taken) throw new HttpError(409, 'This portal link is already used by another client');

  const update: Record<string, unknown> = {
    $set: {
      'portalAccess.slug': input.slug,
      'portalAccess.enabled': input.enabled,
      ...(input.expiresAt ? { 'portalAccess.expiresAt': input.expiresAt } : {})
    }
  };
  if (!input.expiresAt) update.$unset = { 'portalAccess.expiresAt': 1 };

  try {
    await ClientModel.updateOne({ _id: client._id }, update);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new HttpError(409, 'This portal link is already used by another client');
    }
    throw error;
  }

  await logActivity({
    entityType: 'Client',
    entityId: clientId,
    action: 'portal-updated',
    description: `Portal ${input.enabled ? 'enabled' : 'disabled'} at /c/${input.slug}`
  });
  return settingsFor(clientId);
}

/**
 * Sets a new access code (given or generated) and returns the plaintext once. Only the bcrypt hash
 * is stored. Bumps `accessVersion`, so existing portal sessions end, and clears any lockout.
 */
export async function setPortalCode(clientId: string, body: unknown): Promise<PortalCodeResult> {
  const input = portalCodeSchema.parse(body ?? {});
  const client = await loadClientPortal(clientId);
  if (!client.portalAccess?.slug) throw new HttpError(400, 'Set a portal link first');

  const code = normalizePortalCode(input.code ?? generatePortalCode());
  await ClientModel.updateOne(
    { _id: client._id },
    {
      $set: {
        'portalAccess.codeHash': await hashPortalCode(code),
        'portalAccess.codeUpdatedAt': new Date(),
        'portalAccess.failedAttempts': 0
      },
      $inc: { 'portalAccess.accessVersion': 1 },
      $unset: { 'portalAccess.lockedUntil': 1 }
    }
  );
  await logActivity({
    entityType: 'Client',
    entityId: clientId,
    action: 'portal-code-changed',
    description: 'Portal access code changed'
  });

  return { portal: await settingsFor(clientId), code };
}

/** Ends every portal session and removes the code; a new code must be generated to restore access. */
export async function revokePortalAccess(clientId: string) {
  const client = await loadClientPortal(clientId);
  if (!client.portalAccess) return settingsFor(clientId);

  await ClientModel.updateOne(
    { _id: client._id },
    { $inc: { 'portalAccess.accessVersion': 1 }, $unset: { 'portalAccess.codeHash': 1 } }
  );
  await logActivity({
    entityType: 'Client',
    entityId: clientId,
    action: 'portal-revoked',
    description: 'Portal access revoked'
  });
  return settingsFor(clientId);
}
