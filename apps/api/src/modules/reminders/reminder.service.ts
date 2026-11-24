import { env } from '../../config/env.js';
import { logger } from '../../shared/logger/logger.js';
import { ClientModel } from '../clients/client.model.js';
import { reminderEmail } from '../email/email.templates.js';
import { sendEmail } from '../email/email.service.js';
import { DocumentModel } from '../documents/document.model.js';
import { InvoiceModel } from '../finance/invoice.model.js';
import { PackModel } from '../packs/pack.model.js';
import { portalUrl } from '../portal/portal.serializer.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** At most one reminder per item in this window. */
export const REMINDER_THROTTLE_MS = 3 * DAY_MS;

const throttled = (last: Date | undefined, now: Date) => Boolean(last && now.getTime() - new Date(last).getTime() < REMINDER_THROTTLE_MS);

export interface ReminderTarget {
  client: string;
  lines: string[];
  /** Marks the items as reminded; call after the email has been attempted. */
  mark: () => Promise<void>;
}

/** Finds what to remind about, grouped per client. Read-only until `mark` is called. */
export async function collectReminders(now = new Date(), afterDays = env.reminderAfterDays): Promise<ReminderTarget[]> {
  const cutoff = new Date(now.getTime() - afterDays * DAY_MS);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const groups = new Map<string, { lines: string[]; marks: Array<() => Promise<unknown>> }>();
  const group = (client: string) => {
    const entry = groups.get(client) ?? { lines: [], marks: [] };
    groups.set(client, entry);
    return entry;
  };

  const packs = (await PackModel.find({ status: 'Sent' })).filter(
    (pack) => pack.sentAt && new Date(pack.sentAt) <= cutoff && !(pack.expiresAt && new Date(pack.expiresAt) <= now)
  );
  const docIds = packs.flatMap((pack) => pack.items.filter((item) => item.document).map((item) => item.document));
  const docs = docIds.length ? await DocumentModel.find({ _id: { $in: docIds } }) : [];
  const docById = new Map(docs.map((doc) => [String(doc._id), doc]));

  for (const pack of packs) {
    const due = pack.items.filter((item) => {
      if (throttled(item.lastRemindedAt, now)) return false;
      if (item.kind === 'document') {
        const doc = item.document ? docById.get(String(item.document)) : undefined;
        return Boolean(doc) && doc?.status !== 'Signed';
      }
      return item.kind === 'payment' && item.paymentStatus !== 'Paid';
    });
    if (due.length === 0) continue;
    const entry = group(String(pack.client));
    for (const item of due) {
      entry.lines.push(
        item.kind === 'document'
          ? `Please review and sign "${docById.get(String(item.document))?.title ?? 'document'}" (${pack.title})`
          : `Payment pending: ${item.label ?? 'payment'}${item.amount ? ` (${item.amount})` : ''} (${pack.title})`
      );
    }
    entry.marks.push(async () => {
      for (const item of due) item.lastRemindedAt = now;
      await pack.save();
    });
  }

  const invoices = (await InvoiceModel.find({ remainingAmount: { $gt: 0 }, dueDate: { $lt: startOfToday } })).filter(
    (invoice) => !throttled((invoice as { lastRemindedAt?: Date }).lastRemindedAt, now)
  );
  for (const invoice of invoices) {
    const entry = group(String(invoice.client));
    entry.lines.push(`Invoice ${invoice.invoiceNumber} is overdue (balance ${invoice.remainingAmount})`);
    entry.marks.push(async () => {
      invoice.lastRemindedAt = now;
      await invoice.save();
    });
  }

  return [...groups].map(([client, entry]) => ({
    client,
    lines: entry.lines,
    mark: async () => {
      for (const mark of entry.marks) await mark();
    }
  }));
}

/** Emails one reminder per client with everything due; items are marked so they are not repeated for 3 days. */
export async function runReminders(now = new Date()) {
  const targets = await collectReminders(now);
  let sent = 0;
  for (const target of targets) {
    const client = await ClientModel.findById(target.client);
    if (!client?.email) continue;
    const slug = client.portalAccess?.slug;
    const mail = reminderEmail({
      clientName: client.contactPerson || client.companyName,
      lines: target.lines,
      portalUrl: slug && client.portalAccess?.enabled ? portalUrl(slug) : undefined
    });
    await sendEmail({ to: client.email, type: 'reminder', ...mail, client: client._id });
    await target.mark();
    sent += 1;
  }
  logger.info({ clients: targets.length, sent }, 'reminder run finished');
  return { sent };
}
