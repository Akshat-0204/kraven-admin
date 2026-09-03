import type { ActivityRecord, ClientRecord, LeadRecord, LeadStatus } from '@kraven/types';
import type { LeadFilterInput, LeadInput, UpdateLeadInput } from '@kraven/validation';
import { requestJson } from '../../lib/api';

function toQueryString(filters: LeadFilterInput) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const leadQueryKeys = {
  all: ['leads'] as const,
  list: (filters: LeadFilterInput) => ['leads', 'list', filters] as const,
  detail: (id: string) => ['leads', 'detail', id] as const
};

export async function listLeads(filters: LeadFilterInput = {}) {
  return requestJson<{ leads: LeadRecord[] }>(`/leads${toQueryString(filters)}`);
}

export async function getLead(id: string) {
  return requestJson<{ lead: LeadRecord; activity: ActivityRecord[] }>(`/leads/${id}`);
}

export async function createLead(input: LeadInput) {
  return requestJson<{ lead: LeadRecord }>('/leads', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateLead(id: string, input: UpdateLeadInput) {
  return requestJson<{ lead: LeadRecord }>(`/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  return updateLead(id, { status });
}

export async function deleteLead(id: string) {
  return requestJson<void>(`/leads/${id}`, { method: 'DELETE' });
}

export async function convertLead(id: string) {
  return requestJson<{ client: ClientRecord | null }>(`/leads/${id}/convert`, { method: 'POST' });
}
