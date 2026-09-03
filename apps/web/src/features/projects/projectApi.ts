import type {
  ActivityRecord,
  ClientRecord,
  EntityLink,
  FileMetadataRecord,
  ProjectRecord,
  ProjectStatus
} from '@kraven/types';
import type { ProjectFilterInput, ProjectInput, UpdateProjectInput } from '@kraven/validation';
import { requestForm, requestJson } from '../../lib/api';

function toQueryString(filters: ProjectFilterInput) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const projectQueryKeys = {
  all: ['projects'] as const,
  list: (filters: ProjectFilterInput) => ['projects', 'list', filters] as const,
  detail: (id: string) => ['projects', 'detail', id] as const
};

export async function listProjects(filters: ProjectFilterInput = {}) {
  return requestJson<{ projects: ProjectRecord[] }>(`/projects${toQueryString(filters)}`);
}

export async function getProject(id: string) {
  return requestJson<{
    project: ProjectRecord;
    client: ClientRecord;
    activity: ActivityRecord[];
  }>(`/projects/${id}`);
}

export async function createProject(input: ProjectInput) {
  return requestJson<{ project: ProjectRecord; client: ClientRecord }>('/projects', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  return requestJson<{ project: ProjectRecord; client: ClientRecord }>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  return updateProject(id, { status });
}

export async function updateProjectProgress(id: string, progressPercentage: number) {
  return updateProject(id, { progressPercentage });
}

export async function deleteProject(id: string) {
  return requestJson<void>(`/projects/${id}`, { method: 'DELETE' });
}

export async function addProjectLink(id: string, link: EntityLink) {
  return requestJson<{ project: ProjectRecord }>(`/projects/${id}/links`, {
    method: 'POST',
    body: JSON.stringify(link)
  });
}

export async function removeProjectLink(id: string, linkIndex: number) {
  return requestJson<{ project: ProjectRecord }>(`/projects/${id}/links/${linkIndex}`, {
    method: 'DELETE'
  });
}

export async function uploadProjectDocument(id: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('associatedEntityType', 'Project');
  formData.append('associatedEntityId', id);

  const upload = await requestForm<{ file: FileMetadataRecord }>('/files', formData);

  return requestJson<{ project: ProjectRecord }>(`/projects/${id}/documents`, {
    method: 'POST',
    body: JSON.stringify({
      fileId: upload.file.id,
      filename: upload.file.filename,
      contentType: upload.file.contentType,
      uploadedAt: upload.file.createdAt
    })
  });
}

export async function removeProjectDocument(id: string, fileId: string) {
  return requestJson<{ project: ProjectRecord }>(`/projects/${id}/documents/${fileId}`, {
    method: 'DELETE'
  });
}
