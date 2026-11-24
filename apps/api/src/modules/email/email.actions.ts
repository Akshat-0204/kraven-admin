import { isValidObjectId } from 'mongoose';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { ClientModel } from '../clients/client.model.js';
import { PackModel } from '../packs/pack.model.js';
import { portalUrl } from '../portal/portal.serializer.js';
import { packSentEmail, portalAccessEmail } from './email.templates.js';
import { sendEmail, serializeEmailLog } from './email.service.js';
import { EmailLogModel } from './emailLog.model.js';

async function loadClient(clientId: string) {
  const client = isValidObjectId(clientId) ? await ClientModel.findById(clientId) : null;
  if (!client) throw new HttpError(404, 'Client not found');
  return client;
}

function recipient(client: { email?: string }) {
  if (!client.email) throw new HttpError(400, 'Client has no email address');
  return client.email;
}

/** Portal link email. The access code is deliberately never included; the admin shares it separately. */
export async function sendPortalAccessEmail(clientId: string) {
  const client = await loadClient(clientId);
  const slug = client.portalAccess?.slug;
  if (!slug) throw new HttpError(400, 'Set a portal link first');
  const to = recipient(client);
  const mail = portalAccessEmail({ clientName: client.contactPerson || client.companyName, portalUrl: portalUrl(slug) });
  const log = await sendEmail({ to, type: 'portal-access', ...mail, client: client._id });
  await logActivity({ entityType: 'Client', entityId: clientId, action: 'email-sent', description: `Portal link emailed to ${to}` });
  return serializeEmailLog(log);
}

export async function sendPackEmail(packId: string) {
  const pack = isValidObjectId(packId) ? await PackModel.findById(packId) : null;
  if (!pack) throw new HttpError(404, 'Pack not found');
  if (pack.status !== 'Sent') throw new HttpError(409, 'Send the pack before emailing it');
  const client = await loadClient(String(pack.client));
  const slug = client.portalAccess?.slug;
  if (!slug) throw new HttpError(400, 'Client has no portal link');
  const to = recipient(client);
  const mail = packSentEmail({
    clientName: client.contactPerson || client.companyName,
    packTitle: pack.title,
    portalUrl: portalUrl(slug)
  });
  const log = await sendEmail({ to, type: 'pack-sent', ...mail, client: client._id, pack: pack._id });
  await logActivity({ entityType: 'Client', entityId: String(client._id), action: 'email-sent', description: `Pack "${pack.title}" emailed to ${to}` });
  return serializeEmailLog(log);
}

export async function listClientEmails(clientId: string) {
  if (!isValidObjectId(clientId)) return [];
  const logs = await EmailLogModel.find({ client: clientId }).sort({ createdAt: -1 }).limit(50).lean();
  return logs.map(serializeEmailLog);
}
