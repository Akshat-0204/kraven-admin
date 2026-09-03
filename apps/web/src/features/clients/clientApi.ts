import type {
  ActivityRecord,
  ClientRecord,
  EntityLink,
  FileMetadataRecord,
  ProjectSummaryRecord
} from '@kraven/types';
import type { ClientInput, UpdateClientInput } from '@kraven/validation';
import { requestForm, requestJson } from '../../lib/api';

interface ClientFilters {
  search?: string;
}

function toQueryString(filters: ClientFilters) {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set('search', filters.search);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const clientQueryKeys = {
  all: ['clients'] as const,
  list: (filters: ClientFilters) => ['clients', 'list', filters] as const,
  detail: (id: string) => ['clients', 'detail', id] as const
};

export async function listClients(filters: ClientFilters = {}) {
  return requestJson<{ clients: ClientRecord[] }>(`/clients${toQueryString(filters)}`);
}

export async function getClient(id: string) {
  return requestJson<{
    client: ClientRecord;
    projects: ProjectSummaryRecord[];
    activity: ActivityRecord[];
  }>(`/clients/${id}`);
}

export async function createClient(input: ClientInput) {
  return requestJson<{ client: ClientRecord }>('/clients', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateClient(id: string, input: UpdateClientInput) {
  return requestJson<{ client: ClientRecord }>(`/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function deleteClient(id: string) {
  return requestJson<void>(`/clients/${id}`, { method: 'DELETE' });
}

export async function addClientLink(id: string, link: EntityLink) {
  return requestJson<{ client: ClientRecord }>(`/clients/${id}/links`, {
    method: 'POST',
    body: JSON.stringify(link)
  });
}

export async function removeClientLink(id: string, linkIndex: number) {
  return requestJson<{ client: ClientRecord }>(`/clients/${id}/links/${linkIndex}`, {
    method: 'DELETE'
  });
}

export async function uploadClientDocument(id: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('associatedEntityType', 'Client');
  formData.append('associatedEntityId', id);

  const upload = await requestForm<{ file: FileMetadataRecord }>('/files', formData);

  return requestJson<{ client: ClientRecord }>(`/clients/${id}/documents`, {
    method: 'POST',
    body: JSON.stringify({
      fileId: upload.file.id,
      filename: upload.file.filename,
      contentType: upload.file.contentType,
      uploadedAt: upload.file.createdAt
    })
  });
}

export async function removeClientDocument(id: string, fileId: string) {
  return requestJson<{ client: ClientRecord }>(`/clients/${id}/documents/${fileId}`, {
    method: 'DELETE'
  });
}
