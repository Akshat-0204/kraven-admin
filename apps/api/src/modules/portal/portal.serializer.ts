import type { PortalSettingsRecord } from '@kraven/types';
import { env } from '../../config/env.js';
import type { PortalAccess } from './portalAccess.schema.js';

export function portalUrl(slug: string) {
  return `${env.portalBaseUrl.replace(/\/+$/, '')}/c/${slug}`;
}

/** Admin view of portal access. Never includes the code hash. */
export function serializePortalSettings(access: Partial<PortalAccess> | undefined, hasCode: boolean): PortalSettingsRecord {
  return {
    slug: access?.slug,
    enabled: access?.enabled ?? false,
    expiresAt: access?.expiresAt ? new Date(access.expiresAt).toISOString() : undefined,
    hasCode,
    codeUpdatedAt: access?.codeUpdatedAt ? new Date(access.codeUpdatedAt).toISOString() : undefined,
    lastLoginAt: access?.lastLoginAt ? new Date(access.lastLoginAt).toISOString() : undefined,
    lastViewedAt: access?.lastViewedAt ? new Date(access.lastViewedAt).toISOString() : undefined,
    lockedUntil:
      access?.lockedUntil && new Date(access.lockedUntil).getTime() > Date.now()
        ? new Date(access.lockedUntil).toISOString()
        : undefined,
    url: access?.slug ? portalUrl(access.slug) : undefined
  };
}
