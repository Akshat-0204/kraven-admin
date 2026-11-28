import { randomUUID } from 'node:crypto';
import type {
  CreateDocumentInput,
  DocumentFilterInput,
  SaveDocumentPdfInput,
  UpdateDocumentInput
} from '@kraven/validation';
import {
  createDocumentSchema,
  documentAccessSchema,
  documentFilterSchema,
  saveDocumentPdfSchema,
  updateDocumentSchema
} from '@kraven/validation';
import { isValidObjectId, type HydratedDocument } from 'mongoose';
import { logActivity } from '../../shared/activity/activity.service.js';
import { logger } from '../../shared/logger/logger.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { UserModel } from '../auth/user.model.js';
import { ClientModel } from '../clients/client.model.js';
import { FileMetadataModel } from '../files/file.model.js';
import { putObject, streamObject } from '../files/storage.service.js';
import { replacePlaceholders } from '../google/docs.service.js';
import {
  copyFile,
  createBlankDoc,
  ensureFolder,
  exportPdf,
  getFile,
  moveToFolder,
  renameFile,
  setAccess,
  setLocked,
  trashFile,
  type DriveFile
} from '../google/drive.service.js';
import { requireGoogle } from '../google/google.client.js';
import { PackModel } from '../packs/pack.model.js';
import { loadOptionalMergeSource } from './document.context.js';
import { DocumentModel, type DocumentDocument } from './document.model.js';
import {
  buildPlaceholderMap,
  resolveDocumentVariables,
  type MergeSource
} from './document.variables.js';
import { getDocumentTemplate } from './documentTemplate.service.js';

type DocumentRecordDoc = HydratedDocument<DocumentDocument>;
type DocumentCategory = 'Proposal' | 'SOW' | 'MSA' | 'Handover' | 'Invoice' | 'Other';

const TYPE_TO_CATEGORY: Record<string, DocumentCategory> = {
  Proposal: 'Proposal',
  'Statement of Work': 'SOW',
  Contract: 'MSA',
  Agreement: 'MSA',
  Handover: 'Handover',
  Other: 'Other'
};

const EM_DASH = '—';

function isoDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** "Created on 2026-11-28 by admin - Acme Corp" (client part only when assigned). */
async function blankDocumentTitle(userId: string | undefined, companyName?: string) {
  const user =
    userId && isValidObjectId(userId)
      ? await UserModel.findById(userId).select('email').lean()
      : null;
  const author = user?.email.split('@')[0] ?? 'Kraven';
  return `Created on ${isoDay()} by ${author}` + (companyName ? ` - ${companyName}` : '');
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'document'
  );
}

export function documentPdfFilename(title: string) {
  return `${title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'document'}.pdf`;
}

export function suggestedPdfFilename(clientName: string, category: string) {
  return `${slugify(clientName)}_${slugify(category)}_${isoDay()}.pdf`;
}

/** Drive revision marker: headRevisionId when Drive provides one (not for native Docs), else modifiedTime. */
function revisionOf(file: DriveFile) {
  return file.headRevisionId ?? file.modifiedTime;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whether a Draft's saved PDF no longer matches the Google Doc. Best effort: Google errors count as not stale. */
export async function isPdfStale(document: DocumentDocument) {
  if (!document.pdfFile || !document.pdfRevisionId || document.status !== 'Draft') return false;
  try {
    return revisionOf(await getFile(document.googleFileId)) !== document.pdfRevisionId;
  } catch (error) {
    logger.warn(
      { error, documentId: document.googleFileId },
      'could not check whether the saved PDF is stale'
    );
    return false;
  }
}

/** All documents (or one client's/project's), newest first, paginated; client and template are populated. */
export async function listDocuments(filters: DocumentFilterInput) {
  const parsed = documentFilterSchema.parse(filters);
  const query: Record<string, unknown> = {};
  for (const key of ['client', 'project'] as const) {
    const id = parsed[key];
    if (id === undefined) continue;
    // An id that cannot match anything yields an empty list rather than an error.
    if (!isValidObjectId(id))
      return {
        documents: [],
        total: 0,
        page: parsed.page,
        limit: parsed.limit,
        stale: new Set<string>()
      };
    query[key] = id;
  }
  if (parsed.status) query.status = parsed.status;
  if (parsed.q) query.title = { $regex: escapeRegex(parsed.q), $options: 'i' };

  const [documents, total] = await Promise.all([
    DocumentModel.find(query)
      .populate('client', 'companyName')
      .populate('template', 'name')
      .sort({ createdAt: -1 })
      .skip((parsed.page - 1) * parsed.limit)
      .limit(parsed.limit),
    DocumentModel.countDocuments(query)
  ]);
  const staleFlags = await Promise.all(documents.map((document) => isPdfStale(document)));
  const stale = new Set(
    documents.filter((_, index) => staleFlags[index]).map((document) => String(document._id))
  );
  return { documents, total, page: parsed.page, limit: parsed.limit, stale };
}

export async function getDocument(documentId: string) {
  const document = isValidObjectId(documentId) ? await DocumentModel.findById(documentId) : null;
  if (!document) {
    throw new HttpError(404, 'Document not found');
  }
  return document;
}

async function documentMergeSource(document: DocumentDocument): Promise<MergeSource> {
  return loadOptionalMergeSource(
    document.client ? String(document.client) : null,
    document.project ? String(document.project) : null
  );
}

/** The client's Drive folder (created lazily under the root folder), or the root folder when unassigned. */
async function folderFor(
  client: { _id: unknown; companyName: string; driveFolderId?: string } | null | undefined,
  rootFolderId?: string
) {
  if (!client) return rootFolderId;
  if (client.driveFolderId) return client.driveFolderId;
  const folderId = await ensureFolder(client.companyName, rootFolderId);
  await ClientModel.updateOne({ _id: client._id }, { $set: { driveFolderId: folderId } });
  return folderId;
}

/**
 * Drive copy of the template (or a blank Google Doc), renamed, filed under the client's folder,
 * filled with client/project values and shared per `access`. The app keeps only the link.
 */
export async function createDocument(input: CreateDocumentInput, userId?: string) {
  const payload = createDocumentSchema.parse(input);
  const connection = await requireGoogle();
  const template = payload.template ? await getDocumentTemplate(payload.template) : null;
  const source = await loadOptionalMergeSource(payload.client, payload.project);
  const title =
    payload.title ??
    (template
      ? [source.client?.companyName, template.name, isoDay()].filter(Boolean).join(` ${EM_DASH} `)
      : await blankDocumentTitle(userId, source.client?.companyName));

  const folderId = await folderFor(source.client as never, connection.rootFolderId);
  const sourceFileId = template?.googleFileId ?? env.google.blankDocId;
  let file: DriveFile;
  if (sourceFileId) {
    file = await copyFile(sourceFileId, title);
    if (folderId) await moveToFolder(file.id, folderId);
  } else {
    file = await createBlankDoc(title, folderId);
  }

  if (source.client) await replacePlaceholders(file.id, buildPlaceholderMap(source));
  const access = payload.access.length > 0 ? await setAccess(file.id, payload.access) : [];

  let document: DocumentRecordDoc;
  try {
    document = await DocumentModel.create({
      title,
      type: template?.type,
      client: source.client?._id,
      project: source.project?._id,
      template: template?._id,
      googleFileId: file.id,
      webViewLink: file.webViewLink ?? `https://docs.google.com/document/d/${file.id}/edit`,
      status: 'Draft',
      access: access.map(({ email, role, permissionId }) => ({ email, role, permissionId })),
      createdBy: userId
    });
  } catch (error) {
    // The Drive copy exists but the row failed: remove it so it is not orphaned.
    await trashFile(file.id).catch((cleanupError: unknown) => {
      logger.warn({ error: cleanupError, fileId: file.id }, 'failed to trash orphaned google doc');
    });
    throw error;
  }

  const description = `Document created - ${title}`;
  if (source.client) {
    await logActivity({
      entityType: 'Client',
      entityId: String(source.client._id),
      action: 'document-created',
      description
    });
  }
  if (source.project) {
    await logActivity({
      entityType: 'Project',
      entityId: String(source.project._id),
      action: 'document-created',
      description
    });
  }
  return document;
}

function assertDraft(document: DocumentDocument, message: string) {
  if (document.status !== 'Draft') throw new HttpError(409, message);
}

/** Renames (also in Drive) and/or reassigns a Draft. Reassigning the client moves the Drive file. */
export async function updateDocument(documentId: string, input: UpdateDocumentInput) {
  const payload = updateDocumentSchema.parse(input);
  const document = await getDocument(documentId);
  assertDraft(document, 'Only Draft documents can be edited');
  const connection = await requireGoogle();

  if (payload.client !== undefined || payload.project !== undefined) {
    const clientId =
      payload.client !== undefined
        ? payload.client
        : document.client
          ? String(document.client)
          : null;
    let projectId =
      payload.project !== undefined
        ? payload.project
        : document.project
          ? String(document.project)
          : null;
    if (payload.project === undefined && projectId && payload.client !== undefined) {
      // The client changed: keep the project only if it belongs to the new client.
      const current = await loadOptionalMergeSource(null, projectId);
      if (!clientId || String(current.project?.client) !== String(clientId)) projectId = null;
    }
    const source = await loadOptionalMergeSource(clientId, projectId);
    const clientChanged = String(source.client?._id ?? '') !== String(document.client ?? '');
    document.client = source.client?._id ?? undefined;
    document.project = source.project?._id ?? undefined;
    if (clientChanged) {
      const folderId = await folderFor(source.client as never, connection.rootFolderId);
      if (folderId) await moveToFolder(document.googleFileId, folderId);
    }
  }

  if (payload.title !== undefined && payload.title !== document.title) {
    await renameFile(document.googleFileId, payload.title);
    document.title = payload.title;
  }

  await document.save();
  return document;
}

/** Re-runs the placeholder fill against the current client/project (Draft only). */
export async function refillDocument(documentId: string) {
  const document = await getDocument(documentId);
  assertDraft(document, 'Only Draft documents can be refilled');
  if (!document.client)
    throw new HttpError(422, 'Assign a client to this document before filling variables', {
      client: 'Client is required'
    });
  await requireGoogle();
  await replacePlaceholders(
    document.googleFileId,
    buildPlaceholderMap(await documentMergeSource(document))
  );
  return document;
}

/** Replaces the document's sharing list (diffed against Drive permissions). */
export async function setDocumentAccess(documentId: string, body: unknown) {
  const entries = documentAccessSchema.parse(body);
  const document = await getDocument(documentId);
  await requireGoogle();
  const result = await setAccess(document.googleFileId, entries);
  document.access = result.map(({ email, role, permissionId }) => ({
    email,
    role,
    permissionId
  })) as never;
  await document.save();
  return document;
}

/** Registry variables resolved against the document's client/project (`value` null when missing). */
export async function getDocumentVariables(documentId: string) {
  const document = await getDocument(documentId);
  return resolveDocumentVariables(await documentMergeSource(document));
}

/** Exports the Google Doc to a PDF in object storage and records it as a client file. */
async function exportToClientFile(
  document: DocumentRecordDoc,
  options: {
    category: DocumentCategory;
    filename: string;
    clientVisible: boolean;
    uploadedBy?: string;
  }
) {
  if (!document.client)
    throw new HttpError(422, 'Assign a client to this document before saving a PDF', {
      client: 'Client is required'
    });
  await requireGoogle();
  const [revision, pdf] = await Promise.all([
    getFile(document.googleFileId),
    exportPdf(document.googleFileId)
  ]);
  const clientId = String(document.client);
  const bucketKey = `clients/${clientId}/documents/${randomUUID()}.pdf`;
  await putObject(bucketKey, pdf, 'application/pdf');
  const filename = /\.pdf$/i.test(options.filename) ? options.filename : `${options.filename}.pdf`;
  const file = await FileMetadataModel.create({
    bucketKey,
    filename,
    contentType: 'application/pdf',
    length: pdf.length,
    clientVisible: options.clientVisible,
    category: options.category,
    sourceDocument: document._id,
    sourceRevisionId: revision ? revisionOf(revision) : undefined,
    associatedEntityType: 'Client',
    associatedEntityId: document.client,
    uploadedBy: options.uploadedBy
  });
  document.pdfFile = file._id as never;
  document.pdfRevisionId = file.sourceRevisionId;
  await document.save();
  return file;
}

/** "Save as PDF": export to a categorized client file (optionally visible in the portal). */
export async function saveDocumentPdf(
  documentId: string,
  input: SaveDocumentPdfInput,
  userId?: string
) {
  const payload = saveDocumentPdfSchema.parse(input);
  const document = await getDocument(documentId);
  const file = await exportToClientFile(document, { ...payload, uploadedBy: userId });
  return { file, document };
}

/** Streams the snapshot / latest PDF through the API. */
export async function openDocumentPdf(documentId: string) {
  const document = await getDocument(documentId);
  const file = document.pdfFile ? await FileMetadataModel.findById(document.pdfFile) : null;
  if (!file)
    throw new HttpError(
      404,
      'No PDF has been saved for this document yet. Use "Save as PDF" first'
    );
  return { filename: file.filename, stream: await streamObject(file.bucketKey) };
}

/**
 * Draft -> Sent for one loaded document: snapshots a PDF, locks the Google Doc read-only and logs.
 * Requires a client (422). Documents already shared are left as they are. Used by share and by sending a pack.
 */
export async function markDocumentShared(document: DocumentRecordDoc) {
  if (document.status !== 'Draft') return document;
  if (!document.client) {
    throw new HttpError(422, 'Assign a client to this document before sharing it', {
      client: 'Client is required'
    });
  }
  const client = await ClientModel.findById(document.client);
  const category = TYPE_TO_CATEGORY[document.type ?? 'Other'] ?? 'Other';
  await exportToClientFile(document, {
    category,
    filename: suggestedPdfFilename(client?.companyName ?? 'client', category),
    clientVisible: false
  });
  await setLocked(document.googleFileId, true);
  document.lockedAt = new Date();
  document.status = 'Sent';
  await document.save();
  await logActivity({
    entityType: 'Client',
    entityId: String(document.client),
    action: 'document-shared',
    description: `Document shared on the portal - ${document.title}`
  });
  return document;
}

/** Shares a draft with the client portal (Draft -> Sent). */
export async function shareDocument(documentId: string) {
  return markDocumentShared(await getDocument(documentId));
}

async function removeFromPacks(documentId: string) {
  await PackModel.updateMany(
    { 'items.document': documentId },
    { $pull: { items: { document: documentId } } }
  );
}

/** Unlocks a shared document and returns it to Draft. Signed documents cannot be revised. */
export async function reviseDocument(documentId: string) {
  const document = await getDocument(documentId);
  if (document.status === 'Signed') throw new HttpError(409, 'A signed document cannot be revised');
  if (document.status === 'Draft') return document;
  await requireGoogle();
  await setLocked(document.googleFileId, false);
  await removeFromPacks(documentId);
  document.status = 'Draft';
  document.lockedAt = undefined;
  await document.save();
  return document;
}

/** Trashes the Google Doc and removes the row (Draft only). Saved PDFs stay as client files. */
export async function deleteDocument(documentId: string) {
  const document = await getDocument(documentId);
  assertDraft(document, 'Only Draft documents can be deleted');
  await requireGoogle();
  try {
    await trashFile(document.googleFileId);
  } catch (error) {
    if (!(error instanceof HttpError && error.statusCode === 404)) throw error;
  }
  await removeFromPacks(documentId);
  await document.deleteOne();
}
