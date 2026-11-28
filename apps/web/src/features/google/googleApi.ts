import { useQuery } from '@tanstack/react-query';
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

/** Google connection state for gating Drive/Docs actions; `ready` is false until connected and healthy. */
export function useGoogleStatus() {
  const query = useQuery({ queryKey: googleQueryKeys.status, queryFn: getGoogleStatus });
  const ready = Boolean(query.data?.connected && !query.data.needsReconnect);
  return {
    ready,
    /** Tooltip for disabled Google actions. */
    reason: ready ? undefined : 'Connect Google in Settings first',
    status: query.data
  };
}
