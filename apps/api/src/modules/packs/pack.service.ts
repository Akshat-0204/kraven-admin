import type { PackItemRecord, PackRecord, PortalPackRecord } from '@kraven/types';
import { packPaymentStatusSchema, packSchema, updatePackSchema, type PackInput } from '@kraven/validation';
import { isValidObjectId } from 'mongoose';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { DocumentModel } from '../documents/document.model.js';
import { markDocumentShared } from '../documents/document.service.js';
import { FileMetadataModel } from '../files/file.model.js';
import { PayeeProfileModel } from '../payees/payeeProfile.model.js';
import { createPayeeResolver } from '../payees/payeeProfile.service.js';
import { ProjectModel } from '../projects/project.model.js';
import { PackModel, type PackDocument, type PackItemDocument } from './pack.model.js';
import { SignatureModel } from './signature.model.js';

type PackRow = PackDocument & { _id: unknown };

const iso = (value?: Date) => (value ? new Date(value).toISOString() : undefined);

async function loadPack(id: string) {
  const pack = isValidObjectId(id) ? await PackModel.findById(id) : null;
  if (!pack) throw new HttpError(404, 'Pack not found');
  return pack;
}

/** Display data (titles, statuses) for the items' referenced documents and files. */
async function lookups(packs: PackRow[]) {
  const items = packs.flatMap((pack) => pack.items);
  const docIds = items.filter((item) => item.document).map((item) => item.document);
  const fileIds = items.filter((item) => item.file).map((item) => item.file);
  const [docs, files] = await Promise.all([
    docIds.length ? DocumentModel.find({ _id: { $in: docIds } }).select('title status').lean() : [],
    fileIds.length ? FileMetadataModel.find({ _id: { $in: fileIds } }).select('filename').lean() : []
  ]);
  return {
    docs: new Map(docs.map((doc) => [String(doc._id), doc])),
    files: new Map(files.map((file) => [String(file._id), file]))
  };
}

function serializeItem(item: PackItemDocument, data: Awaited<ReturnType<typeof lookups>>): PackItemRecord {
  const doc = item.document ? data.docs.get(String(item.document)) : undefined;
  const file = item.file ? data.files.get(String(item.file)) : undefined;
  return {
    id: String(item._id),
    kind: item.kind,
    document: item.document ? String(item.document) : undefined,
    file: item.file ? String(item.file) : undefined,
    title: doc?.title ?? file?.filename ?? item.label ?? '',
    documentStatus: doc?.status,
    amount: item.amount,
    reference: item.reference,
    paymentStatus: item.paymentStatus
  };
}

async function serializePacks(packs: PackRow[]): Promise<PackRecord[]> {
  const data = await lookups(packs);
  return packs.map((pack) => ({
    id: String(pack._id),
    client: String(pack.client),
    project: pack.project ? String(pack.project) : undefined,
    title: pack.title,
    status: pack.status,
    items: pack.items.map((item) => serializeItem(item, data)),
    expiresAt: iso(pack.expiresAt),
    sentAt: iso(pack.sentAt),
    createdAt: new Date(pack.createdAt).toISOString()
  }));
}

/** Documents and files in a pack must belong to the pack's client (directly or via its projects). */
async function assertItemsBelongToClient(clientId: string, items: PackInput['items']) {
  const docIds = items.flatMap((item) => (item.kind === 'document' ? [item.document] : []));
  const fileIds = items.flatMap((item) => (item.kind === 'file' ? [item.file] : []));
  if ([...docIds, ...fileIds].some((id) => !isValidObjectId(id))) throw new HttpError(400, 'One or more pack items reference an id that is not valid', { items: 'Remove the invalid document or file and pick it again' });

  if (docIds.length) {
    const found = await DocumentModel.find({ _id: { $in: docIds }, client: clientId }).select('_id').lean();
    if (found.length !== new Set(docIds).size) throw new HttpError(400, 'Document does not belong to this client');
  }
  if (fileIds.length) {
    const projectIds = (await ProjectModel.find({ client: clientId }).select('_id').lean()).map((project) => project._id);
    const found = await FileMetadataModel.find({
      _id: { $in: fileIds },
      $or: [
        { associatedEntityType: 'Client', associatedEntityId: clientId },
        { associatedEntityType: 'Project', associatedEntityId: { $in: projectIds } }
      ]
    })
      .select('_id')
      .lean();
    if (found.length !== new Set(fileIds).size) throw new HttpError(400, 'File does not belong to this client');
  }
}

function toItemDocuments(items: PackInput['items']) {
  return items.map((item) =>
    item.kind === 'document'
      ? { kind: 'document' as const, document: item.document }
      : item.kind === 'file'
        ? { kind: 'file' as const, file: item.file }
        : { kind: 'payment' as const, label: item.label, amount: item.amount, reference: item.reference, paymentStatus: 'Pending' as const }
  );
}

export async function listPacks(clientId?: string) {
  if (!clientId) throw new HttpError(400, 'Choose a client to list packs for', { client: 'Client is required' });
  if (!isValidObjectId(clientId)) throw new HttpError(400, 'That client id is not valid', { client: 'Not a valid client id' });
  return serializePacks(await PackModel.find({ client: clientId }).sort({ createdAt: -1 }).limit(100).lean());
}

export async function createPack(body: unknown, userId?: string) {
  const input = packSchema.parse(body);
  await assertItemsBelongToClient(input.client, input.items);
  const pack = await PackModel.create({
    client: input.client,
    project: input.project,
    title: input.title,
    items: toItemDocuments(input.items),
    expiresAt: input.expiresAt ?? undefined,
    createdBy: userId
  });
  return (await serializePacks([pack]))[0];
}

export async function updatePack(id: string, body: unknown) {
  const input = updatePackSchema.parse(body);
  const pack = await loadPack(id);
  if (input.title !== undefined) pack.title = input.title;
  if (input.project !== undefined) pack.project = input.project as never;
  if (input.expiresAt !== undefined) pack.expiresAt = input.expiresAt ?? undefined;
  if (input.items !== undefined) {
    if (pack.status !== 'Draft') throw new HttpError(409, 'Items can only be changed while the pack is a draft');
    await assertItemsBelongToClient(String(pack.client), input.items);
    pack.items = toItemDocuments(input.items) as never;
  }
  await pack.save();
  return (await serializePacks([pack]))[0];
}

export async function deletePack(id: string) {
  const pack = await loadPack(id);
  await pack.deleteOne();
}

/** Sends the pack to the portal: Draft -> Sent, and its draft documents become Sent too. */
export async function sendPack(id: string) {
  const pack = await loadPack(id);
  if (pack.status === 'Closed') throw new HttpError(409, 'A closed pack cannot be sent');
  if (pack.items.length === 0) throw new HttpError(400, 'Add at least one item before sending');

  const clientId = String(pack.client);
  for (const item of pack.items.filter((entry) => entry.document)) {
    const document = await DocumentModel.findOne({ _id: item.document, client: clientId });
    if (!document) {
      throw new HttpError(409, 'A document in this pack no longer exists or belongs to another client. Remove it and try again');
    }
    // Merges variables, sets mergedAt and logs, exactly like sharing a single document.
    if (document.status === 'Draft') await markDocumentShared(document);
  }

  if (pack.status === 'Draft') {
    pack.status = 'Sent';
    pack.sentAt = new Date();
    await pack.save();
    await logActivity({ entityType: 'Client', entityId: clientId, action: 'pack-sent', description: `Pack sent - ${pack.title}` });
  }
  return (await serializePacks([pack]))[0];
}

const NEXT_PAYMENT_STATUS = { Pending: 'Sent', Sent: 'Paid' } as const;

/** Admin-only payment item status: Pending -> Sent -> Paid, one step at a time, each logged. */
export async function setPaymentItemStatus(packId: string, itemId: string, body: unknown) {
  const { status } = packPaymentStatusSchema.parse(body);
  const pack = await loadPack(packId);
  const item = pack.items.find((entry) => String(entry._id) === itemId);
  if (!item || item.kind !== 'payment') throw new HttpError(404, 'Payment item not found');

  const current = item.paymentStatus ?? 'Pending';
  if (NEXT_PAYMENT_STATUS[current as keyof typeof NEXT_PAYMENT_STATUS] !== status) {
    throw new HttpError(409, `Cannot move a payment from ${current} to ${status}`);
  }
  item.paymentStatus = status;
  await pack.save();
  await logActivity({
    entityType: 'Client',
    entityId: String(pack.client),
    action: 'pack-payment-status',
    description: `Payment "${item.label}" ${current} -> ${status} (pack ${pack.title})`
  });
  return (await serializePacks([pack]))[0];
}

export async function getDocumentSignature(documentId: string) {
  if (!isValidObjectId(documentId)) throw new HttpError(404, 'Document not found');
  const signature = await SignatureModel.findOne({ document: documentId }).lean();
  if (!signature) throw new HttpError(404, 'This document has not been signed yet');
  return {
    id: String(signature._id),
    document: String(signature.document),
    signerName: signature.signerName,
    method: signature.method,
    signedAt: new Date(signature.signedAt).toISOString(),
    ip: signature.ip,
    userAgent: signature.userAgent,
    originalSha256: signature.originalSha256,
    sealedSha256: signature.sealedSha256
  };
}

// ---- Portal (always scoped to the cookie's client) ----

const isLive = (pack: PackRow) => pack.status === 'Sent' && !(pack.expiresAt && new Date(pack.expiresAt).getTime() <= Date.now());

/** Live (sent, unexpired) packs of one client. */
export async function livePacksForClient(clientId: string) {
  const packs = await PackModel.find({ client: clientId, status: 'Sent' }).sort({ sentAt: -1 }).limit(100).lean();
  return packs.filter(isLive);
}

export async function listPortalPacks(clientId: string): Promise<PortalPackRecord[]> {
  const packs = await livePacksForClient(clientId);
  const [data, payees, signatures] = await Promise.all([
    lookups(packs),
    PayeeProfileModel.find().limit(50).lean(),
    SignatureModel.find({ client: clientId }).lean()
  ]);
  const payee = createPayeeResolver(payees)(undefined);
  const signedAt = new Map(signatures.map((signature) => [String(signature.document), iso(signature.signedAt)]));

  return packs.map((pack) => ({
    id: String(pack._id),
    title: pack.title,
    sentAt: iso(pack.sentAt),
    expiresAt: iso(pack.expiresAt),
    items: pack.items.map((item) => ({
      ...serializeItem(item, data),
      ...(item.kind === 'payment' ? { payee } : {}),
      signedAt: item.document ? signedAt.get(String(item.document)) : undefined
    }))
  }));
}

/** True when the document is in one of the client's live packs. */
export async function documentInLivePack(clientId: string, documentId: string) {
  const packs = await livePacksForClient(clientId);
  return packs.some((pack) => pack.items.some((item) => item.document && String(item.document) === documentId));
}

export async function fileInLivePack(clientId: string, fileId: string) {
  const packs = await livePacksForClient(clientId);
  return packs.some((pack) => pack.items.some((item) => item.file && String(item.file) === fileId));
}

export async function findPortalPaymentItem(clientId: string, packId: string, itemId: string) {
  const pack = (await livePacksForClient(clientId)).find((entry) => String(entry._id) === packId);
  const item = pack?.items.find((entry) => String(entry._id) === itemId && entry.kind === 'payment');
  if (!pack || !item) throw new HttpError(404, 'Payment item not found');
  return { pack, item };
}
