import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { hash } from 'bcrypt';
import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { installMemoryStore, type MemoryStore } from '../../test/memoryStore.js';

vi.mock('../../middleware/authenticate.js', async () => {
  const { authenticateAsTestUser } = await import('../../test/mockAuthenticate.js');
  return { authenticate: authenticateAsTestUser };
});

const s3 = mockClient(S3Client);
const CODE = 'ABCD2345EF';
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

let store: MemoryStore;
let codeHash: string;

function seedClient(name: string, slug: string, portal: Record<string, unknown> = {}) {
  return store.insert('Client', {
    companyName: name,
    contactPerson: `${name} Contact`,
    internalNotes: 'secret internal note',
    portalAccess: { slug, codeHash, enabled: true, accessVersion: 0, failedAttempts: 0, ...portal }
  });
}

function seedWorld() {
  const a = seedClient('Acme', 'acme');
  const b = seedClient('Beta', 'beta');
  const projectA = store.insert('Project', { projectName: 'Acme Site', client: a._id, status: 'In Progress', progressPercentage: 40 });
  const projectB = store.insert('Project', { projectName: 'Beta App', client: b._id, status: 'Planning' });

  const file = (owner: Record<string, any>, type: 'Client' | 'Project', filename: string, clientVisible: boolean) =>
    store.insert('FileMetadata', {
      bucketKey: `files/${new Types.ObjectId()}`,
      filename,
      length: 10,
      clientVisible,
      associatedEntityType: type,
      associatedEntityId: owner._id
    });
  const files = {
    aClientShared: file(a, 'Client', 'acme-brief.pdf', true),
    aProjectShared: file(projectA, 'Project', 'acme-mockup.png', true),
    aInternal: file(projectA, 'Project', 'acme-internal.xlsx', false),
    bShared: file(projectB, 'Project', 'beta-shared.pdf', true)
  };

  const update = (project: Record<string, any>, title: string, clientVisible: boolean, attachments: unknown[] = []) =>
    store.insert('ProjectUpdate', { project: project._id, title, body: `${title} body`, clientVisible, attachments, postedAt: new Date() });
  const updates = {
    aVisible: update(projectA, 'Design done', true, [files.aProjectShared._id, files.aInternal._id]),
    aHidden: update(projectA, 'Internal retro', false),
    bVisible: update(projectB, 'Beta kickoff', true)
  };

  const html = '<p>doc</p>';
  const doc = (client: Record<string, any>, title: string, status: string) =>
    store.insert('Document', {
      title,
      client: client._id,
      template: new Types.ObjectId(),
      templateVersion: 1,
      html,
      status,
      pdfKey: `documents/${title}.pdf`,
      pdfSourceHash: sha256(html)
    });
  const docs = {
    aDraft: doc(a, 'Acme Draft', 'Draft'),
    aSent: doc(a, 'Acme Proposal', 'Sent'),
    aSigned: doc(a, 'Acme Contract', 'Signed'),
    bSent: doc(b, 'Beta Proposal', 'Sent')
  };

  const payeeDefault = store.insert('PayeeProfile', { name: 'Sanchit Jain', vpa: 'sanxhit@slc', isDefault: true });
  const payeeOther = store.insert('PayeeProfile', { name: 'Akshat Soni', vpa: 'soniakshat56@oksbi', isDefault: false });
  const invoice = (client: Record<string, any>, invoiceNumber: string, extra: Record<string, unknown> = {}) =>
    store.insert('Invoice', {
      client: client._id,
      invoiceNumber,
      amount: 1000,
      amountPaid: 0,
      remainingAmount: 1000,
      invoiceDate: new Date('2026-01-01'),
      dueDate: new Date('2099-01-01'),
      paymentStatus: 'Pending',
      ...extra
    });
  const invoices = {
    aDefaultPayee: invoice(a, 'INV-A1'),
    aOtherPayee: invoice(a, 'INV-A2', { payeeProfile: payeeOther._id, amountPaid: 250, dueDate: new Date('2020-01-01') }),
    b: invoice(b, 'INV-B1')
  };

  return { a, b, projectA, projectB, files, updates, docs, invoices, payeeDefault, payeeOther };
}

async function signIn(app: ReturnType<typeof createApp>, slug = 'acme', code = CODE) {
  const agent = request.agent(app);
  const response = await agent.post(`/public/portal/${slug}/verify`).send({ code });
  return { agent, response };
}

describe('client portal public API', () => {
  beforeEach(async () => {
    s3.reset();
    s3.on(GetObjectCommand).callsFake(() => ({ Body: Readable.from([Buffer.from('%PDF-1.7')]) }));
    store = installMemoryStore();
    codeHash ??= await hash(CODE, 10);
  });

  afterEach(() => {
    store.restore();
    vi.restoreAllMocks();
  });

  describe('verify', () => {
    it('sets a signed, httpOnly, 30-day cookie scoped to /public/portal and logs the login', async () => {
      const { a } = seedWorld();
      const { agent, response } = await signIn(createApp());

      expect(response.status).toBe(200);
      const cookie = String(response.headers['set-cookie']);
      expect(cookie).toMatch(/^kraven_portal=s%3A/);
      expect(cookie).toContain('Path=/public/portal');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Max-Age=2592000');
      expect(cookie).toContain('SameSite=Lax');

      const me = await agent.get('/public/portal/me');
      expect(me.status).toBe(200);
      expect(me.body.client).toEqual({ companyName: 'Acme', contactPerson: 'Acme Contact' });
      expect(me.body.slug).toBe('acme');
      expect(me.body.projects).toEqual([expect.objectContaining({ projectName: 'Acme Site', progressPercentage: 40 })]);
      expect(JSON.stringify(me.body)).not.toContain('secret internal note');

      const access = store.get('Client', a._id)!.portalAccess;
      expect(access.lastLoginAt).toBeInstanceOf(Date);
      expect(access.lastViewedAt).toBeInstanceOf(Date);
      expect(store.all('Activity')).toEqual([expect.objectContaining({ action: 'portal-login', entityType: 'Client' })]);
    });

    it('accepts codes case-insensitively with surrounding whitespace', async () => {
      seedWorld();
      const { response } = await signIn(createApp(), 'acme', `  ${CODE.toLowerCase()} `);
      expect(response.status).toBe(200);
    });

    it('answers a wrong code, an unknown slug and a malformed slug with the same 401', async () => {
      seedWorld();
      const app = createApp();
      const wrong = await request(app).post('/public/portal/acme/verify').send({ code: 'WRONGCODE1' });
      const unknown = await request(app).post('/public/portal/nobody/verify').send({ code: CODE });
      const malformed = await request(app).post('/public/portal/NOT_A_SLUG!/verify').send({ code: CODE });

      for (const response of [wrong, unknown, malformed]) {
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Invalid link or access code' });
        expect(response.headers['set-cookie']).toBeUndefined();
      }
    });

    it('locks the slug for 15 minutes after 5 wrong codes, then unlocks and resets the counter', async () => {
      const { a } = seedWorld();
      const app = createApp();

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const response = await request(app).post('/public/portal/acme/verify').send({ code: 'WRONGCODE1' });
        expect(response.status).toBe(401);
      }

      const locked = await request(app).post('/public/portal/acme/verify').send({ code: CODE });
      expect(locked.status).toBe(429);
      expect(locked.headers['set-cookie']).toBeUndefined();

      const access = store.get('Client', a._id)!.portalAccess;
      const lockMs = new Date(access.lockedUntil).getTime() - Date.now();
      expect(lockMs).toBeGreaterThan(14 * 60 * 1000);
      expect(lockMs).toBeLessThanOrEqual(15 * 60 * 1000);

      // Other slugs are unaffected by the lock.
      expect((await signIn(app, 'beta')).response.status).toBe(200);

      access.lockedUntil = new Date(Date.now() - 1000);
      expect((await signIn(app)).response.status).toBe(200);
      expect(store.get('Client', a._id)!.portalAccess.failedAttempts).toBe(0);
      expect(store.get('Client', a._id)!.portalAccess.lockedUntil).toBeUndefined();
    });

    it('rejects a correct code when the portal is disabled or expired', async () => {
      seedWorld();
      seedClient('Off', 'off-portal', { enabled: false });
      seedClient('Old', 'old-portal', { expiresAt: new Date(Date.now() - 1000) });
      const app = createApp();

      expect((await signIn(app, 'off-portal')).response.status).toBe(401);
      expect((await signIn(app, 'old-portal')).response.status).toBe(401);
    });
  });

  describe('session checks on every request', () => {
    it('requires the portal cookie and rejects tampered values', async () => {
      seedWorld();
      const app = createApp();
      for (const path of ['/me', '/updates', '/documents', '/payments', '/downloads']) {
        expect((await request(app).get(`/public/portal${path}`)).status).toBe(401);
      }

      const { response } = await signIn(app);
      const forged = String(response.headers['set-cookie']).split(';')[0].replace(/\.0\./, '.1.');
      expect((await request(app).get('/public/portal/me').set('Cookie', forged)).status).toBe(401);
      const unsigned = `kraven_portal=${store.all('Client')[1]._id}.0.${Date.now()}`;
      expect((await request(app).get('/public/portal/me').set('Cookie', unsigned)).status).toBe(401);
    });

    it.each([
      ['disabled', (access: Record<string, any>) => (access.enabled = false)],
      ['expired', (access: Record<string, any>) => (access.expiresAt = new Date(Date.now() - 1000))],
      ['revoked or rotated', (access: Record<string, any>) => (access.accessVersion += 1)]
    ])('rejects an existing cookie once the portal is %s', async (_label, change) => {
      const { a } = seedWorld();
      const { agent } = await signIn(createApp());
      expect((await agent.get('/public/portal/me')).status).toBe(200);

      change(store.get('Client', a._id)!.portalAccess);

      expect((await agent.get('/public/portal/me')).status).toBe(401);
      expect((await agent.get('/public/portal/documents')).status).toBe(401);
    });

    it('rejects cookies older than 30 days even if the browser kept them', async () => {
      seedWorld();
      const app = createApp();
      const { response } = await signIn(app);
      const realNow = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(realNow + 31 * 24 * 60 * 60 * 1000);
      const cookie = String(response.headers['set-cookie']).split(';')[0];
      expect((await request(app).get('/public/portal/me').set('Cookie', cookie)).status).toBe(401);
    });

    it('logout clears the cookie', async () => {
      seedWorld();
      const { agent } = await signIn(createApp());
      const response = await agent.post('/public/portal/logout');
      expect(response.status).toBe(204);
      expect(String(response.headers['set-cookie'])).toMatch(/^kraven_portal=.*Path=\/public\/portal; Expires=Thu, 01 Jan 1970/);
      expect((await agent.get('/public/portal/me')).status).toBe(401);
    });
  });

  describe('content scoping', () => {
    it('lists only client-visible updates of the client and only shared attachments', async () => {
      const { files } = seedWorld();
      const { agent } = await signIn(createApp());

      const response = await agent.get('/public/portal/updates');
      expect(response.status).toBe(200);
      expect(response.body.updates).toHaveLength(1);
      expect(response.body.updates[0]).toMatchObject({ title: 'Design done', project: { projectName: 'Acme Site' } });
      expect(response.body.updates[0].attachments).toEqual([
        expect.objectContaining({ id: String(files.aProjectShared._id), filename: 'acme-mockup.png' })
      ]);
      expect(JSON.stringify(response.body)).not.toMatch(/Internal retro|Beta kickoff|acme-internal/);
    });

    it('lists non-draft documents of the client only', async () => {
      seedWorld();
      const { agent } = await signIn(createApp());

      const response = await agent.get('/public/portal/documents');
      expect(response.body.documents.map((doc: { title: string }) => doc.title).sort()).toEqual([
        'Acme Contract',
        'Acme Proposal'
      ]);
      expect(response.body.documents[0]).not.toHaveProperty('html');
    });

    it('opening a Sent document marks it Viewed once and logs an activity event', async () => {
      const { docs } = seedWorld();
      const { agent } = await signIn(createApp());

      const first = await agent.get(`/public/portal/documents/${docs.aSent._id}/pdf`);
      expect(first.status).toBe(200);
      expect(first.headers['content-type']).toBe('application/pdf');
      expect(first.headers['content-disposition']).toMatch(/^inline; filename="Acme Proposal.pdf"/);
      expect(store.get('Document', docs.aSent._id)!.status).toBe('Viewed');

      await agent.get(`/public/portal/documents/${docs.aSent._id}/pdf`).expect(200);
      await agent.get(`/public/portal/documents/${docs.aSigned._id}/pdf`).expect(200);
      expect(store.get('Document', docs.aSigned._id)!.status).toBe('Signed');
      expect(store.all('Activity').filter((activity) => activity.action === 'document-viewed')).toHaveLength(1);
    });

    it('hides draft documents and other clients documents (404)', async () => {
      const { docs } = seedWorld();
      const { agent } = await signIn(createApp());

      await agent.get(`/public/portal/documents/${docs.aDraft._id}/pdf`).expect(404);
      await agent.get(`/public/portal/documents/${docs.bSent._id}/pdf`).expect(404);
      await agent.get('/public/portal/documents/not-an-id/pdf').expect(404);
      expect(store.get('Document', docs.bSent._id)!.status).toBe('Sent');
    });

    it('lists the client invoices with derived status and the resolved payee', async () => {
      seedWorld();
      const { agent } = await signIn(createApp());

      const response = await agent.get('/public/portal/payments');
      const payments = Object.fromEntries(
        response.body.payments.map((payment: { invoiceNumber: string }) => [payment.invoiceNumber, payment])
      );
      expect(Object.keys(payments).sort()).toEqual(['INV-A1', 'INV-A2']);
      expect(payments['INV-A1']).toMatchObject({
        amount: 1000,
        remainingAmount: 1000,
        paymentStatus: 'Pending',
        payee: { name: 'Sanchit Jain', vpa: 'sanxhit@slc' }
      });
      expect(payments['INV-A2']).toMatchObject({
        remainingAmount: 750,
        paymentStatus: 'Overdue',
        payee: { name: 'Akshat Soni', vpa: 'soniakshat56@oksbi' }
      });
    });

    it('lists only client-visible files of the client and its projects', async () => {
      seedWorld();
      const { agent } = await signIn(createApp());

      const response = await agent.get('/public/portal/downloads');
      expect(response.body.downloads.map((file: { filename: string }) => file.filename).sort()).toEqual([
        'acme-brief.pdf',
        'acme-mockup.png'
      ]);
      expect(response.body.downloads[0]).not.toHaveProperty('bucketKey');
    });

    it('presigns shared files of the client only; internal and other clients files are 404', async () => {
      const { files } = seedWorld();
      const { agent } = await signIn(createApp());

      const ok = await agent.get(`/public/portal/downloads/${files.aClientShared._id}/url`);
      expect(ok.status).toBe(200);
      expect(ok.body.expiresIn).toBe(60);
      expect(new URL(ok.body.url).pathname).toContain(files.aClientShared.bucketKey);

      await agent.get(`/public/portal/downloads/${files.aInternal._id}/url`).expect(404);
      await agent.get(`/public/portal/downloads/${files.bShared._id}/url`).expect(404);
      await agent.get('/public/portal/downloads/nope/url').expect(404);
    });

    it('serves the other client only their own data (no cross-client leakage)', async () => {
      seedWorld();
      const { agent } = await signIn(createApp(), 'beta');

      const responses: request.Response[] = [];
      for (const path of ['/me', '/updates', '/documents', '/payments', '/downloads']) {
        responses.push(await agent.get(`/public/portal${path}`));
      }
      const [me, updates, documents, payments, downloads] = responses;
      const body = JSON.stringify([me.body, updates.body, documents.body, payments.body, downloads.body]);
      expect(body).not.toMatch(/Acme|INV-A|acme-/);
      expect(me.body.client.companyName).toBe('Beta');
    });
  });
});
