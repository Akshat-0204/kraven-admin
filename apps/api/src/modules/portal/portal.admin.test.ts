import { compare } from 'bcrypt';
import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { createApp } from '../../app.js';
import { installMemoryStore, type MemoryStore } from '../../test/memoryStore.js';
import { PORTAL_CODE_ALPHABET, PORTAL_CODE_LENGTH } from './portal.code.js';

vi.mock('../../middleware/authenticate.js', async () => {
  const { authenticateAsTestUser } = await import('../../test/mockAuthenticate.js');
  return { authenticate: authenticateAsTestUser };
});

let store: MemoryStore;

function seedClient(name = 'Acme', portalAccess?: Record<string, unknown>) {
  return store.insert('Client', { companyName: name, contactPerson: `${name} Contact`, portalAccess });
}

const noHash = (body: unknown) => expect(JSON.stringify(body)).not.toMatch(/codeHash|\$2[aby]\$/);

describe('admin portal settings', () => {
  beforeEach(() => {
    store = installMemoryStore();
  });
  afterEach(() => store.restore());

  it('returns default settings for a client without a portal', async () => {
    const client = seedClient();
    const response = await request(createApp()).get(`/clients/${client._id}/portal`).expect(200);
    expect(response.body.portal).toEqual({ enabled: false, hasCode: false });
  });

  it('saves slug, enabled and expiry, normalising the slug', async () => {
    const client = seedClient();
    const response = await request(createApp())
      .put(`/clients/${client._id}/portal`)
      .send({ slug: '  Acme-Studio ', enabled: true, expiresAt: '2099-01-01' })
      .expect(200);

    expect(response.body.portal).toMatchObject({
      slug: 'acme-studio',
      enabled: true,
      expiresAt: '2099-01-01T00:00:00.000Z',
      url: 'http://localhost:5173/c/acme-studio'
    });

    const cleared = await request(createApp())
      .put(`/clients/${client._id}/portal`)
      .send({ slug: 'acme-studio', enabled: false, expiresAt: '' })
      .expect(200);
    expect(cleared.body.portal.enabled).toBe(false);
    expect(cleared.body.portal).not.toHaveProperty('expiresAt');
  });

  it.each(['ab', 'a'.repeat(41), 'has space', 'UPPER_case!', '-lead', 'trail-', 'double--dash', 'admin', 'portal', 'login'])(
    'rejects the slug %j',
    async (slug) => {
      const client = seedClient();
      await request(createApp()).put(`/clients/${client._id}/portal`).send({ slug, enabled: true }).expect(400);
    }
  );

  it('rejects a slug another client uses (409)', async () => {
    seedClient('Taken', { slug: 'acme', enabled: true, accessVersion: 0, failedAttempts: 0 });
    const client = seedClient('Acme 2');
    const response = await request(createApp()).put(`/clients/${client._id}/portal`).send({ slug: 'acme', enabled: true });
    expect(response.status).toBe(409);
  });

  it('generates a 10-character code, returns it once and stores only a bcrypt hash', async () => {
    const client = seedClient('Acme', { slug: 'acme', enabled: true, accessVersion: 0, failedAttempts: 3 });

    const response = await request(createApp()).post(`/clients/${client._id}/portal/code`).send({}).expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.code).toHaveLength(PORTAL_CODE_LENGTH);
    expect([...response.body.code].every((char: string) => PORTAL_CODE_ALPHABET.includes(char))).toBe(true);
    expect(response.body.portal).toMatchObject({ hasCode: true, slug: 'acme' });
    noHash(response.body);

    const access = store.get('Client', client._id)!.portalAccess;
    expect(access.codeHash).not.toContain(response.body.code);
    expect(await compare(response.body.code, access.codeHash)).toBe(true);
    expect(access.accessVersion).toBe(1);
    expect(access.failedAttempts).toBe(0);

    const settings = await request(createApp()).get(`/clients/${client._id}/portal`).expect(200);
    expect(settings.body.portal).not.toHaveProperty('code');
    noHash(settings.body);
  });

  it('accepts an admin-chosen code (normalised to upper case)', async () => {
    const client = seedClient('Acme', { slug: 'acme', enabled: true, accessVersion: 0, failedAttempts: 0 });
    const response = await request(createApp())
      .post(`/clients/${client._id}/portal/code`)
      .send({ code: 'my-secret-code' })
      .expect(200);
    expect(response.body.code).toBe('MY-SECRET-CODE');
    await request(createApp()).post(`/clients/${client._id}/portal/code`).send({ code: 'short' }).expect(400);
  });

  it('requires a slug before setting a code', async () => {
    const client = seedClient();
    await request(createApp()).post(`/clients/${client._id}/portal/code`).send({}).expect(400);
  });

  it('revoke bumps the access version and removes the code', async () => {
    const client = seedClient('Acme', { slug: 'acme', enabled: true, accessVersion: 2, failedAttempts: 0, codeHash: '$2b$10$x' });
    const response = await request(createApp()).post(`/clients/${client._id}/portal/revoke`).expect(200);
    expect(response.body.portal.hasCode).toBe(false);
    const access = store.get('Client', client._id)!.portalAccess;
    expect(access.accessVersion).toBe(3);
    expect(access.codeHash).toBeUndefined();
  });

  it('never returns the code hash, even from the client endpoints', async () => {
    const client = seedClient('Acme', { slug: 'acme', enabled: true, accessVersion: 0, failedAttempts: 0, codeHash: '$2b$10$secrethash' });
    const app = createApp();
    for (const path of [`/clients/${client._id}/portal`, `/clients/${client._id}`, '/clients']) {
      const response = await request(app).get(path);
      expect(response.status).toBe(200);
      noHash(response.body);
    }
  });

  it('404s unknown clients', async () => {
    await request(createApp()).get(`/clients/${new Types.ObjectId()}/portal`).expect(404);
    await request(createApp()).get('/clients/nope/portal').expect(404);
  });
});

describe('payee profiles', () => {
  beforeEach(() => {
    store = installMemoryStore();
  });
  afterEach(() => store.restore());

  it('creates, lists, switches the default and deletes', async () => {
    const app = createApp();
    const first = await request(app).post('/payee-profiles').send({ name: 'Sanchit Jain', vpa: 'sanxhit@slc', isDefault: true }).expect(201);
    const second = await request(app)
      .post('/payee-profiles')
      .send({ name: 'Akshat Soni', vpa: 'soniakshat56@oksbi', isDefault: true })
      .expect(201);

    const list = await request(app).get('/payee-profiles').expect(200);
    const defaults = list.body.payeeProfiles.filter((profile: { isDefault: boolean }) => profile.isDefault);
    expect(defaults.map((profile: { id: string }) => profile.id)).toEqual([second.body.payeeProfile.id]);

    await request(app).patch(`/payee-profiles/${first.body.payeeProfile.id}`).send({ name: 'Sanchit J' }).expect(200);
    await request(app).delete(`/payee-profiles/${first.body.payeeProfile.id}`).expect(204);
    expect((await request(app).get('/payee-profiles')).body.payeeProfiles).toHaveLength(1);
  });

  it('validates the UPI id', async () => {
    await request(createApp()).post('/payee-profiles').send({ name: 'Bad', vpa: 'not a vpa' }).expect(400);
    await request(createApp()).post('/payee-profiles').send({ name: 'Bad', vpa: 'x@1bank' }).expect(400);
  });
});

describe('project updates', () => {
  beforeEach(() => {
    store = installMemoryStore();
  });
  afterEach(() => store.restore());

  it('creates, lists, edits and deletes updates of a project', async () => {
    const client = seedClient();
    const project = store.insert('Project', { projectName: 'Site', client: client._id });
    const app = createApp();

    const created = await request(app)
      .post('/project-updates')
      .send({ project: String(project._id), title: 'Kickoff', body: 'We started', clientVisible: true })
      .expect(201);
    expect(created.body.update).toMatchObject({ title: 'Kickoff', clientVisible: true, attachments: [] });
    expect(store.all('Activity')).toEqual([expect.objectContaining({ action: 'update-posted', entityType: 'Project' })]);

    const list = await request(app).get(`/project-updates?project=${project._id}`).expect(200);
    expect(list.body.updates).toHaveLength(1);

    const edited = await request(app)
      .patch(`/project-updates/${created.body.update.id}`)
      .send({ clientVisible: false })
      .expect(200);
    expect(edited.body.update.clientVisible).toBe(false);

    await request(app).delete(`/project-updates/${created.body.update.id}`).expect(204);
    expect(store.all('ProjectUpdate')).toHaveLength(0);
  });

  it('validates the project', async () => {
    await request(createApp()).get('/project-updates').expect(400);
    await request(createApp())
      .post('/project-updates')
      .send({ project: String(new Types.ObjectId()), title: 'Orphan' })
      .expect(404);
    await request(createApp()).post('/project-updates').send({ project: 'nope', title: 'x' }).expect(400);
  });
});

describe('file sharing and document sharing', () => {
  beforeEach(() => {
    store = installMemoryStore();
  });
  afterEach(() => store.restore());

  it('lists an entity files and toggles clientVisible', async () => {
    const client = seedClient();
    const file = store.insert('FileMetadata', {
      bucketKey: 'files/a',
      filename: 'brief.pdf',
      length: 3,
      associatedEntityType: 'Client',
      associatedEntityId: client._id
    });
    store.insert('FileMetadata', {
      bucketKey: 'files/b',
      filename: 'other.pdf',
      length: 3,
      associatedEntityType: 'Client',
      associatedEntityId: new Types.ObjectId()
    });
    const app = createApp();

    const list = await request(app).get(`/files?associatedEntityType=Client&associatedEntityId=${client._id}`).expect(200);
    expect(list.body.files).toEqual([expect.objectContaining({ filename: 'brief.pdf', clientVisible: false })]);

    const shared = await request(app).patch(`/files/${file._id}`).send({ clientVisible: true }).expect(200);
    expect(shared.body.file.clientVisible).toBe(true);
    expect(store.get('FileMetadata', file._id)!.clientVisible).toBe(true);

    await request(app).patch(`/files/${file._id}`).send({ clientVisible: 'yes' }).expect(400);
    await request(app).get('/files?associatedEntityType=Client').expect(400);
  });

  it('shares a draft document (Draft -> Sent) and leaves later statuses alone', async () => {
    const client = seedClient();
    const base = { client: client._id, template: new Types.ObjectId(), templateVersion: 1, html: '<p/>' };
    const draft = store.insert('Document', { ...base, title: 'Draft', status: 'Draft' });
    const signed = store.insert('Document', { ...base, title: 'Signed', status: 'Signed' });
    const app = createApp();

    const response = await request(app).post(`/documents/${draft._id}/share`).expect(200);
    expect(response.body.document.status).toBe('Sent');
    expect(store.all('Activity')).toEqual([expect.objectContaining({ action: 'document-shared' })]);

    await request(app).post(`/documents/${signed._id}/share`).expect(200);
    expect(store.get('Document', signed._id)!.status).toBe('Signed');
  });
});
