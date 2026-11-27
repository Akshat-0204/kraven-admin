import type {
  DocumentDetailRecord,
  DocumentListResponse,
  DocumentPdfLink,
  DocumentRecord,
  DocumentTemplateRecord,
  DocumentVariable,
  ResolvedDocumentVariable
} from '@kraven/types';
import type { DocumentTemplateInput } from '@kraven/validation';
import { apiUrl, requestJson } from '../../lib/api';

/*
 * Editor-facing shapes from docs/plans/document-editor-contract.md. Declared locally (structurally compatible
 * with the shared @kraven/types records) so the editor does not depend on when the shared packages catch up.
 */
export interface CreateDocumentInput {
  template?: string;
  client?: string;
  project?: string;
  title?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  html?: string;
  headerHtml?: string;
  footerHtml?: string;
  client?: string | null;
  project?: string | null;
}

export type UpdateDocumentTemplateInput = Partial<DocumentTemplateInput>;

/** A ref the API may return either as an id or populated. */
export type EditorRef = string | { _id?: string; id?: string; companyName?: string; projectName?: string; name?: string };

export type EditorDocument = Omit<DocumentDetailRecord, 'client' | 'project' | 'template' | 'templateVersion'> & {
  client?: EditorRef | null;
  project?: EditorRef | null;
  template?: EditorRef | null;
  templateVersion?: number;
  headerHtml?: string;
  footerHtml?: string;
  mergedAt?: string | null;
};

export type EditorTemplate = DocumentTemplateRecord;

export type { ResolvedDocumentVariable };

export function refId(ref: EditorRef | null | undefined): string | undefined {
  if (!ref) return undefined;
  return typeof ref === 'string' ? ref : (ref._id ?? ref.id);
}

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
  return requestJson<{ template: EditorTemplate }>(`/document-templates/${id}`);
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
  return requestJson<{ template: EditorTemplate }>(`/document-templates/${id}`, {
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
  return requestJson<{ document: EditorDocument }>('/documents', {
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

export async function getDocument(id: string) {
  return requestJson<{ document: EditorDocument }>(`/documents/${id}`);
}

/** Variables resolved against the document's assigned client/project (`value` null when missing). */
export async function getDocumentVariables(id: string) {
  return requestJson<{ variables: ResolvedDocumentVariable[] }>(`/documents/${id}/variables`);
}

/** Drafts only. `html` is the document body, not the full print shell. */
export async function updateDocument(id: string, input: UpdateDocumentInput) {
  return requestJson<{ document: EditorDocument }>(`/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}
