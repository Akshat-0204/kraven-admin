import type { AuthUser, HealthResponse } from '@kraven/types';
import type { ChangePasswordInput, LoginInput } from '@kraven/validation';
import { healthResponseSchema } from '@kraven/validation';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Unable to reach Kraven API');
  }

  return healthResponseSchema.parse(await response.json());
}

export async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(body.message ?? 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(body.message ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

export async function login(credentials: LoginInput): Promise<AuthUser> {
  const response = await requestJson<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });

  return response.user;
}

export async function logout(): Promise<void> {
  await requestJson<void>('/auth/logout', { method: 'POST' });
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await requestJson<{ user: AuthUser }>('/auth/me');

  return response.user;
}

export async function changePassword(input: ChangePasswordInput): Promise<{ message: string }> {
  return requestJson<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

/** Fetches a file with the session cookie and saves it in the browser. */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Download failed' }));
    throw new Error(body.message ?? 'Download failed');
  }
  const match = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') ?? '');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = match?.[1] ?? fallbackName;
  link.click();
  URL.revokeObjectURL(url);
}
