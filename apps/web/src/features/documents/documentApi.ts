import type {
  DocumentDetailRecord,
  DocumentPdfLink,
  DocumentRecord,
  DocumentTemplateRecord,
  DocumentVariable
} from '@kraven/types';
import type {
  CreateDocumentInput,
  DocumentContextInput,
  DocumentTemplateInput,
  UpdateDocumentTemplateInput
} from '@kraven/validation';
import { apiUrl, requestJson } from '../../lib/api';

export interface DocumentScope {
  client: string;
  project?: string;
}

export const documentQueryKeys = {
  templates: ['document-templates'] as const,
  template: (id: string) => ['document-templates', 'detail', id] as const,
  variables: ['document-templates', 'variables'] as const,
  documents: ['documents'] as const,
  list: (scope: DocumentScope) => ['documents', 'list', scope] as const
};

export async function listDocumentTemplates() {
  return requestJson<{ templates: DocumentTemplateRecord[] }>('/document-templates');
}

export async function getDocumentTemplate(id: string) {
  return requestJson<{ template: DocumentTemplateRecord }>(`/document-templates/${id}`);
}

export async function listDocumentVariables() {
  return requestJson<{ variables: DocumentVariable[] }>('/document-templates/variables');
}

export async function createDocumentTemplate(input: DocumentTemplateInput) {
  return requestJson<{ template: DocumentTemplateRecord }>('/document-templates', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateDocumentTemplate(id: string, input: UpdateDocumentTemplateInput) {
  return requestJson<{ template: DocumentTemplateRecord }>(`/document-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function previewDocumentTemplate(id: string, context: DocumentContextInput) {
  return requestJson<{ html: string }>(`/document-templates/${id}/preview`, {
    method: 'POST',
    body: JSON.stringify(context)
  });
}

/** Project scope lists that project's documents; client scope lists every document for the client. */
export async function listDocuments(scope: DocumentScope) {
  const params = new URLSearchParams(scope.project ? { project: scope.project } : { client: scope.client });
  return requestJson<{ documents: DocumentRecord[] }>(`/documents?${params.toString()}`);
}

export async function createDocument(input: CreateDocumentInput) {
  return requestJson<{ document: DocumentDetailRecord }>('/documents', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function generateDocumentPdf(id: string) {
  return requestJson<DocumentPdfLink & { generated: boolean }>(`/documents/${id}/pdf`, { method: 'POST' });
}

/** Draft -> Sent, so the document appears in the client portal. Later statuses are left alone. */
export function shareDocument(id: string) {
  return requestJson<{ document: DocumentRecord }>(`/documents/${id}/share`, { method: 'POST' });
}

/** Streams through the API, so it works even when object storage is not publicly reachable. */
export function documentPdfDownloadUrl(id: string) {
  return apiUrl(`/documents/${id}/pdf`);
}
