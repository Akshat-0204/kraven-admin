import type { DocumentDetailRecord, DocumentListItem, DocumentRecord, DocumentTemplateRecord } from '@kraven/types';
import { Types } from 'mongoose';
import type { DocumentDocument } from './document.model.js';
import type { DocumentTemplateDocument } from './documentTemplate.model.js';
import { extractBody } from './merge.service.js';

export function serializeDocumentTemplate(template: DocumentTemplateDocument & { _id: unknown }): DocumentTemplateRecord {
  return {
    id: String(template._id),
    name: template.name,
    type: template.type,
    html: template.html,
    headerHtml: template.headerHtml ?? '',
    footerHtml: template.footerHtml ?? '',
    variables: template.variables,
    version: template.version,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString()
  };
}

/** Id of a ref that may or may not be populated. */
function refId(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Types.ObjectId) return String(value);
  if (typeof value === 'object' && '_id' in value) return String((value as { _id: unknown })._id);
  return String(value);
}

function baseFields(document: DocumentDocument & { _id: unknown }) {
  return {
    id: String(document._id),
    title: document.title,
    project: refId(document.project),
    templateVersion: document.templateVersion,
    status: document.status,
    hasPdf: Boolean(document.pdfKey),
    mergedAt: document.mergedAt ? document.mergedAt.toISOString() : undefined,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

export function serializeDocument(document: DocumentDocument & { _id: unknown }): DocumentRecord {
  return { ...baseFields(document), client: refId(document.client), template: refId(document.template) };
}

/** List item: `client` / `template` populated by `listDocuments` (null when unset or deleted). */
export function serializeDocumentListItem(document: DocumentDocument & { _id: unknown }): DocumentListItem {
  const client = document.client as unknown as { _id: unknown; companyName?: string } | undefined | null;
  const template = document.template as unknown as { _id: unknown; name?: string } | undefined | null;
  return {
    ...baseFields(document),
    client: client && typeof client === 'object' && 'companyName' in client
      ? { _id: String(client._id), companyName: client.companyName ?? '' }
      : null,
    template: template && typeof template === 'object' && 'name' in template
      ? { _id: String(template._id), name: template.name ?? '' }
      : null
  };
}

/** Detail: `html` is always body-only (legacy full print shells are unwrapped). */
export function serializeDocumentDetail(document: DocumentDocument & { _id: unknown }): DocumentDetailRecord {
  return {
    ...serializeDocument(document),
    html: extractBody(document.html ?? ''),
    headerHtml: document.headerHtml ?? '',
    footerHtml: document.footerHtml ?? ''
  };
}
