import type {
  DocumentCategory,
  FileMetadataRecord,
  PayeeProfileRecord,
  PortalCodeResult,
  PortalDocumentRecord,
  PortalFileRecord,
  PortalOverview,
  EmailLogRecord,
  PackRecord,
  PortalPackItem,
  PortalPackRecord,
  PortalPaymentRecord,
  SignatureRecord,
  PortalSettingsRecord,
  PortalUpdateRecord,
  ProjectUpdateRecord
} from '@kraven/types';
import type { PayeeProfileInput, ProjectUpdateInput, UpdateProjectUpdateInput } from '@kraven/validation';
import { apiUrl, requestJson } from '../../lib/api';

/** Error with the HTTP status, so the portal can tell "needs code" (401) from "locked" (429). */
export class PortalRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function portalRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(`/public/portal${path}`), {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new PortalRequestError(body.message ?? 'Request failed', response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type PortalMe = PortalOverview & { slug?: string };

export const portalQueryKeys = {
  all: ['portal'] as const,
  me: ['portal', 'me'] as const,
  section: (name: string) => ['portal', name] as const
};

export const portalApi = {
  verify: (slug: string, code: string) =>
    portalRequest<{ ok: true }>(`/${encodeURIComponent(slug)}/verify`, { method: 'POST', body: JSON.stringify({ code }) }),
  logout: () => portalRequest<void>('/logout', { method: 'POST' }),
  me: () => portalRequest<PortalMe>('/me'),
  updates: () => portalRequest<{ updates: PortalUpdateRecord[] }>('/updates'),
  documents: () => portalRequest<{ documents: PortalDocumentRecord[] }>('/documents'),
  payments: () => portalRequest<{ payments: PortalPaymentRecord[] }>('/payments'),
  packs: () => portalRequest<{ packs: PortalPackRecord[] }>('/packs'),
  packPayment: (packId: string, itemId: string) =>
    portalRequest<{ item: PortalPackItem }>(`/packs/${packId}/items/${itemId}/payment`),
  packFileUrl: (id: string) => portalRequest<{ url: string; expiresIn: number }>(`/packs/files/${id}/url`),
  sign: (documentId: string, input: { signerName: string; method: 'typed' | 'drawn'; signatureImage?: string; consent: boolean }) =>
    portalRequest<{ id: string; status: 'Signed'; signedAt: string }>(`/documents/${documentId}/sign`, {
      method: 'POST',
      body: JSON.stringify(input)
    }),
  downloads: () => portalRequest<{ downloads: PortalFileRecord[] }>('/downloads'),
  downloadUrl: (id: string) => portalRequest<{ url: string; expiresIn: number }>(`/downloads/${id}/url`)
};

/** Streams through the API with the portal cookie; opening it marks a Sent document as Viewed. */
export function portalDocumentPdfUrl(id: string) {
  return apiUrl(`/public/portal/documents/${id}/pdf`);
}

export function portalSignedPdfUrl(id: string) {
  return apiUrl(`/public/portal/documents/${id}/signed.pdf`);
}

// ---- Admin (session) API ----

export const portalAdminQueryKeys = {
  settings: (clientId: string) => ['clients', clientId, 'portal'] as const,
  projectUpdates: (projectId: string) => ['project-updates', projectId] as const,
  files: (entityType: string, entityId: string) => ['files', entityType, entityId] as const,
  payees: ['payee-profiles'] as const
};

export function getPortalSettings(clientId: string) {
  return requestJson<{ portal: PortalSettingsRecord }>(`/clients/${clientId}/portal`);
}

/** `expiresAt` is a date string; '' or null clears it. */
export function savePortalSettings(clientId: string, input: { slug: string; enabled: boolean; expiresAt?: string | null }) {
  return requestJson<{ portal: PortalSettingsRecord }>(`/clients/${clientId}/portal`, {
    method: 'PUT',
    body: JSON.stringify(input)
  });
}

export function setPortalCode(clientId: string, code?: string) {
  return requestJson<PortalCodeResult>(`/clients/${clientId}/portal/code`, {
    method: 'POST',
    body: JSON.stringify(code ? { code } : {})
  });
}

export function revokePortal(clientId: string) {
  return requestJson<{ portal: PortalSettingsRecord }>(`/clients/${clientId}/portal/revoke`, { method: 'POST' });
}

export function listProjectUpdates(projectId: string) {
  return requestJson<{ updates: ProjectUpdateRecord[] }>(`/project-updates?project=${encodeURIComponent(projectId)}`);
}

export function createProjectUpdate(input: ProjectUpdateInput) {
  return requestJson<{ update: ProjectUpdateRecord }>('/project-updates', { method: 'POST', body: JSON.stringify(input) });
}

export function updateProjectUpdate(id: string, input: UpdateProjectUpdateInput) {
  return requestJson<{ update: ProjectUpdateRecord }>(`/project-updates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export function deleteProjectUpdate(id: string) {
  return requestJson<void>(`/project-updates/${id}`, { method: 'DELETE' });
}

export function listEntityFiles(entityType: 'Client' | 'Project', entityId: string) {
  const params = new URLSearchParams({ associatedEntityType: entityType, associatedEntityId: entityId });
  return requestJson<{ files: FileMetadataRecord[] }>(`/files?${params.toString()}`);
}

export function updateFile(id: string, input: { clientVisible?: boolean; filename?: string; category?: DocumentCategory }) {
  return requestJson<{ file: FileMetadataRecord }>(`/files/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export function listPayeeProfiles() {
  return requestJson<{ payeeProfiles: PayeeProfileRecord[] }>('/payee-profiles');
}

export function createPayeeProfile(input: PayeeProfileInput) {
  return requestJson<{ payeeProfile: PayeeProfileRecord }>('/payee-profiles', { method: 'POST', body: JSON.stringify(input) });
}

export function updatePayeeProfile(id: string, input: Partial<PayeeProfileInput>) {
  return requestJson<{ payeeProfile: PayeeProfileRecord }>(`/payee-profiles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export function deletePayeeProfile(id: string) {
  return requestJson<void>(`/payee-profiles/${id}`, { method: 'DELETE' });
}

export const packQueryKeys = {
  list: (clientId: string) => ['packs', clientId] as const,
  signature: (documentId: string) => ['signature', documentId] as const
};

export function listPacks(clientId: string) {
  return requestJson<{ packs: PackRecord[] }>(`/packs?client=${encodeURIComponent(clientId)}`);
}

export type PackInputBody = {
  client: string;
  title: string;
  expiresAt?: string | null;
  items: (
    | { kind: 'document'; document: string }
    | { kind: 'file'; file: string }
    | { kind: 'payment'; label: string; amount: number; reference?: string }
  )[];
};

export function createPack(input: PackInputBody) {
  return requestJson<{ pack: PackRecord }>('/packs', { method: 'POST', body: JSON.stringify(input) });
}

export function sendPack(id: string, email = false) {
  return requestJson<{ pack: PackRecord; email?: EmailLogRecord; emailError?: string }>(`/packs/${id}/send`, {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export function emailPack(id: string) {
  return requestJson<{ email: EmailLogRecord }>(`/packs/${id}/email`, { method: 'POST' });
}

export const emailQueryKeys = { client: (clientId: string) => ['emails', clientId] as const };

export function listClientEmails(clientId: string) {
  return requestJson<{ emails: EmailLogRecord[] }>(`/clients/${clientId}/emails`);
}

export function sendPortalEmail(clientId: string) {
  return requestJson<{ email: EmailLogRecord }>(`/clients/${clientId}/emails/portal`, { method: 'POST' });
}

export function deletePack(id: string) {
  return requestJson<void>(`/packs/${id}`, { method: 'DELETE' });
}

export function setPackPaymentStatus(packId: string, itemId: string, status: 'Sent' | 'Paid') {
  return requestJson<{ pack: PackRecord }>(`/packs/${packId}/items/${itemId}/payment-status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export function getDocumentSignature(documentId: string) {
  return requestJson<{ signature: SignatureRecord }>(`/documents/${documentId}/signature`);
}
