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
import { HttpError } from '../../shared/errors/httpError.js';
import { htmlToPdf } from '../pdf/pdf.renderer.js';
import { logActivity } from '../../shared/activity/activity.service.js';

vi.mock('../../middleware/authenticate.js', async () => {
  const { authenticateAsTestUser } = await import('../../test/mockAuthenticate.js');
  return { authenticate: authenticateAsTestUser };
});
vi.mock('../pdf/pdf.renderer.js', () => ({ htmlToPdf: vi.fn() }));
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
        headerHtml: '<p>{{client.company}}</p>',
        footerHtml: '<p>Page {{page.number}} of {{page.total}}</p>',
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
    expect(edited.body.template).toMatchObject({ version: 2, variables: ['client.email', 'client.company'] });
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

  it('creates a Draft with the template body/header/footer unmerged, unaffected by later template edits', async () => {
    const app = createApp();
    const created = await createDoc(app);

    expect(created).toMatchObject({
      title: 'Proposal',
      client: String(clientId),
      project: String(projectId),
      template: String(templateId),
      templateVersion: 1,
      status: 'Draft',
      hasPdf: false,
      html: '<p>Hello {{client.company}} - {{project.name}}</p>',
      headerHtml: '<p>{{client.company}}</p>',
      footerHtml: '<p>Page {{page.number}} of {{page.total}}</p>'
    });
    expect(created.mergedAt).toBeUndefined();
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

  it('creates a blank, unassigned document without logging client activity', async () => {
    vi.mocked(logActivity).mockClear();
    const response = await request(createApp()).post('/documents').send({}).expect(201);
    expect(response.body.document).toMatchObject({ title: 'Untitled document', status: 'Draft', html: '', headerHtml: '', footerHtml: '' });
    expect(response.body.document.client).toBeUndefined();
    expect(response.body.document.template).toBeUndefined();
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('returns legacy full-shell documents body-only', async () => {
    const legacy = DocumentModel.hydrate({
      _id: new Types.ObjectId(),
      title: 'Old',
      client: clientId,
      template: templateId,
      templateVersion: 1,
      html: '<!doctype html><html><head><style>p{}</style></head><body>\n<p>Merged Acme</p>\n</body></html>',
      status: 'Sent',
      ...timestamps
    });
    documents.set(String(legacy._id), legacy);
    const response = await request(createApp()).get(`/documents/${String(legacy._id)}`).expect(200);
    expect(response.body.document.html).toBe('<p>Merged Acme</p>');
  });

  it('resolves the variable registry against the assigned client/project', async () => {
    const app = createApp();
    const created = await createDoc(app);
    const response = await request(app).get(`/documents/${created.id}/variables`).expect(200);
    const byKey = Object.fromEntries(
      response.body.variables.map((variable: { key: string; value: string | null }) => [variable.key, variable])
    );
    expect(byKey['client.company']).toMatchObject({ label: 'Client company', group: 'client', value: 'Acme <Corp>' });
    expect(byKey['project.name'].value).toBe('Website');
    expect(byKey['client.phone'].value).toBeNull();

    const blank = await request(app).post('/documents').send({}).expect(201);
    const unassigned = await request(app).get(`/documents/${blank.body.document.id}/variables`).expect(200);
    const blankByKey = Object.fromEntries(
      unassigned.body.variables.map((variable: { key: string; value: string | null }) => [variable.key, variable.value])
    );
    expect(blankByKey['client.company']).toBeNull();
    expect(blankByKey['agency.name']).toEqual(expect.any(String));
  });

  it('refuses to share a document without a client (422)', async () => {
    const app = createApp();
    const blank = await request(app).post('/documents').send({}).expect(201);
    await request(app).post(`/documents/${blank.body.document.id}/share`).expect(422);
    expect(documents.get(blank.body.document.id)?.status).toBe('Draft');
  });

  it('merges chip spans, plain placeholders and header/footer at share, keeping page tokens', async () => {
    const app = createApp();
    const created = await createDoc(app);
    await request(app)
      .patch(`/documents/${created.id}`)
      .send({ html: '<p>Dear <span data-variable="client.company">{{client.company}}</span>, re {{project.name}}</p>' })
      .expect(200);

    const shared = await request(app).post(`/documents/${created.id}/share`).expect(200);
    expect(shared.body.document).toMatchObject({
      status: 'Sent',
      html: '<p>Dear Acme &lt;Corp&gt;, re Website</p>',
      headerHtml: '<p>Acme &lt;Corp&gt;</p>',
      footerHtml: '<p>Page {{page.number}} of {{page.total}}</p>'
    });
    expect(shared.body.document.mergedAt).toEqual(expect.any(String));
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'document-shared', entityId: String(clientId) }));
  });

  it('keeps span-wrapped page tokens in header/footer through share and the PDF band templates', async () => {
    vi.mocked(htmlToPdf).mockClear().mockResolvedValue(pdfBytes);
    s3.on(PutObjectCommand).resolves({});
    const { buildBandTemplate } = await vi.importActual<typeof import('../pdf/pdf.renderer.js')>('../pdf/pdf.renderer.js');
    const app = createApp();
    const created = await createDoc(app);
    const chip = (key: string) => `<span data-variable="${key}">{{${key}}}</span>`;
    await request(app)
      .patch(`/documents/${created.id}`)
      .send({
        headerHtml: `<p>${chip('client.company')} · ${chip('page.number')}</p>`,
        footerHtml: `<p>Page ${chip('page.number')} of ${chip('page.total')}</p>`
      })
      .expect(200);
    expect(documents.get(created.id)?.footerHtml).toBe(`<p>Page ${chip('page.number')} of ${chip('page.total')}</p>`);

    const shared = await request(app).post(`/documents/${created.id}/share`).expect(200);
    expect(shared.body.document).toMatchObject({
      headerHtml: '<p>Acme &lt;Corp&gt; · {{page.number}}</p>',
      footerHtml: '<p>Page {{page.number}} of {{page.total}}</p>'
    });

    await request(app).post(`/documents/${created.id}/pdf`).expect(200);
    const options = vi.mocked(htmlToPdf).mock.calls[0][1];
    const header = buildBandTemplate(options?.document?.headerHtml ?? '', 'header');
    const footer = buildBandTemplate(options?.document?.footerHtml ?? '', 'footer');
    expect(header).toContain('Acme &lt;Corp&gt; · <span class="pageNumber"></span>');
    expect(footer).toContain('Page <span class="pageNumber"></span> of <span class="totalPages"></span>');
    expect(footer).not.toContain('{{');
  });

  it('renders a Draft PDF with live values, [Label] for missing ones and the header/footer bands', async () => {
    vi.mocked(htmlToPdf).mockClear().mockResolvedValue(pdfBytes);
    s3.on(PutObjectCommand).resolves({});
    const app = createApp();
    const created = await request(app).post('/documents').send({ template: String(templateId), client: String(clientId) }).expect(201);

    await request(app).post(`/documents/${created.body.document.id}/pdf`).expect(200);
    const [html, options] = vi.mocked(htmlToPdf).mock.calls[0];
    expect(html).toContain('<div class="document-content">');
    expect(html).toContain('Hello Acme &lt;Corp&gt; - [Project name]');
    expect(options?.document).toEqual({
      headerHtml: '<p>Acme &lt;Corp&gt;</p>',
      footerHtml: '<p>Page {{page.number}} of {{page.total}}</p>'
    });
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
    const fetchMock = vi.mocked(htmlToPdf).mockClear().mockResolvedValue(pdfBytes);
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

  it('maps a PDF render failure to 502 without storing anything', async () => {
    vi.mocked(htmlToPdf).mockRejectedValue(new HttpError(502, 'PDF generation failed'));
    const app = createApp();
    const created = await createDoc(app);

    await request(app).post(`/documents/${created.id}/pdf`).expect(502);
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(0);
    expect(documents.get(created.id)?.pdfKey).toBeUndefined();
  });

  it('streams the PDF only after it has been generated', async () => {
    vi.mocked(htmlToPdf).mockResolvedValue(pdfBytes);
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

  it('lists documents with filters, title search and pagination, populating client and template', async () => {
    const populated = DocumentModel.hydrate({
      _id: new Types.ObjectId(),
      title: 'Proposal',
      status: 'Draft',
      ...timestamps
    });
    populated.set('client', { _id: clientId, companyName: 'Acme <Corp>' }, { strict: false });
    const chain = {
      select: vi.fn(() => chain),
      populate: vi.fn(() => chain),
      sort: vi.fn(() => chain),
      skip: vi.fn(() => chain),
      limit: vi.fn(async () => [populated])
    };
    const find = vi.spyOn(DocumentModel, 'find').mockReturnValue(chain as never);
    vi.spyOn(DocumentModel, 'countDocuments').mockResolvedValue(51 as never);

    const response = await request(createApp()).get(`/documents?client=${String(clientId)}&q=prop.&page=2&limit=25`).expect(200);
    expect(find).toHaveBeenCalledWith({ client: String(clientId), title: { $regex: 'prop\\.', $options: 'i' } });
    expect(chain.select).toHaveBeenCalledWith('-html -headerHtml -footerHtml');
    expect(chain.populate).toHaveBeenCalledWith('client', 'companyName');
    expect(chain.populate).toHaveBeenCalledWith('template', 'name');
    expect(chain.skip).toHaveBeenCalledWith(25);
    expect(chain.limit).toHaveBeenCalledWith(25);
    expect(response.body).toMatchObject({ total: 51, page: 2, limit: 25 });
    expect(response.body.documents[0]).toMatchObject({ title: 'Proposal', template: null });
    expect(response.body.documents[0].html).toBeUndefined();

    await request(createApp()).get('/documents').expect(200);
    expect(find).toHaveBeenLastCalledWith({});
    await request(createApp()).get('/documents?client=bogus').expect(200, { documents: [], total: 0, page: 1, limit: 50 });
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

  it('edits a Draft and stores sanitized body-only HTML, header and footer', async () => {
    const app = createApp();
    const created = await createDoc(app);

    const response = await request(app)
      .patch(`/documents/${created.id}`)
      .send({
        html: '<p onclick="x()">Edited {{not.a.var}}</p><script>alert(1)</script><div data-page-break="true"></div>',
        headerHtml: '<p><img src="data:image/png;base64,AAAA" onerror="x()"> Logo</p>',
        footerHtml: '<p>{{page.number}}</p>',
        title: 'Renamed'
      })
      .expect(200);

    expect(response.body.document).toMatchObject({
      title: 'Renamed',
      html: '<p>Edited {{not.a.var}}</p><div data-page-break="true"></div>',
      headerHtml: '<p><img src="data:image/png;base64,AAAA" /> Logo</p>',
      footerHtml: '<p>{{page.number}}</p>'
    });
    expect(documents.get(created.id)?.html).not.toContain('<!doctype html>');
  });

  it('rejects page tokens in the body', async () => {
    const app = createApp();
    const created = await createDoc(app);
    await request(app).patch(`/documents/${created.id}`).send({ html: '<p>Page {{ page.number }}</p>' }).expect(400);
    await request(app)
      .patch(`/documents/${created.id}`)
      .send({ html: '<p>Page <span data-variable="page.total"></span></p>' })
      .expect(400);
    await request(createApp())
      .post('/document-templates')
      .send({ name: 'Bad', type: 'Other', html: '<p>{{page.total}}</p>' })
      .expect(400);
    const ok = await request(createApp())
      .post('/document-templates')
      .send({ name: 'Ok', type: 'Other', html: '<p>x</p>', footerHtml: '<p>{{page.number}} / {{page.total}} {{client.email}}</p>' })
      .expect(201);
    expect(ok.body.template).toMatchObject({ footerHtml: '<p>{{page.number}} / {{page.total}} {{client.email}}</p>', variables: ['client.email'] });
  });

  it('assigns and unassigns the client and project', async () => {
    const app = createApp();
    const blank = (await request(app).post('/documents').send({}).expect(201)).body.document as { id: string };

    const assigned = await request(app)
      .patch(`/documents/${blank.id}`)
      .send({ client: String(clientId), project: String(projectId) })
      .expect(200);
    expect(assigned.body.document).toMatchObject({ client: String(clientId), project: String(projectId) });

    await request(app).patch(`/documents/${blank.id}`).send({ client: String(otherClientId) }).expect(404);

    const cleared = await request(app).patch(`/documents/${blank.id}`).send({ client: null }).expect(200);
    expect(cleared.body.document.client).toBeUndefined();
    expect(cleared.body.document.project).toBeUndefined();
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
