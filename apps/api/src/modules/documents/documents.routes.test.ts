import { Readable } from 'node:stream';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { TEST_USER_ID } from '../../test/mockAuthenticate.js';
import { ClientModel } from '../clients/client.model.js';
import { ProjectModel } from '../projects/project.model.js';
import { DocumentModel } from './document.model.js';
import { GoogleConnectionModel } from '../google/google.connection.model.js';
import { copyFile, createBlankDoc, ensureFolder, exportPdf, getFile, moveToFolder, renameFile, setAccess, setLocked, trashFile } from '../google/drive.service.js';
import { replacePlaceholders } from '../google/docs.service.js';
import { FileMetadataModel } from '../files/file.model.js';
import { PackModel } from '../packs/pack.model.js';
import { DocumentTemplateModel } from './documentTemplate.model.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { logActivity } from '../../shared/activity/activity.service.js';

vi.mock('../../middleware/authenticate.js', async () => {
  const { authenticateAsTestUser } = await import('../../test/mockAuthenticate.js');
  return { authenticate: authenticateAsTestUser };
});
vi.mock('../google/drive.service.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../google/drive.service.js')>();
  return {
    ...original,
    getFile: vi.fn(),
    copyFile: vi.fn(),
    createBlankDoc: vi.fn(),
    ensureFolder: vi.fn(),
    moveToFolder: vi.fn(),
    renameFile: vi.fn(),
    setAccess: vi.fn(),
    setLocked: vi.fn(),
    exportPdf: vi.fn(),
    trashFile: vi.fn()
  };
});
vi.mock('../google/docs.service.js', () => ({ replacePlaceholders: vi.fn(async () => undefined) }));
vi.mock('../google/google.client.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../google/google.client.js')>()),
  requireGoogle: vi.fn(async () => ({ status: 'connected', email: 'agency@example.com', rootFolderId: 'root' }))
}));
vi.mock('../../shared/activity/activity.service.js', () => ({
  logActivity: vi.fn(async () => undefined),
  getEntityActivity: vi.fn(async () => [])
}));

const s3 = mockClient(S3Client);
const timestamps = { createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z') };

const clientId = new Types.ObjectId();
const otherClientId = new Types.ObjectId();
const projectId = new Types.ObjectId();
const templateId = new Types.ObjectId();

const client = ClientModel.hydrate({
  _id: clientId,
  companyName: 'Acme <Corp>',
  contactPerson: 'Asha',
  email: 'asha@acme.test',
  links: [],
  documents: [],
  ...timestamps
});
const project = ProjectModel.hydrate({
  _id: projectId,
  projectName: 'Website',
  client: clientId,
  status: 'Not Started',
  ...timestamps
});

let templates: Map<string, ReturnType<typeof DocumentTemplateModel.hydrate>>;
let documents: Map<string, ReturnType<typeof DocumentModel.hydrate>>;
let files: Map<string, ReturnType<typeof FileMetadataModel.hydrate>>;

function stubStore() {
  templates = new Map([
    [
      String(templateId),
      DocumentTemplateModel.hydrate({
        _id: templateId,
        name: 'Proposal',
        type: 'Proposal',
        googleDocUrl: 'https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit',
        googleFileId: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789',
        active: true,
        ...timestamps
      })
    ]
  ]);
  documents = new Map();
  files = new Map();
  vi.spyOn(FileMetadataModel, 'create').mockImplementation((async (doc: Record<string, unknown>) => {
    const created = FileMetadataModel.hydrate({ _id: new Types.ObjectId(), ...doc, ...timestamps });
    files.set(String(created._id), created);
    return created;
  }) as never);
  vi.spyOn(FileMetadataModel, 'findById').mockImplementation(((id: unknown) =>
    Promise.resolve(files.get(String(id)) ?? null)) as never);
  vi.spyOn(ClientModel, 'updateOne').mockResolvedValue({} as never);
  vi.spyOn(PackModel, 'updateMany').mockResolvedValue({} as never);

  vi.spyOn(ClientModel, 'findById').mockImplementation(((id: unknown) =>
    Promise.resolve(String(id) === String(clientId) ? client : null)) as never);
  vi.spyOn(ProjectModel, 'findById').mockImplementation(((id: unknown) =>
    Promise.resolve(String(id) === String(projectId) ? project : null)) as never);
  vi.spyOn(DocumentTemplateModel, 'findById').mockImplementation(((id: unknown) =>
    Promise.resolve(templates.get(String(id)) ?? null)) as never);
  vi.spyOn(DocumentTemplateModel, 'create').mockImplementation((async (doc: Record<string, unknown>) =>
    new DocumentTemplateModel({ ...doc, ...timestamps })) as never);
  vi.spyOn(DocumentTemplateModel.prototype, 'save').mockImplementation(async function (this: unknown) {
    return this;
  } as never);
  vi.spyOn(DocumentModel, 'findById').mockImplementation(((id: unknown) =>
    Promise.resolve(documents.get(String(id)) ?? null)) as never);
  vi.spyOn(DocumentModel, 'create').mockImplementation((async (doc: Record<string, unknown>) => {
    const created = DocumentModel.hydrate({ _id: new Types.ObjectId(), ...doc, ...timestamps });
    documents.set(String(created._id), created);
    return created;
  }) as never);
  vi.spyOn(DocumentModel.prototype, 'save').mockImplementation(async function (this: unknown) {
    return this;
  } as never);
}

const pdfBytes = Buffer.from('%PDF-1.7 fake');

describe('document template routes', () => {
  const docUrl = 'https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit';
  beforeEach(() => {
    stubStore();
    vi.mocked(getFile).mockReset().mockResolvedValue({ id: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789', name: 'Drive title' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('lists the available variables', async () => {
    const response = await request(createApp()).get('/document-templates/variables').expect(200);
    const keys = response.body.variables.map((variable: { key: string }) => variable.key);
    expect(keys).toEqual(expect.arrayContaining(['client.company', 'project.name', 'today', 'agency.name']));
  });

  it('saves a link: parses the id, checks access and falls back to the Drive title', async () => {
    const response = await request(createApp())
      .post('/document-templates')
      .send({ name: '', type: 'Agreement', googleDocUrl: docUrl })
      .expect(201);
    expect(getFile).toHaveBeenCalledWith('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789');
    expect(response.body.template).toMatchObject({
      name: 'Drive title',
      type: 'Agreement',
      googleDocUrl: docUrl,
      googleFileId: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'
    });
  });

  it('rejects a link that is not a Google Doc (400)', async () => {
    await request(createApp()).post('/document-templates').send({ name: 'Bad', type: 'Other', googleDocUrl: 'https://example.com/x' }).expect(400);
    expect(getFile).not.toHaveBeenCalled();
  });

  it('tells the owner to share the doc when the account cannot read it (403)', async () => {
    vi.mocked(getFile).mockRejectedValue(new HttpError(404, 'nope'));
    vi.spyOn(GoogleConnectionModel, 'findOne').mockReturnValue({ sort: () => Promise.resolve({ email: 'agency@example.com' }) } as never);
    const response = await request(createApp()).post('/document-templates').send({ name: 'X', type: 'Other', googleDocUrl: docUrl }).expect(403);
    expect(response.body.message).toMatch(/Share this doc/);
  });

  it('updates the link and re-checks access only when it changes', async () => {
    const app = createApp();
    await request(app).patch(`/document-templates/${String(templateId)}`).send({ name: 'Renamed' }).expect(200);
    expect(getFile).not.toHaveBeenCalled();
    const edited = await request(app).patch(`/document-templates/${String(templateId)}`).send({ googleDocUrl: 'https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789zz/edit' }).expect(200);
    expect(getFile).toHaveBeenCalledTimes(1);
    expect(edited.body.template.googleFileId).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789zz');
  });

  it('deletes a template', async () => {
    const template = templates.get(String(templateId))!;
    vi.spyOn(template, 'deleteOne').mockResolvedValue({} as never);
    await request(createApp()).delete(`/document-templates/${String(templateId)}`).expect(204);
    expect(template.deleteOne).toHaveBeenCalled();
  });

  it('returns 404 for an unknown template', async () => {
    await request(createApp()).get(`/document-templates/${String(new Types.ObjectId())}`).expect(404);
    await request(createApp()).get('/document-templates/not-an-id').expect(404);
  });

});


function mockList() {
  const find = vi.spyOn(DocumentModel, 'find').mockReturnValue({
    populate() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return Promise.resolve([...documents.values()].map((d) => Object.assign(d, { client, template: templates.get(String(templateId)) }))); }
  } as never);
  vi.spyOn(DocumentModel, 'countDocuments').mockResolvedValue(1 as never);
  return find;
}

function mockDrive() {
  vi.mocked(copyFile).mockReset().mockResolvedValue({ id: 'copy1', name: 'x', webViewLink: 'https://docs.google.com/document/d/copy1/edit' });
  vi.mocked(createBlankDoc).mockReset().mockResolvedValue({ id: 'blank1', name: 'x', webViewLink: 'https://docs.google.com/document/d/blank1/edit' });
  vi.mocked(ensureFolder).mockReset().mockResolvedValue('folder1');
  vi.mocked(moveToFolder).mockReset().mockResolvedValue(undefined);
  vi.mocked(renameFile).mockReset().mockResolvedValue({ id: 'copy1', name: 'x' });
  vi.mocked(setAccess).mockReset().mockImplementation(async (_id, entries) =>
    entries.map((entry) => ({ ...entry, permissionId: `p-${entry.email}` })));
  vi.mocked(setLocked).mockReset().mockResolvedValue(undefined);
  vi.mocked(exportPdf).mockReset().mockResolvedValue(Buffer.from('%PDF-1.7 fake'));
  vi.mocked(trashFile).mockReset().mockResolvedValue(undefined);
  vi.mocked(getFile).mockReset().mockResolvedValue({ id: 'copy1', name: 'x', headRevisionId: 'rev1' });
  vi.mocked(replacePlaceholders).mockClear();
}

describe('document routes', () => {
  beforeEach(() => {
    s3.reset();
    stubStore();
    mockDrive();
  });
  afterEach(() => vi.restoreAllMocks());

  async function createDoc(app = createApp(), body: Record<string, unknown> = {}) {
    const response = await request(app)
      .post('/documents')
      .send({ template: String(templateId), client: String(clientId), project: String(projectId), ...body })
      .expect(201);
    return response.body.document;
  }

  it('creates from a template: copies, files under the client folder, fills placeholders and shares', async () => {
    vi.mocked(logActivity).mockClear();
    const doc = await createDoc(createApp(), { access: [{ email: 'Bob@Example.com', role: 'writer' }] });
    expect(copyFile).toHaveBeenCalledWith('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789', expect.stringContaining('Acme <Corp>'));
    expect(ensureFolder).toHaveBeenCalledWith('Acme <Corp>', 'root');
    expect(moveToFolder).toHaveBeenCalledWith('copy1', 'folder1');
    expect(replacePlaceholders).toHaveBeenCalledWith('copy1', expect.objectContaining({ 'client.company': 'Acme <Corp>', 'project.name': 'Website' }));
    expect(setAccess).toHaveBeenCalledWith('copy1', [{ email: 'bob@example.com', role: 'writer' }]);
    expect(doc).toMatchObject({ status: 'Draft', googleFileId: 'copy1', webViewLink: expect.stringContaining('copy1'), hasPdf: false, pdfStale: false });
    expect(doc.access).toEqual([{ email: 'bob@example.com', role: 'writer' }]);
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'Client', action: 'document-created' }));
  });

  it('creates a blank, unassigned document in the root folder', async () => {
    vi.mocked(logActivity).mockClear();
    const response = await request(createApp()).post('/documents').send({}).expect(201);
    expect(response.body.document).toMatchObject({ title: 'Untitled document', status: 'Draft', googleFileId: 'blank1' });
    expect(createBlankDoc).toHaveBeenCalledWith('Untitled document', 'root');
    expect(replacePlaceholders).not.toHaveBeenCalled();
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('rejects a project that belongs to another client', async () => {
    vi.spyOn(ProjectModel, 'findById').mockResolvedValue(ProjectModel.hydrate({ _id: projectId, projectName: 'Other', client: otherClientId, status: 'Not Started', ...timestamps }) as never);
    await request(createApp()).post('/documents').send({ client: String(clientId), project: String(projectId) }).expect(400);
  });

  it('resolves the variable registry against the assigned client/project', async () => {
    const doc = await createDoc();
    const response = await request(createApp()).get(`/documents/${doc.id}/variables`).expect(200);
    const byKey = Object.fromEntries(response.body.variables.map((v: { key: string; value: string | null }) => [v.key, v.value]));
    expect(byKey['client.company']).toBe('Acme <Corp>');
    expect(byKey['project.name']).toBe('Website');
  });

  it('renames in Drive, reassigns, refills and replaces access on a Draft', async () => {
    const app = createApp();
    const doc = await createDoc(app, { client: undefined, project: undefined });
    const renamed = await request(app).patch(`/documents/${doc.id}`).send({ title: 'Renamed' }).expect(200);
    expect(renameFile).toHaveBeenCalledWith('copy1', 'Renamed');
    expect(renamed.body.document.title).toBe('Renamed');
    await request(app).post(`/documents/${doc.id}/refill`).expect(422);
    const assigned = await request(app).patch(`/documents/${doc.id}`).send({ client: String(clientId) }).expect(200);
    expect(assigned.body.document.client).toBe(String(clientId));
    expect(moveToFolder).toHaveBeenCalledWith('copy1', 'folder1');
    await request(app).post(`/documents/${doc.id}/refill`).expect(200);
    expect(replacePlaceholders).toHaveBeenCalledTimes(1);
    const access = await request(app).put(`/documents/${doc.id}/access`).send({ access: [{ email: 'a@x.com', role: 'reader' }] }).expect(200);
    expect(access.body.document.access).toEqual([{ email: 'a@x.com', role: 'reader' }]);
    await request(app).patch(`/documents/${doc.id}`).send({}).expect(400);
    await request(app).patch(`/documents/${new Types.ObjectId()}`).send({ title: 'x' }).expect(404);
  });

  it('saves a categorized PDF to the client files, then flags it stale when the doc changes', async () => {
    const app = createApp();
    const doc = await createDoc(app);
    s3.on(PutObjectCommand).resolves({});
    const saved = await request(app)
      .post(`/documents/${doc.id}/pdf`)
      .send({ category: 'Proposal', filename: 'acme_proposal', clientVisible: true })
      .expect(201);
    expect(saved.body.file).toMatchObject({ filename: 'acme_proposal.pdf', category: 'Proposal', clientVisible: true, sourceDocument: doc.id });
    expect(saved.body.document).toMatchObject({ hasPdf: true, pdfStale: false });
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(1);

    const same = await request(app).get(`/documents/${doc.id}`).expect(200);
    expect(same.body.document.pdfStale).toBe(false);
    vi.mocked(getFile).mockResolvedValue({ id: 'copy1', name: 'x', headRevisionId: 'rev2' });
    const changed = await request(app).get(`/documents/${doc.id}`).expect(200);
    expect(changed.body.document.pdfStale).toBe(true);
    mockList();
    const list = await request(app).get('/documents').expect(200);
    expect(list.body.documents[0].pdfStale).toBe(true);

    s3.on(GetObjectCommand).resolves({ Body: Readable.from([pdfBytes]) } as never);
    const download = await request(app)
      .get(`/documents/${doc.id}/pdf`)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(download.headers['content-type']).toBe('application/pdf');
    expect(Buffer.from(download.body).equals(pdfBytes)).toBe(true);
  });

  it('answers 422 saving a PDF without a client and 404 downloading before one exists', async () => {
    const app = createApp();
    const doc = await createDoc(app, { client: undefined, project: undefined });
    await request(app).post(`/documents/${doc.id}/pdf`).send({ category: 'Other', filename: 'x' }).expect(422);
    await request(app).get(`/documents/${doc.id}/pdf`).expect(404);
  });

  it('shares: snapshot PDF + lock + Sent; revise unlocks back to Draft; shared docs are not editable or deletable', async () => {
    const app = createApp();
    const doc = await createDoc(app);
    const shared = await request(app).post(`/documents/${doc.id}/share`).expect(200);
    expect(shared.body.document).toMatchObject({ status: 'Sent', hasPdf: true });
    expect(setLocked).toHaveBeenCalledWith('copy1', true);
    expect([...files.values()][0]).toMatchObject({ category: 'Proposal', clientVisible: false });
    await request(app).patch(`/documents/${doc.id}`).send({ title: 'x' }).expect(409);
    await request(app).delete(`/documents/${doc.id}`).expect(409);

    const revised = await request(app).post(`/documents/${doc.id}/revise`).expect(200);
    expect(revised.body.document.status).toBe('Draft');
    expect(setLocked).toHaveBeenLastCalledWith('copy1', false);
  });

  it('refuses to share a document without a client (422) and to revise a signed one (409)', async () => {
    const app = createApp();
    const blank = await createDoc(app, { client: undefined, project: undefined });
    await request(app).post(`/documents/${blank.id}/share`).expect(422);
    const signed = await createDoc(app);
    documents.get(signed.id)!.status = 'Signed';
    await request(app).post(`/documents/${signed.id}/revise`).expect(409);
  });

  it('deletes a Draft: trashes in Drive and removes the row', async () => {
    const app = createApp();
    const doc = await createDoc(app);
    const row = documents.get(doc.id)!;
    vi.spyOn(row, 'deleteOne').mockResolvedValue({} as never);
    await request(app).delete(`/documents/${doc.id}`).expect(204);
    expect(trashFile).toHaveBeenCalledWith('copy1');
    expect(row.deleteOne).toHaveBeenCalled();
  });

  it('lists with filters and populates client and template', async () => {
    const app = createApp();
    await createDoc(app);
    const find = mockList();
    const response = await request(app).get('/documents?status=Draft&q=acme').expect(200);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ status: 'Draft', title: expect.anything() }));
    expect(response.body.documents[0]).toMatchObject({ client: { companyName: 'Acme <Corp>' }, template: { name: 'Proposal' } });
    await request(app).get('/documents?client=not-an-id').expect(200);
  });

  it('409s Google actions when no account is connected', async () => {
    const { requireGoogle } = await import('../google/google.client.js');
    vi.mocked(requireGoogle).mockRejectedValueOnce(new HttpError(409, 'Google not connected'));
    await request(createApp()).post('/documents').send({}).expect(409);
  });
});
