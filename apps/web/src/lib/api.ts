import type { AuthUser, HealthResponse } from '@kraven/types';
import type { ChangePasswordInput, LoginInput } from '@kraven/validation';
import { healthResponseSchema } from '@kraven/validation';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

export type FieldErrors = Record<string, string>;

/** Error thrown for any non-2xx API response; carries status and per-field messages. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: FieldErrors = {}
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const STATUS_FALLBACK: Record<number, string> = {
  400: 'The request was invalid',
  401: 'Your session has expired. Please sign in again',
  403: 'You do not have permission to do this',
  404: 'Not found',
  409: 'This conflicts with existing data',
  413: 'The upload is too large',
  429: 'Too many attempts. Please wait and try again',
  500: 'Something went wrong on the server. Please try again',
  502: 'The server is unreachable. Please try again',
  503: 'The service is temporarily unavailable. Please try again'
};

async function toApiError(response: Response, fallback: string): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as { message?: unknown; fieldErrors?: unknown } | null;
  const message =
    typeof body?.message === 'string' && body.message.trim()
      ? body.message
      : STATUS_FALLBACK[response.status] ?? `${fallback} (HTTP ${response.status})`;
  const fieldErrors =
    body?.fieldErrors && typeof body.fieldErrors === 'object' ? (body.fieldErrors as FieldErrors) : {};
  return new ApiError(message, response.status, fieldErrors);
}

async function send(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again', 0);
  }
}

/** Human message for anything thrown (ApiError, Error, string, unknown). */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await send(`${API_BASE_URL}/health`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Unable to reach Kraven API');
  }

  return healthResponseSchema.parse(await response.json());
}

export async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await send(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    throw await toApiError(response, 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await send(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });

  if (!response.ok) {
    throw await toApiError(response, 'Request failed');
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
  const response = await send(`${API_BASE_URL}${path}`, { credentials: 'include' });
  if (!response.ok) {
    throw await toApiError(response, 'Download failed');
  }
  const match = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') ?? '');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = match?.[1] ?? fallbackName;
  link.click();
  URL.revokeObjectURL(url);
}
