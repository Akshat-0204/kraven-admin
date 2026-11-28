import { createHmac, timingSafeEqual } from 'node:crypto';
import express, { Router } from 'express';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { logger } from '../../shared/logger/logger.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { EmailLogModel, EMAIL_STATUSES } from './emailLog.model.js';

const TOLERANCE_SECONDS = 5 * 60;

/** Verifies a Svix-signed webhook (the scheme Resend uses). */
export function verifySvixSignature(
  secret: string,
  headers: { id?: string; timestamp?: string; signature?: string },
  rawBody: string,
  nowSeconds = Math.floor(Date.now() / 1000)
) {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;
  const timestamp = Number(headers.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${headers.id}.${headers.timestamp}.${rawBody}`).digest();

  return headers.signature.split(' ').some((part) => {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig) return false;
    const given = Buffer.from(sig, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

type Status = (typeof EMAIL_STATUSES)[number];
const EVENT_STATUS: Record<string, Status> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.bounced': 'bounced',
  'email.complained': 'bounced',
  'email.failed': 'failed'
};
// Events can arrive out of order; never move backwards (bounced/failed are terminal).
const RANK: Record<Status, number> = { queued: 0, sent: 1, delivered: 2, opened: 3, bounced: 4, failed: 4 };

export const resendWebhookRoutes = Router();

resendWebhookRoutes.post(
  '/',
  express.raw({ type: '*/*', limit: '100kb' }),
  asyncHandler(async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    const valid = verifySvixSignature(
      env.resendWebhookSecret,
      { id: req.get('svix-id'), timestamp: req.get('svix-timestamp'), signature: req.get('svix-signature') },
      rawBody
    );
    if (!valid) {
      throw new HttpError(401, 'Webhook signature is missing, invalid or expired');
    }

    let event: { type?: string; data?: { email_id?: string } };
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      event = parsed;
    } catch {
      throw new HttpError(400, 'Webhook body must be a JSON object');
    }

    const status = event.type ? EVENT_STATUS[event.type] : undefined;
    const resendId = event.data?.email_id;
    if (status && resendId) {
      const log = await EmailLogModel.findOne({ resendId });
      if (!log) logger.debug({ resendId, type: event.type }, 'resend webhook for unknown email');
      if (log && RANK[status] > RANK[log.status]) {
        log.status = status;
        if (status === 'delivered') log.deliveredAt = new Date();
        if (status === 'opened') log.openedAt = new Date();
        await log.save();
      }
    }
    res.json({ ok: true });
  })
);
