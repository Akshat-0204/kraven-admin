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
import { DocumentTemplateModel } from './documentTemplate.model.js';

vi.mock('../../middleware/authenticate.js', async () => {
  const { authenticateAsTestUser } = await import('../../test/mockAuthenticate.js');
  return { authenticate: authenticateAsTestUser };
});
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

function stubStore() {
  templates = new Map([
    [
      String(templateId),
      DocumentTemplateModel.hydrate({
        _id: templateId,
        name: 'Proposal',
        type: 'Proposal',
        html: '<p>Hello {{client.company}} - {{project.name}}</p>',
        variables: ['client.company', 'project.name'],
        version: 1,
        ...timestamps
      })
    ]
  ]);
  documents = new Map();

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
  beforeEach(stubStore);
  afterEach(() => vi.restoreAllMocks());

  it('lists the available variables', async () => {
    const response = await request(createApp()).get('/document-templates/variables').expect(200);
    const keys = response.body.variables.map((variable: { key: string }) => variable.key);
    expect(keys).toEqual(expect.arrayContaining(['client.company', 'project.name', 'today', 'agency.name']));
  });

  it('sanitizes template HTML and records its variables on create', async () => {
    const response = await request(createApp())
      .post('/document-templates')
      .send({ name: 'NDA', type: 'Agreement', html: '<p onclick="x()">Hi {{client.contactName}}</p><script>alert(1)</script>' })
      .expect(201);

    expect(response.body.template).toMatchObject({
      name: 'NDA',
      type: 'Agreement',
      html: '<p>Hi {{client.contactName}}</p>',
      variables: ['client.contactName'],
      version: 1
    });
  });

  it.each([
    ['unknown variable', '<p>{{client.secret}}</p>'],
    ['triple-stache', '<p>{{{client.company}}}</p>'],
    ['block helper', '<p>{{#each client}}x{{/each}}</p>']
  ])('rejects a template with a %s', async (_label, html) => {
    await request(createApp()).post('/document-templates').send({ name: 'Bad', type: 'Other', html }).expect(400);
  });

  it('bumps the version on edit and not on a no-op save', async () => {
    const app = createApp();
    const current = templates.get(String(templateId))!;

    const unchanged = await request(app)
      .patch(`/document-templates/${String(templateId)}`)
      .send({ name: current.name, html: current.html })
      .expect(200);
    expect(unchanged.body.template.version).toBe(1);

    const edited = await request(app)
      .patch(`/document-templates/${String(templateId)}`)
      .send({ html: '<p>Changed {{client.email}}</p>' })
      .expect(200);
    expect(edited.body.template).toMatchObject({ version: 2, variables: ['client.email'] });
  });

  it('previews the merged, escaped HTML', async () => {
    const response = await request(createApp())
      .post(`/document-templates/${String(templateId)}/preview`)
      .send({ client: String(clientId), project: String(projectId) })
      .expect(200);

    expect(response.body.html).toContain('<!doctype html>');
    expect(response.body.html).toContain('Hello Acme &lt;Corp&gt; - Website');
  });

  it('returns 404 for an unknown template', async () => {
    await request(createApp()).get(`/document-templates/${String(new Types.ObjectId())}`).expect(404);
    await request(createApp()).get('/document-templates/not-an-id').expect(404);
  });
});

describe('document routes', () => {
  beforeEach(() => {
    s3.reset();
    stubStore();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function createDoc(app = createApp()) {
    const response = await request(app)
      .post('/documents')
      .send({ template: String(templateId), client: String(clientId), project: String(projectId) })
      .expect(201);
    return response.body.document;
  }

  it('snapshots the rendered HTML and template version, unaffected by later template edits', async () => {
    const app = createApp();
    const created = await createDoc(app);

    expect(created).toMatchObject({
      title: 'Proposal - Acme <Corp>',
      client: String(clientId),
      project: String(projectId),
      template: String(templateId),
      templateVersion: 1,
      status: 'Draft',
      hasPdf: false
    });
    expect(created.html).toContain('Hello Acme &lt;Corp&gt; - Website');
    const saved = vi.mocked(DocumentModel.create).mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(String(saved.createdBy)).toBe(TEST_USER_ID);

    await request(app)
      .patch(`/document-templates/${String(templateId)}`)
      .send({ html: '<p>Rewritten {{client.email}}</p>' })
      .expect(200);

    const fetched = await request(app).get(`/documents/${created.id}`).expect(200);
    expect(fetched.body.document.html).toBe(created.html);
    expect(fetched.body.document.templateVersion).toBe(1);
  });

  it('rejects a project that belongs to another client', async () => {
    vi.mocked(ProjectModel.findById).mockResolvedValue(
      ProjectModel.hydrate({ _id: projectId, projectName: 'Other', client: otherClientId, status: 'Not Started', ...timestamps }) as never
    );
    const response = await request(createApp())
      .post('/documents')
      .send({ template: String(templateId), client: String(clientId), project: String(projectId) })
      .expect(400);
    expect(response.body.message ?? response.body.error).toMatch(/does not belong/);
  });

  it('generates the PDF once and reuses it while the snapshot is unchanged', async () => {
    const fetchMock = vi.fn(async () => new Response(pdfBytes, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    s3.on(PutObjectCommand).resolves({});
    const app = createApp();
    const created = await createDoc(app);

    const first = await request(app).post(`/documents/${created.id}/pdf`).expect(200);
    expect(first.body).toMatchObject({ expiresIn: 60, generated: true });
    expect(first.body.url).toContain(`documents/${created.id}.pdf`);
    const put = s3.commandCalls(PutObjectCommand)[0].args[0].input;
    expect(put).toMatchObject({ Key: `documents/${created.id}.pdf`, ContentType: 'application/pdf' });

    const second = await request(app).post(`/documents/${created.id}/pdf`).expect(200);
    expect(second.body.generated).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(1);
  });

  it('maps a Gotenberg failure to 502 without storing anything', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    const app = createApp();
    const created = await createDoc(app);

    await request(app).post(`/documents/${created.id}/pdf`).expect(502);
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(0);
    expect(documents.get(created.id)?.pdfKey).toBeUndefined();
  });

  it('streams the PDF only after it has been generated', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(pdfBytes, { status: 200 })));
    s3.on(PutObjectCommand).resolves({});
    s3.on(GetObjectCommand).resolves({ Body: Readable.from([pdfBytes]) as never });
    const app = createApp();
    const created = await createDoc(app);

    await request(app).get(`/documents/${created.id}/pdf`).expect(404);
    await request(app).post(`/documents/${created.id}/pdf`).expect(200);

    const response = await request(app)
      .get(`/documents/${created.id}/pdf`)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('attachment;');
    expect(Buffer.from(response.body).equals(pdfBytes)).toBe(true);
  });

  it('lists documents for a client without the HTML body', async () => {
    const find = vi.spyOn(DocumentModel, 'find').mockReturnValue({
      select: () => ({ sort: async () => [] })
    } as never);
    await request(createApp()).get(`/documents?client=${String(clientId)}`).expect(200);
    expect(find).toHaveBeenCalledWith({ client: String(clientId) });
    await request(createApp()).get('/documents?client=bogus').expect(200, { documents: [] });
  });
});

describe('PATCH /documents/:id', () => {
  beforeEach(() => {
    s3.reset();
    stubStore();
  });
  afterEach(() => vi.restoreAllMocks());

  async function createDoc(app: ReturnType<typeof createApp>) {
    const response = await request(app)
      .post('/documents')
      .send({ template: String(templateId), client: String(clientId) })
      .expect(201);
    return response.body.document as { id: string };
  }

  it('edits a Draft, sanitizes the HTML and keeps the print shell', async () => {
    const app = createApp();
    const created = await createDoc(app);

    const response = await request(app)
      .patch(`/documents/${created.id}`)
      .send({ html: '<p onclick="x()">Edited {{not.a.var}}</p><script>alert(1)</script>', title: 'Renamed' })
      .expect(200);

    expect(response.body.document.title).toBe('Renamed');
    expect(response.body.document.html).toContain('<!doctype html>');
    expect(response.body.document.html).toContain('<p>Edited {{not.a.var}}</p>');
    expect(response.body.document.html).not.toContain('script');
    expect(response.body.document.html).not.toContain('onclick');
  });

  it('rejects edits to a document that is no longer a Draft', async () => {
    const app = createApp();
    const created = await createDoc(app);
    documents.get(created.id)!.status = 'Sent';

    await request(app).patch(`/documents/${created.id}`).send({ html: '<p>x</p>' }).expect(409);
  });

  it('rejects an empty update and unknown documents', async () => {
    const app = createApp();
    const created = await createDoc(app);
    await request(app).patch(`/documents/${created.id}`).send({}).expect(400);
    await request(app).patch(`/documents/${String(new Types.ObjectId())}`).send({ html: '<p>x</p>' }).expect(404);
  });
});
