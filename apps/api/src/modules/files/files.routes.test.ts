import { Readable } from 'node:stream';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { TEST_USER_ID } from '../../test/mockAuthenticate.js';
import { FileMetadataModel } from './file.model.js';

vi.mock('../../middleware/authenticate.js', async () => {
  const { authenticateAsTestUser } = await import('../../test/mockAuthenticate.js');
  return { authenticate: authenticateAsTestUser };
});

const s3 = mockClient(S3Client);

function storedFile(overrides: Record<string, unknown> = {}) {
  const id = new Types.ObjectId();
  return {
    _id: id,
    bucketKey: `files/${id.toHexString()}`,
    filename: 'brief.pdf',
    contentType: 'application/pdf',
    length: 5,
    clientVisible: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  };
}

describe('files routes', () => {
  beforeEach(() => s3.reset());
  afterEach(() => vi.restoreAllMocks());

  it('uploads to object storage and records metadata', async () => {
    s3.on(PutObjectCommand).resolves({});
    const create = vi
      .spyOn(FileMetadataModel, 'create')
      .mockImplementation((async (doc: Record<string, unknown>) =>
        new FileMetadataModel({ ...doc, createdAt: new Date(), updatedAt: new Date() })) as never);
    const projectId = new Types.ObjectId().toHexString();

    const response = await request(createApp())
      .post('/files')
      .field('associatedEntityType', 'Project')
      .field('associatedEntityId', projectId)
      .attach('file', Buffer.from('hello'), { filename: 'brief.pdf', contentType: 'application/pdf' })
      .expect(201);

    const put = s3.commandCalls(PutObjectCommand)[0].args[0].input;
    const saved = create.mock.calls[0][0] as unknown as Record<string, unknown>;

    expect(put).toMatchObject({ Bucket: env.s3.bucket, ContentType: 'application/pdf' });
    expect(Buffer.from(put.Body as Buffer).toString()).toBe('hello');
    expect(saved.bucketKey).toBe(put.Key);
    expect(put.Key).toBe(`files/${String(saved._id)}`);
    expect(String(saved.uploadedBy)).toBe(TEST_USER_ID);
    expect(response.body.file).toMatchObject({
      id: String(saved._id),
      filename: 'brief.pdf',
      contentType: 'application/pdf',
      length: 5,
      clientVisible: false,
      associatedEntityType: 'Project',
      associatedEntityId: projectId
    });
  });

  it('removes the stored object when metadata cannot be saved', async () => {
    s3.on(PutObjectCommand).resolves({});
    s3.on(DeleteObjectCommand).resolves({});
    vi.spyOn(FileMetadataModel, 'create').mockRejectedValue(new Error('db down'));

    await request(createApp())
      .post('/files')
      .attach('file', Buffer.from('hello'), { filename: 'brief.pdf', contentType: 'application/pdf' })
      .expect(500);

    expect(s3.commandCalls(DeleteObjectCommand)[0].args[0].input.Key).toBe(
      s3.commandCalls(PutObjectCommand)[0].args[0].input.Key
    );
  });

  it('rejects uploads without a file', async () => {
    await request(createApp()).post('/files').field('associatedEntityType', 'Project').expect(400);
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(0);
  });

  it('streams downloads with the original filename', async () => {
    const file = storedFile();
    vi.spyOn(FileMetadataModel, 'findById').mockResolvedValue(new FileMetadataModel(file) as never);
    s3.on(GetObjectCommand, { Key: file.bucketKey }).resolves({ Body: Readable.from(['hello']) as never });

    const response = await request(createApp()).get(`/files/${file._id}`).buffer(true).expect(200);

    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toBe('attachment; filename="brief.pdf"');
    expect(Buffer.from(response.body).toString()).toBe('hello');
  });

  it('returns a short-lived presigned URL', async () => {
    const file = storedFile();
    vi.spyOn(FileMetadataModel, 'findById').mockResolvedValue(new FileMetadataModel(file) as never);

    const response = await request(createApp()).get(`/files/${file._id}/url`).expect(200);
    const url = new URL(response.body.url);

    expect(response.body.expiresIn).toBe(60);
    expect(url.pathname).toBe(`/${env.s3.bucket}/${file.bucketKey}`);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('60');
  });

  it('returns 404 for unknown or malformed ids', async () => {
    vi.spyOn(FileMetadataModel, 'findById').mockResolvedValue(null as never);

    await request(createApp()).get(`/files/${new Types.ObjectId()}`).expect(404);
    await request(createApp()).get('/files/not-an-id').expect(404);
    expect(s3.commandCalls(GetObjectCommand)).toHaveLength(0);
  });
});
