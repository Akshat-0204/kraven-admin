import { Readable } from 'node:stream';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/errors/httpError.js';
import {
  deleteObject,
  ensureBucket,
  presignObject,
  putObject,
  streamObject
} from './storage.service.js';

const s3 = mockClient(S3Client);

async function readAll(stream: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString();
}

describe('storage service', () => {
  beforeEach(() => s3.reset());
  afterEach(() => s3.reset());

  it('creates the bucket when it does not exist', async () => {
    s3.on(HeadBucketCommand).rejects(new NotFound({ message: 'missing', $metadata: { httpStatusCode: 404 } }));
    s3.on(CreateBucketCommand).resolves({});

    await ensureBucket();

    expect(s3.commandCalls(CreateBucketCommand)).toHaveLength(1);
    expect(s3.commandCalls(CreateBucketCommand)[0].args[0].input).toEqual({ Bucket: env.s3.bucket });
  });

  it('leaves an existing bucket alone', async () => {
    s3.on(HeadBucketCommand).resolves({});

    await ensureBucket();

    expect(s3.commandCalls(CreateBucketCommand)).toHaveLength(0);
  });

  it('rethrows bucket errors other than not-found', async () => {
    s3.on(HeadBucketCommand).rejects(new Error('connection refused'));

    await expect(ensureBucket()).rejects.toThrow('connection refused');
    expect(s3.commandCalls(CreateBucketCommand)).toHaveLength(0);
  });

  it('puts objects into the configured bucket', async () => {
    s3.on(PutObjectCommand).resolves({});

    await putObject('files/abc', Buffer.from('hello'), 'text/plain');

    expect(s3.commandCalls(PutObjectCommand)[0].args[0].input).toMatchObject({
      Bucket: env.s3.bucket,
      Key: 'files/abc',
      ContentType: 'text/plain',
      ContentLength: 5
    });
  });

  it('streams object bodies', async () => {
    s3.on(GetObjectCommand, { Key: 'files/abc' }).resolves({ Body: Readable.from(['hello']) as never });

    expect(await readAll(await streamObject('files/abc'))).toBe('hello');
  });

  it('maps a missing object to a 404', async () => {
    s3.on(GetObjectCommand).rejects(new NoSuchKey({ message: 'missing', $metadata: { httpStatusCode: 404 } }));

    const error = await streamObject('files/missing').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(404);
  });

  it('presigns short-lived download URLs with an attachment filename', async () => {
    const url = new URL(await presignObject('files/abc', { filename: 'report v1.pdf' }));

    expect(url.pathname).toBe(`/${env.s3.bucket}/files/abc`);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('60');
    expect(url.searchParams.get('response-content-disposition')).toBe(
      "attachment; filename*=UTF-8''report%20v1.pdf"
    );
  });

  it('deletes objects', async () => {
    s3.on(DeleteObjectCommand).resolves({});

    await deleteObject('files/abc');

    expect(s3.commandCalls(DeleteObjectCommand)[0].args[0].input).toEqual({
      Bucket: env.s3.bucket,
      Key: 'files/abc'
    });
  });
});
