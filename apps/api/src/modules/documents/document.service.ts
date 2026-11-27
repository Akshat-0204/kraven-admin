import { createHash } from 'node:crypto';
import type { CreateDocumentInput, DocumentFilterInput, UpdateDocumentInput } from '@kraven/validation';
import { createDocumentSchema, documentFilterSchema, updateDocumentSchema } from '@kraven/validation';
import { isValidObjectId, type HydratedDocument } from 'mongoose';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { PRESIGNED_URL_TTL_SECONDS, presignObject, putObject, streamObject } from '../files/storage.service.js';
import { htmlToPdf } from '../pdf/pdf.renderer.js';
import { loadOptionalMergeSource } from './document.context.js';
import { DocumentModel, type DocumentDocument } from './document.model.js';
import { resolveDocumentVariables, type MergeSource } from './document.variables.js';
import { extractBody, isPrintShell, mergeTemplate, wrapPrintDocument, type MergeOptions } from './merge.service.js';
import { sanitizeTemplateHtml } from './template.sanitize.js';

type DocumentRecordDoc = HydratedDocument<DocumentDocument>;

/** `{{page.number}}` / `{{page.total}}`, plain or as an editor chip (`data-variable="page.number"`). */
const PAGE_TOKEN = /\{\{\s*page\.(number|total)\s*\}\}|\bdata-variable\s*=\s*["']page\.(number|total)["']/;

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function documentPdfKey(documentId: string) {
  return `documents/${documentId}.pdf`;
}

export function documentPdfFilename(title: string) {
  return `${title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'document'}.pdf`;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** All documents (or one client's/project's), newest first, paginated; client and template are populated. */
export async function listDocuments(filters: DocumentFilterInput) {
  const parsed = documentFilterSchema.parse(filters);
  const empty = { documents: [], total: 0, page: parsed.page, limit: parsed.limit };
  const query: Record<string, unknown> = {};
  for (const key of ['client', 'project'] as const) {
    const id = parsed[key];
    if (id === undefined) continue;
    if (!isValidObjectId(id)) return empty;
    query[key] = id;
  }
  if (parsed.status) query.status = parsed.status;
  if (parsed.q) query.title = { $regex: escapeRegex(parsed.q), $options: 'i' };

  const [documents, total] = await Promise.all([
    DocumentModel.find(query)
      .select('-html -headerHtml -footerHtml')
      .populate('client', 'companyName')
      .populate('template', 'name')
      .sort({ createdAt: -1 })
      .skip((parsed.page - 1) * parsed.limit)
      .limit(parsed.limit),
    DocumentModel.countDocuments(query)
  ]);
  return { documents, total, page: parsed.page, limit: parsed.limit };
}

export async function getDocument(documentId: string) {
  const document = isValidObjectId(documentId) ? await DocumentModel.findById(documentId) : null;
  if (!document) {
    throw new HttpError(404, 'Document not found');
  }
  return document;
}

/**
 * Creates a Draft holding the template's body/header/footer *unmerged* (placeholders are resolved at
 * share). Without a template the document starts blank. Client and project are optional.
 */
export async function createDocument(input: CreateDocumentInput, userId?: string) {
  const payload = createDocumentSchema.parse(input);
  if (payload.template) {
    // Stage 3 replaces this with a Drive copy of the template Google Doc.
    throw new HttpError(501, 'Creating a document from a template is not available yet');
  }
  const template = null as { _id: unknown; name: string; version: number; html: string; headerHtml: string; footerHtml: string } | null;
  const source = await loadOptionalMergeSource(payload.client, payload.project);
  const title = payload.title ?? template?.name ?? 'Untitled document';

  const document = await DocumentModel.create({
    title,
    client: source.client?._id,
    project: source.project?._id,
    template: template?._id,
    templateVersion: template?.version,
    html: template?.html ?? '',
    headerHtml: template?.headerHtml ?? '',
    footerHtml: template?.footerHtml ?? '',
    status: 'Draft',
    createdBy: userId
  });

  const description = `Document created - ${title}`;
  if (source.client) {
    await logActivity({ entityType: 'Client', entityId: String(source.client._id), action: 'document-created', description });
  }
  if (source.project) {
    await logActivity({ entityType: 'Project', entityId: String(source.project._id), action: 'document-created', description });
  }
  return document;
}

/**
 * Edits a Draft (autosave target). HTML is sanitized and stored body-only; placeholders are not
 * validated here (that happens at share / draft PDF) so a half-typed `{{` never blocks an autosave.
 * Page tokens are rejected in the body. Changing the client drops a project that no longer belongs.
 */
export async function updateDocument(documentId: string, input: UpdateDocumentInput) {
  const payload = updateDocumentSchema.parse(input);
  const document = await getDocument(documentId);
  if (document.status !== 'Draft') {
    throw new HttpError(409, 'Only Draft documents can be edited');
  }

  if (payload.title !== undefined) document.title = payload.title;
  if (payload.html !== undefined) {
    if (PAGE_TOKEN.test(payload.html)) {
      throw new HttpError(400, 'Page numbers can only be used in the header or footer');
    }
    document.html = sanitizeTemplateHtml(payload.html);
  } else if (isPrintShell(document.html)) {
    document.html = extractBody(document.html);
  }
  if (payload.headerHtml !== undefined) document.headerHtml = sanitizeTemplateHtml(payload.headerHtml);
  if (payload.footerHtml !== undefined) document.footerHtml = sanitizeTemplateHtml(payload.footerHtml);

  if (payload.client !== undefined || payload.project !== undefined) {
    const clientId = payload.client !== undefined ? payload.client : document.client ? String(document.client) : null;
    let projectId = payload.project !== undefined ? payload.project : document.project ? String(document.project) : null;
    if (payload.project === undefined && projectId && payload.client !== undefined) {
      // The client changed: keep the project only if it belongs to the new client.
      const current = await loadOptionalMergeSource(null, projectId);
      if (!clientId || String(current.project?.client) !== String(clientId)) projectId = null;
    }
    const source = await loadOptionalMergeSource(clientId, projectId);
    document.client = source.client?._id ?? undefined;
    document.project = source.project?._id ?? undefined;
  }

  await document.save();
  return document;
}

async function documentMergeSource(document: DocumentDocument): Promise<MergeSource> {
  return loadOptionalMergeSource(
    document.client ? String(document.client) : null,
    document.project ? String(document.project) : null
  );
}

/** Registry variables resolved against the document's client/project (`value` null when missing). */
export async function getDocumentVariables(documentId: string) {
  const document = await getDocument(documentId);
  return resolveDocumentVariables(await documentMergeSource(document));
}

function mergeParts(document: DocumentDocument, source: MergeSource, options: Pick<MergeOptions, 'missing'> = {}) {
  return {
    html: mergeTemplate(extractBody(document.html), source, options),
    headerHtml: mergeTemplate(document.headerHtml ?? '', source, { ...options, allowPageTokens: true }),
    footerHtml: mergeTemplate(document.footerHtml ?? '', source, { ...options, allowPageTokens: true })
  };
}

/**
 * What the PDF is rendered from. Drafts merge live (missing values shown as `[Label]`); shared
 * documents use the stored merged HTML. Legacy full-shell documents render exactly as stored.
 * `hash` covers body, header and footer, and equals sha256(html) for legacy/no-band documents.
 */
async function pdfSource(document: DocumentDocument) {
  if (isPrintShell(document.html)) {
    return { fullHtml: document.html, headerHtml: '', footerHtml: '', hash: sha256(document.html) };
  }
  const parts =
    document.status === 'Draft'
      ? mergeParts(document, await documentMergeSource(document), { missing: 'label' })
      : { html: document.html, headerHtml: document.headerHtml ?? '', footerHtml: document.footerHtml ?? '' };
  const hash =
    parts.headerHtml || parts.footerHtml
      ? sha256(JSON.stringify([parts.html, parts.headerHtml, parts.footerHtml]))
      : sha256(parts.html);
  return {
    fullHtml: wrapPrintDocument(parts.html, document.title),
    headerHtml: parts.headerHtml,
    footerHtml: parts.footerHtml,
    hash
  };
}

/** Generates the PDF, reusing the stored one while its source (body + header + footer) is unchanged. */
export async function ensureDocumentPdf(documentId: string) {
  const document = await getDocument(documentId);
  const source = await pdfSource(document);
  if (document.pdfKey && document.pdfSourceHash === source.hash) {
    return { document, generated: false };
  }

  const pdf = await htmlToPdf(source.fullHtml, {
    document: { headerHtml: source.headerHtml, footerHtml: source.footerHtml }
  });
  const key = documentPdfKey(String(document._id));
  await putObject(key, pdf, 'application/pdf');
  document.pdfKey = key;
  document.pdfSourceHash = source.hash;
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
  if (!document.pdfKey || document.pdfSourceHash !== (await pdfSource(document)).hash) {
    throw new HttpError(404, 'PDF not generated yet');
  }
  return {
    filename: documentPdfFilename(document.title),
    stream: await streamObject(document.pdfKey)
  };
}

/**
 * Draft -> Sent for one loaded document: merges body/header/footer against its client/project,
 * stores the merged HTML (body-only), sets `mergedAt` and logs. Requires a client (422).
 * Documents already shared are left as they are. Used by share and by sending a pack.
 */
export async function markDocumentShared(document: DocumentRecordDoc) {
  if (document.status !== 'Draft') return document;
  if (!document.client) {
    throw new HttpError(422, 'Assign a client before sharing this document');
  }
  const source = await documentMergeSource(document);
  const merged = mergeParts(document, source);
  document.html = merged.html;
  document.headerHtml = merged.headerHtml;
  document.footerHtml = merged.footerHtml;
  document.mergedAt = new Date();
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
