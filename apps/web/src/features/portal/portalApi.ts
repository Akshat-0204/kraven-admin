import type {
  FileMetadataRecord,
  PayeeProfileRecord,
  PortalCodeResult,
  PortalDocumentRecord,
  PortalFileRecord,
  PortalOverview,
  PortalPaymentRecord,
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
  downloads: () => portalRequest<{ downloads: PortalFileRecord[] }>('/downloads'),
  downloadUrl: (id: string) => portalRequest<{ url: string; expiresIn: number }>(`/downloads/${id}/url`)
};

/** Streams through the API with the portal cookie; opening it marks a Sent document as Viewed. */
export function portalDocumentPdfUrl(id: string) {
  return apiUrl(`/public/portal/documents/${id}/pdf`);
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

export function setFileClientVisible(id: string, clientVisible: boolean) {
  return requestJson<{ file: FileMetadataRecord }>(`/files/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ clientVisible })
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
