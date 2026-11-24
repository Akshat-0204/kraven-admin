import type { Readable } from 'node:stream';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ACTIVITY_ENTITY_TYPES } from '@kraven/config';
import { isValidObjectId, Types } from 'mongoose';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { logger } from '../../shared/logger/logger.js';
import { FileMetadataModel } from './file.model.js';

export const PRESIGNED_URL_TTL_SECONDS = 60;

let s3Client: S3Client | undefined;
let presignClient: S3Client | undefined;

function createS3Client(endpoint: string) {
  return new S3Client({
    endpoint,
    region: env.s3.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.s3.accessKey,
      secretAccessKey: env.s3.secretKey
    }
  });
}

/** Client the API uses to talk to object storage (may be an internal hostname). */
export function getS3Client() {
  s3Client ??= createS3Client(env.s3.endpoint);
  return s3Client;
}

/**
 * Client used only to sign download URLs. The host is part of the signature, so URLs handed to
 * browsers must be signed against the publicly reachable endpoint (`S3_PUBLIC_ENDPOINT`).
 */
export function getPresignClient() {
  if (env.s3.publicEndpoint === env.s3.endpoint) return getS3Client();
  presignClient ??= createS3Client(env.s3.publicEndpoint);
  return presignClient;
}

function isNotFound(error: unknown) {
  return (
    error instanceof S3ServiceException &&
    (error.name === 'NoSuchKey' || error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404)
  );
}

export async function ensureBucket() {
  const client = getS3Client();

  try {
    await client.send(new HeadBucketCommand({ Bucket: env.s3.bucket }));
  } catch (error) {
    if (!isNotFound(error)) throw error;

    await client.send(new CreateBucketCommand({ Bucket: env.s3.bucket }));
    logger.info({ bucket: env.s3.bucket }, 'created object storage bucket');
  }
}

export async function putObject(key: string, body: Buffer, contentType?: string) {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length
    })
  );
}

export async function streamObject(key: string): Promise<Readable> {
  try {
    const response = await getS3Client().send(new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }));

    if (!response.Body) {
      throw new HttpError(404, 'File not found');
    }

    return response.Body as Readable;
  } catch (error) {
    if (isNotFound(error)) throw new HttpError(404, 'File not found');
    throw error;
  }
}

function encodeRfc5987(value: string) {
  return encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** `attachment` Content-Disposition with an ASCII-safe `filename` fallback plus the exact UTF-8 name (RFC 6266). */
export function attachmentContentDisposition(filename: string) {
  // `%` is replaced too: some clients percent-decode the plain `filename` parameter.
  const asciiFallback = filename.replace(/[^\x20-\x7e]|["\\%]/g, '_');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeRfc5987(filename)}`;
}

export function presignObject(key: string, options: { filename?: string; expiresIn?: number } = {}) {
  return getSignedUrl(
    getPresignClient(),
    new GetObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      ResponseContentDisposition: options.filename ? attachmentContentDisposition(options.filename) : undefined
    }),
    { expiresIn: options.expiresIn ?? PRESIGNED_URL_TTL_SECONDS }
  );
}

export async function deleteObject(key: string) {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: key }));
}

interface StoreFileInput {
  file: Express.Multer.File;
  associatedEntityType?: (typeof ACTIVITY_ENTITY_TYPES)[number];
  associatedEntityId?: string;
  uploadedBy?: string;
}

export async function storeFile(input: StoreFileInput) {
  const id = new Types.ObjectId();
  const bucketKey = `files/${id.toHexString()}`;

  await putObject(bucketKey, input.file.buffer, input.file.mimetype);

  try {
    return await FileMetadataModel.create({
      _id: id,
      bucketKey,
      filename: input.file.originalname,
      contentType: input.file.mimetype,
      length: input.file.size,
      associatedEntityType: input.associatedEntityType,
      associatedEntityId: input.associatedEntityId ? new Types.ObjectId(input.associatedEntityId) : undefined,
      uploadedBy: input.uploadedBy ? new Types.ObjectId(input.uploadedBy) : undefined
    });
  } catch (error) {
    await deleteObject(bucketKey).catch((cleanupError: unknown) => {
      logger.warn({ error: cleanupError, bucketKey }, 'failed to remove orphaned object');
    });
    throw error;
  }
}

export async function getFileMetadata(id: string) {
  const metadata = isValidObjectId(id) ? await FileMetadataModel.findById(id) : null;

  if (!metadata) {
    throw new HttpError(404, 'File not found');
  }

  return metadata;
}

export async function openFileDownload(id: string) {
  const metadata = await getFileMetadata(id);

  return {
    metadata,
    stream: await streamObject(metadata.bucketKey)
  };
}

export async function getFileDownloadUrl(id: string) {
  const metadata = await getFileMetadata(id);

  return {
    url: await presignObject(metadata.bucketKey, { filename: metadata.filename }),
    expiresIn: PRESIGNED_URL_TTL_SECONDS
  };
}
