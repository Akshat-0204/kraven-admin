import type { DocumentDetailRecord, DocumentRecord, DocumentTemplateRecord } from '@kraven/types';
import type { DocumentDocument } from './document.model.js';
import type { DocumentTemplateDocument } from './documentTemplate.model.js';

export function serializeDocumentTemplate(template: DocumentTemplateDocument & { _id: unknown }): DocumentTemplateRecord {
  return {
    id: String(template._id),
    name: template.name,
    type: template.type,
    html: template.html,
    variables: template.variables,
    version: template.version,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString()
  };
}

export function serializeDocument(document: DocumentDocument & { _id: unknown }): DocumentRecord {
  return {
    id: String(document._id),
    title: document.title,
    client: String(document.client),
    project: document.project ? String(document.project) : undefined,
    template: String(document.template),
    templateVersion: document.templateVersion,
    status: document.status,
    hasPdf: Boolean(document.pdfKey),
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

export function serializeDocumentDetail(document: DocumentDocument & { _id: unknown }): DocumentDetailRecord {
  return { ...serializeDocument(document), html: document.html };
}
