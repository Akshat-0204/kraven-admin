import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { hash } from 'bcrypt';
import { PDFDocument } from 'pdf-lib';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { installMemoryStore, type MemoryStore } from '../../test/memoryStore.js';
import { Types } from 'mongoose';

vi.mock('../../middleware/authenticate.js', async () => {
  const { authenticateAsTestUser } = await import('../../test/mockAuthenticate.js');
  return { authenticate: authenticateAsTestUser };
});

const s3 = mockClient(S3Client);
const CODE = 'ABCD2345EF';
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
// 1x1 transparent PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

let store: MemoryStore;
let codeHash: string;
let originalPdf: Buffer;
const stored = new Map<string, Buffer>();

function seed() {
  const mk = (name: string, slug: string) =>
    store.insert('Client', {
      companyName: name,
      contactPerson: name,
      portalAccess: { slug, codeHash, enabled: true, accessVersion: 0, failedAttempts: 0 }
    });
  const a = mk('Acme', 'acme');
  const b = mk('Beta', 'beta');
  const html = '<p>x</p>';
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
  const docs = { a: doc(a, 'Acme Contract', 'Sent'), aOutside: doc(a, 'Not in pack', 'Sent'), b: doc(b, 'Beta Contract', 'Sent') };
  const pack = (client: Record<string, any>, title: string, items: Record<string, unknown>[], status = 'Sent') =>
    store.insert('Pack', { client: client._id, title, status, items, sentAt: new Date() });
  const packs = {
    a: pack(a, 'Acme pack', [
      { _id: new Types.ObjectId(), kind: 'document', document: docs.a._id },
      { _id: new Types.ObjectId(), kind: 'payment', label: 'Deposit', amount: 500, paymentStatus: 'Pending' }
    ]),
    b: pack(b, 'Beta pack', [{ _id: new Types.ObjectId(), kind: 'document', document: docs.b._id }]),
    aDraft: pack(a, 'Acme draft', [{ _id: new Types.ObjectId(), kind: 'document', document: docs.aOutside._id }], 'Draft')
  };
  return { a, b, docs, packs };
}

async function signIn(slug = 'acme') {
  const agent = request.agent(createApp());
  await agent.post(`/public/portal/${slug}/verify`).send({ code: CODE });
  return agent;
}

const consentBody = { signerName: 'Ada Lovelace', method: 'drawn', signatureImage: PNG, consent: true };

describe('packs and e-sign', () => {
  beforeEach(async () => {
    codeHash ??= await hash(CODE, 10);
    if (!originalPdf) {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      originalPdf = Buffer.from(await pdf.save());
    }
    stored.clear();
    s3.reset();
    s3.on(GetObjectCommand).callsFake((input) => ({ Body: Readable.from([stored.get(input.Key) ?? originalPdf]) }));
    s3.on(PutObjectCommand).callsFake((input) => {
      stored.set(input.Key, input.Body as Buffer);
      return {};
    });
    store = installMemoryStore();
  });
  afterEach(() => {
    store.restore();
    vi.restoreAllMocks();
  });

  it('scopes portal packs to the cookie client and hides drafts', async () => {
    seed();
    const agent = await signIn();
    const res = await agent.get('/public/portal/packs');
    expect(res.status).toBe(200);
    expect(res.body.packs.map((p: any) => p.title)).toEqual(['Acme pack']);
    expect(JSON.stringify(res.body)).not.toContain('Beta');
    expect((await request(createApp()).get('/public/portal/packs')).status).toBe(401);
  });

  it('seals a signature, stores hashes, logs activity, and rejects re-signing', async () => {
    const { docs, a } = seed();
    const agent = await signIn();
    const res = await agent.post(`/public/portal/documents/${docs.a._id}/sign`).set('User-Agent', 'vitest-agent').send(consentBody);
    expect(res.status).toBe(200);

    expect(store.get('Document', docs.a._id)!.status).toBe('Signed');
    const signature = store.all('Signature')[0];
    expect(signature).toMatchObject({ signerName: 'Ada Lovelace', userAgent: 'vitest-agent', consent: true });
    expect(signature.originalSha256).toBe(sha256(originalPdf));
    const sealed = stored.get(signature.sealedKey)!;
    expect(sealed).toBeDefined();
    expect(sha256(sealed)).toBe(signature.sealedSha256);
    expect((await PDFDocument.load(sealed)).getPageCount()).toBe(2);
    expect(store.all('Activity').some((x) => x.action === 'document-signed' && String(x.entityId) === String(a._id))).toBe(true);

    const again = await agent.post(`/public/portal/documents/${docs.a._id}/sign`).send(consentBody);
    expect(again.status).toBe(409);
    expect(store.all('Signature')).toHaveLength(1);

    const download = await agent.get(`/public/portal/documents/${docs.a._id}/signed.pdf`);
    expect(download.status).toBe(200);
    expect(sha256(download.body)).toBe(signature.sealedSha256);
  });

  it('supports typed signatures', async () => {
    const { docs } = seed();
    const agent = await signIn();
    const res = await agent.post(`/public/portal/documents/${docs.a._id}/sign`).send({ signerName: 'Ada Lovelace', method: 'typed', consent: true });
    expect(res.status).toBe(200);
  });

  it('requires consent and a valid drawn image', async () => {
    const { docs } = seed();
    const agent = await signIn();
    const url = `/public/portal/documents/${docs.a._id}/sign`;
    expect((await agent.post(url).send({ ...consentBody, consent: false })).status).toBe(400);
    expect((await agent.post(url).send({ signerName: 'Ada', method: 'typed' })).status).toBe(400);
    expect((await agent.post(url).send({ ...consentBody, signatureImage: undefined })).status).toBe(400);
    expect((await agent.post(url).send({ ...consentBody, signatureImage: 'data:image/png;base64,' + 'A'.repeat(300_000) })).status).toBe(400);
    expect(store.get('Document', docs.a._id)!.status).toBe('Sent');
  });

  it("answers 404 for another client's document and for documents outside a live pack", async () => {
    const { docs } = seed();
    const agent = await signIn();
    expect((await agent.post(`/public/portal/documents/${docs.b._id}/sign`).send(consentBody)).status).toBe(404);
    expect((await agent.post(`/public/portal/documents/${docs.aOutside._id}/sign`).send(consentBody)).status).toBe(404);
    expect(store.all('Signature')).toHaveLength(0);
  });

  it('moves payment items Pending -> Sent -> Paid by admin only, logging each step', async () => {
    const { packs, a } = seed();
    const app = createApp();
    const itemId = String(packs.a.items[1]._id);
    const url = `/packs/${packs.a._id}/items/${itemId}/payment-status`;

    expect((await request(app).patch(url).send({ status: 'Paid' })).status).toBe(409);
    expect((await request(app).patch(url).send({ status: 'Sent' })).status).toBe(200);
    expect((await request(app).patch(url).send({ status: 'Sent' })).status).toBe(409);
    const paid = await request(app).patch(url).send({ status: 'Paid' });
    expect(paid.status).toBe(200);
    expect(paid.body.pack.items[1].paymentStatus).toBe('Paid');
    expect((await request(app).patch(url).send({ status: 'Pending' })).status).toBe(409);

    const logs = store.all('Activity').filter((x) => x.action === 'pack-payment-status' && String(x.entityId) === String(a._id));
    expect(logs).toHaveLength(2);

    // The portal has no way to change it.
    const agent = await signIn();
    expect((await agent.patch(`/public/portal${url}`).send({ status: 'Paid' })).status).toBe(404);
  });

  it('sending a pack marks draft documents Sent and rejects foreign documents', async () => {
    const { packs, docs, a } = seed();
    store.get('Document', docs.aOutside._id)!.status = 'Draft';
    const app = createApp();
    const sent = await request(app).post(`/packs/${packs.aDraft._id}/send`);
    expect(sent.status).toBe(200);
    expect(store.get('Document', docs.aOutside._id)!.status).toBe('Sent');
    expect(store.get('Pack', packs.aDraft._id)!.status).toBe('Sent');

    const bad = await request(app).post('/packs').send({ client: String(a._id), title: 'x', items: [{ kind: 'document', document: String(docs.b._id) }] });
    expect(bad.status).toBe(400);
  });
});
