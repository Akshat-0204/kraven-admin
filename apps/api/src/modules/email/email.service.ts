import { Resend } from 'resend';
import type { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger/logger.js';
import { EmailLogModel, type EmailLogDocument } from './emailLog.model.js';

export interface SendEmailInput {
  to: string;
  type: EmailLogDocument['type'];
  subject: string;
  html: string;
  client?: string | Types.ObjectId;
  pack?: string | Types.ObjectId;
}

let resend: Resend | undefined;
const getResend = () => (resend ??= new Resend(env.resendApiKey));

/**
 * Sends one email and records it in EmailLog. With no RESEND_API_KEY it only logs (the entry stays
 * `queued`), so dev and tests never hit the network. Provider failures are logged as `failed`, not thrown.
 */
export async function sendEmail(input: SendEmailInput) {
  const log = await EmailLogModel.create({
    to: input.to,
    type: input.type,
    subject: input.subject,
    client: input.client,
    pack: input.pack,
    status: 'queued'
  });

  if (!env.resendApiKey) {
    logger.info({ to: input.to, subject: input.subject, type: input.type }, 'email not sent: RESEND_API_KEY unset');
    return log;
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: env.emailFrom,
      to: input.to,
      subject: input.subject,
      html: input.html
    });
    if (error || !data) throw new Error(error?.message ?? 'Resend returned no id');
    log.resendId = data.id;
    log.status = 'sent';
    log.sentAt = new Date();
  } catch (error) {
    logger.warn({ error, to: input.to }, 'email send failed');
    log.status = 'failed';
    log.error = error instanceof Error ? error.message : 'Send failed';
  }
  await log.save();
  return log;
}

export function serializeEmailLog(log: EmailLogDocument & { _id: unknown }) {
  return {
    id: String(log._id),
    to: log.to,
    type: log.type,
    subject: log.subject,
    client: log.client ? String(log.client) : undefined,
    pack: log.pack ? String(log.pack) : undefined,
    status: log.status,
    error: log.error,
    createdAt: new Date(log.createdAt).toISOString()
  };
}
