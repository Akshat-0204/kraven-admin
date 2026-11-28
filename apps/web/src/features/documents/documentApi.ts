import type {
  DocumentAccessEntry,
  DocumentCategory,
  DocumentDetailRecord,
  DocumentListResponse,
  DocumentTemplateRecord,
  DocumentVariable,
  FileMetadataRecord,
  ResolvedDocumentVariable
} from '@kraven/types';
import type { DocumentTemplateInput } from '@kraven/validation';
import { apiUrl, requestJson } from '../../lib/api';

export interface CreateDocumentInput {
  template?: string;
  client?: string;
  project?: string;
  title?: string;
  access?: DocumentAccessEntry[];
}

export interface UpdateDocumentInput {
  title?: string;
  client?: string | null;
  project?: string | null;
}

export type UpdateDocumentTemplateInput = Partial<DocumentTemplateInput>;

export type { ResolvedDocumentVariable };

export interface DocumentScope {
  client: string;
  project?: string;
}

export const documentQueryKeys = {
  templates: ['document-templates'] as const,
  template: (id: string) => ['document-templates', 'detail', id] as const,
  variables: ['document-templates', 'variables'] as const,
  documents: ['documents'] as const,
  detail: (id: string) => ['documents', 'detail', id] as const,
  documentVariables: (id: string) => ['documents', 'variables', id] as const,
  list: (scope: DocumentScope) => ['documents', 'list', scope] as const,
  search: (filters: DocumentListFilters) => ['documents', 'search', filters] as const
};

/** `GET /documents` filters for the Documents page (all clients when `client` is unset). */
export interface DocumentListFilters {
  q?: string;
  status?: string;
  client?: string;
  project?: string;
  page?: number;
  limit?: number;
}

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

export async function deleteDocumentTemplate(id: string) {
  await requestJson<unknown>(`/document-templates/${id}`, { method: 'DELETE' });
}

/** Project scope lists that project's documents; client scope lists every document for the client. */
export async function listDocuments(scope: DocumentScope) {
  const params = new URLSearchParams(scope.project ? { project: scope.project } : { client: scope.client });
  return requestJson<DocumentListResponse>(`/documents?${params.toString()}`);
}

export async function searchDocuments(filters: DocumentListFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return requestJson<DocumentListResponse>(`/documents${query ? `?${query}` : ''}`);
}

export async function createDocument(input: CreateDocumentInput) {
  return requestJson<{ document: DocumentDetailRecord }>('/documents', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export interface SaveDocumentPdfInput {
  category: DocumentCategory;
  filename: string;
  clientVisible: boolean;
}

/** Exports the Google Doc to a categorized PDF in the client's files. */
export function saveDocumentPdf(id: string, input: SaveDocumentPdfInput) {
  return requestJson<{ file: FileMetadataRecord; document: DocumentDetailRecord }>(`/documents/${id}/pdf`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

/** Draft -> Sent: snapshots a PDF, locks the Google Doc and shares it in the client portal. */
export function shareDocument(id: string) {
  return requestJson<{ document: DocumentDetailRecord }>(`/documents/${id}/share`, { method: 'POST' });
}

/** Sent/Viewed -> Draft: unlocks the Google Doc for editing. */
export function reviseDocument(id: string) {
  return requestJson<{ document: DocumentDetailRecord }>(`/documents/${id}/revise`, { method: 'POST' });
}

export function refillDocument(id: string) {
  return requestJson<{ document: DocumentDetailRecord }>(`/documents/${id}/refill`, { method: 'POST' });
}

export function setDocumentAccess(id: string, access: DocumentAccessEntry[]) {
  return requestJson<{ document: DocumentDetailRecord }>(`/documents/${id}/access`, {
    method: 'PUT',
    body: JSON.stringify({ access })
  });
}

export async function deleteDocument(id: string) {
  await requestJson<unknown>(`/documents/${id}`, { method: 'DELETE' });
}

/** Streams through the API, so it works even when object storage is not publicly reachable. */
export function documentPdfDownloadUrl(id: string) {
  return apiUrl(`/documents/${id}/pdf`);
}

export async function getDocument(id: string) {
  return requestJson<{ document: DocumentDetailRecord }>(`/documents/${id}`);
}

/** Variables resolved against the document's assigned client/project (`value` null when missing). */
export async function getDocumentVariables(id: string) {
  return requestJson<{ variables: ResolvedDocumentVariable[] }>(`/documents/${id}/variables`);
}

/** Drafts only: renames (also in Drive) and reassigns client/project. */
export async function updateDocument(id: string, input: UpdateDocumentInput) {
  return requestJson<{ document: DocumentDetailRecord }>(`/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}
