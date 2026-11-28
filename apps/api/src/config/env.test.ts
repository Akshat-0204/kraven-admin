import { afterEach, describe, expect, it, vi } from 'vitest';

describe('production secrets', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('refuses to start in production with missing or default secrets', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_SECRET', 'x'.repeat(40));
    vi.stubEnv('PORTAL_COOKIE_SECRET', '');
    await expect(import('./env.js')).rejects.toThrow(/PORTAL_COOKIE_SECRET/);
    vi.resetModules();
    vi.stubEnv('PORTAL_COOKIE_SECRET', 'y'.repeat(40));
    vi.stubEnv('SESSION_SECRET', 'kraven-development-session-secret');
    await expect(import('./env.js')).rejects.toThrow(/SESSION_SECRET/);
  });

  it('accepts real secrets in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_SECRET', 'x'.repeat(40));
    vi.stubEnv('PORTAL_COOKIE_SECRET', 'y'.repeat(40));
    await expect(import('./env.js')).resolves.toBeDefined();
  });
});
