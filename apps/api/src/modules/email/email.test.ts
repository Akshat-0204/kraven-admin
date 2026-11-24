import { createHmac } from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { installMemoryStore, type MemoryStore } from '../../test/memoryStore.js';
import { portalAccessEmail } from './email.templates.js';
import { sendEmail } from './email.service.js';

vi.mock('../../middleware/authenticate.js', async () => {
  const { authenticateAsTestUser } = await import('../../test/mockAuthenticate.js');
  return { authenticate: authenticateAsTestUser };
});

const SECRET = `whsec_${Buffer.from('test-secret').toString('base64')}`;
let store: MemoryStore;

function signed(body: string, opts: { id?: string; ts?: number; secret?: string } = {}) {
  const id = opts.id ?? 'msg_1';
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const key = Buffer.from((opts.secret ?? SECRET).replace(/^whsec_/, ''), 'base64');
  const sig = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');
  return { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': `v1,${sig}` };
}

beforeEach(() => {
  store = installMemoryStore();
  env.resendApiKey = '';
  env.resendWebhookSecret = SECRET;
});
afterEach(() => {
  store.restore();
  vi.restoreAllMocks();
});

describe('email service', () => {
  it('is a log-only no-op without an API key but still writes an EmailLog', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const log = await sendEmail({ to: 'a@b.co', type: 'reminder', subject: 'Hi', html: '<p>x</p>' });
    expect(log.status).toBe('queued');
    expect(log.resendId).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(store.all('EmailLog')).toHaveLength(1);
  });

  it('portal email carries the link but no access code', () => {
    const mail = portalAccessEmail({ clientName: 'Ada', portalUrl: 'http://x/c/acme' });
    expect(mail.html).toContain('http://x/c/acme');
    expect(mail.html.toLowerCase()).not.toMatch(/code:|your code|passcode/);
  });

  it('admin routes send the portal email, log it, and list logs per client', async () => {
    const client = store.insert('Client', { companyName: 'Acme', contactPerson: 'Ada', email: 'ada@acme.co', portalAccess: { slug: 'acme', enabled: true } });
    const res = await request(createApp()).post(`/clients/${client._id}/emails/portal`);
    expect(res.status).toBe(201);
    expect(res.body.email).toMatchObject({ to: 'ada@acme.co', type: 'portal-access', status: 'queued' });
    const list = await request(createApp()).get(`/clients/${client._id}/emails`);
    expect(list.body.emails).toHaveLength(1);
  });
});

describe('POST /webhooks/resend', () => {
  const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_1' } });

  it('rejects missing, wrong-secret and stale signatures', async () => {
    store.insert('EmailLog', { to: 'a@b.co', type: 'reminder', subject: 's', status: 'sent', resendId: 're_1' });
    const app = createApp();
    const send = (headers: Record<string, string>) => request(app).post('/webhooks/resend').set(headers).set('Content-Type', 'application/json').send(body);
    expect((await send({})).status).toBe(401);
    expect((await send(signed(body, { secret: `whsec_${Buffer.from('other').toString('base64')}` }))).status).toBe(401);
    expect((await send(signed(body, { ts: Math.floor(Date.now() / 1000) - 3600 }))).status).toBe(401);
    expect(store.all('EmailLog')[0].status).toBe('sent');
  });

  it('accepts a valid signature without an admin session or allowed origin, and never regresses status', async () => {
    store.insert('EmailLog', { to: 'a@b.co', type: 'reminder', subject: 's', status: 'sent', resendId: 're_1' });
    const app = createApp();
    const post = (payload: string) =>
      request(app).post('/webhooks/resend').set('Origin', 'https://evil.example').set(signed(payload)).set('Content-Type', 'application/json').send(payload);
    expect((await post(body)).status).toBe(200);
    expect(store.all('EmailLog')[0].status).toBe('delivered');
    await post(JSON.stringify({ type: 'email.sent', data: { email_id: 're_1' } }));
    expect(store.all('EmailLog')[0].status).toBe('delivered');
  });
});
