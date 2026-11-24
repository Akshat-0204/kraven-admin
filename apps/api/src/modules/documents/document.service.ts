import { createHash } from 'node:crypto';
import type { CreateDocumentInput, DocumentFilterInput } from '@kraven/validation';
import { createDocumentSchema, documentFilterSchema } from '@kraven/validation';
import { isValidObjectId } from 'mongoose';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { PRESIGNED_URL_TTL_SECONDS, presignObject, putObject, streamObject } from '../files/storage.service.js';
import { htmlToPdf } from '../pdf/gotenberg.client.js';
import { loadMergeSource } from './document.context.js';
import { DocumentModel } from './document.model.js';
import { getDocumentTemplate } from './documentTemplate.service.js';
import { renderDocumentHtml } from './merge.service.js';

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function documentPdfKey(documentId: string) {
  return `documents/${documentId}.pdf`;
}

export function documentPdfFilename(title: string) {
  return `${title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'document'}.pdf`;
}

export async function listDocuments(filters: DocumentFilterInput) {
  const parsed = documentFilterSchema.parse(filters);
  const query: Record<string, unknown> = {};
  for (const key of ['client', 'project'] as const) {
    const id = parsed[key];
    if (id === undefined) continue;
    if (!isValidObjectId(id)) return [];
    query[key] = id;
  }
  if (parsed.status) query.status = parsed.status;
  return DocumentModel.find(query).select('-html').sort({ createdAt: -1 });
}

export async function getDocument(documentId: string) {
  const document = isValidObjectId(documentId) ? await DocumentModel.findById(documentId) : null;
  if (!document) {
    throw new HttpError(404, 'Document not found');
  }
  return document;
}

/** Renders the template against the client/project now and stores that HTML as an immutable snapshot. */
export async function createDocument(input: CreateDocumentInput, userId?: string) {
  const payload = createDocumentSchema.parse(input);
  const template = await getDocumentTemplate(payload.template);
  const source = await loadMergeSource(payload.client, payload.project);
  const title = payload.title ?? `${template.name} - ${source.client.companyName}`;

  const document = await DocumentModel.create({
    title,
    client: source.client._id,
    project: payload.project,
    template: template._id,
    templateVersion: template.version,
    html: renderDocumentHtml(template.html, title, source),
    status: 'Draft',
    createdBy: userId
  });

  const description = `Document created - ${title}`;
  await logActivity({ entityType: 'Client', entityId: payload.client, action: 'document-created', description });
  if (payload.project) {
    await logActivity({ entityType: 'Project', entityId: payload.project, action: 'document-created', description });
  }
  return document;
}

/** Generates the PDF from the snapshot, reusing the stored one while the snapshot is unchanged. */
export async function ensureDocumentPdf(documentId: string) {
  const document = await getDocument(documentId);
  const sourceHash = sha256(document.html);
  if (document.pdfKey && document.pdfSourceHash === sourceHash) {
    return { document, generated: false };
  }

  const pdf = await htmlToPdf(document.html);
  const key = documentPdfKey(String(document._id));
  await putObject(key, pdf, 'application/pdf');
  document.pdfKey = key;
  document.pdfSourceHash = sourceHash;
  await document.save();
  return { document, generated: true };
}

export async function getDocumentPdfUrl(documentId: string) {
  const { document, generated } = await ensureDocumentPdf(documentId);
  return {
    url: await presignObject(document.pdfKey as string, { filename: documentPdfFilename(document.title) }),
    expiresIn: PRESIGNED_URL_TTL_SECONDS,
    generated
  };
}

/** Streams the stored PDF. Read-only: it never generates, so a missing or stale PDF is a 404. */
export async function openDocumentPdf(documentId: string) {
  const document = await getDocument(documentId);
  if (!document.pdfKey || document.pdfSourceHash !== sha256(document.html)) {
    throw new HttpError(404, 'PDF not generated yet');
  }
  return {
    filename: documentPdfFilename(document.title),
    stream: await streamObject(document.pdfKey)
  };
}

/** Shares a draft with the client portal (Draft -> Sent). Documents already shared are left as they are. */
export async function shareDocument(documentId: string) {
  const document = await getDocument(documentId);
  if (document.status === 'Draft') {
    document.status = 'Sent';
    await document.save();
    await logActivity({
      entityType: 'Client',
      entityId: String(document.client),
      action: 'document-shared',
      description: `Document shared on the portal - ${document.title}`
    });
  }
  return document;
}
