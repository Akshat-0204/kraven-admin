import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileUploadMetadataSchema } from '@kraven/validation';
import type { Request, Response } from 'express';
import { HttpError } from '../../shared/errors/httpError.js';
import { logger } from '../../shared/logger/logger.js';
import {
  attachmentContentDisposition,
  getFileDownloadUrl,
  listEntityFiles,
  openFileDownload,
  setFileClientVisible,
  storeFile
} from './storage.service.js';
import { serializeFileMetadata } from './files.serializer.js';

export async function uploadFile(req: Request, res: Response) {
  if (!req.file) {
    throw new HttpError(400, 'No file uploaded (field "file")', { file: 'Attach a file in the "file" field' });
  }

  const metadataInput = fileUploadMetadataSchema.parse(req.body);

  const metadata = await storeFile({
    file: req.file,
    associatedEntityType: metadataInput.associatedEntityType,
    associatedEntityId: metadataInput.associatedEntityId,
    uploadedBy: req.session.userId
  });

  res.status(201).json({ file: serializeFileMetadata(metadata) });
}

export async function downloadFile(req: Request, res: Response) {
  const { metadata, stream } = await openFileDownload(req.params.id);

  res.setHeader('Content-Type', metadata.contentType ?? 'application/octet-stream');
  res.setHeader('Content-Disposition', attachmentContentDisposition(metadata.filename));
  await pipeStreamToResponse(stream, res, { fileId: req.params.id });
}

/**
 * Pipes an object body to the response. `pipeline` destroys the S3 body if the client aborts,
 * so the connection to object storage is released. Client aborts are expected and not logged.
 */
export async function pipeStreamToResponse(stream: Readable, res: Response, context: Record<string, unknown>) {
  try {
    await pipeline(stream, res);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      logger.error({ error, ...context }, 'download stream failed');
    }
  }
}

export async function getDownloadUrl(req: Request, res: Response) {
  res.json(await getFileDownloadUrl(req.params.id));
}

export async function listFiles(req: Request, res: Response) {
  res.json({ files: (await listEntityFiles(req.query)).map(serializeFileMetadata) });
}

export async function updateFileVisibility(req: Request, res: Response) {
  res.json({ file: serializeFileMetadata(await setFileClientVisible(req.params.id, req.body)) });
}
