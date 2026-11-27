import type { AdminUserRecord, GoogleStatus } from '@kraven/types';
import { apiUrl, requestJson } from '../../lib/api';

export const googleQueryKeys = {
  status: ['google', 'status'] as const,
  admins: ['admins'] as const
};

export function getGoogleStatus() {
  return requestJson<GoogleStatus>('/google/status');
}

export function disconnectGoogle() {
  return requestJson<{ connected: boolean }>('/google/disconnect', { method: 'POST' });
}

export function listAdmins() {
  return requestJson<{ admins: AdminUserRecord[] }>('/admins');
}

/** Full-page redirect: the API sends the browser to Google's consent screen. */
export function startGoogleConnect() {
  window.location.assign(apiUrl('/google/oauth/start'));
}
