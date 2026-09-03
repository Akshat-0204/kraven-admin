import { fileUploadMetadataSchema } from '@kraven/validation';
import type { Request, Response } from 'express';
import { HttpError } from '../../shared/errors/httpError.js';
import { openFileDownload, storeFile } from './gridfs.service.js';
import { serializeFileMetadata } from './files.serializer.js';

export async function uploadFile(req: Request, res: Response) {
  if (!req.file) {
    throw new HttpError(400, 'Upload a file');
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
  res.setHeader('Content-Disposition', `attachment; filename="${metadata.filename}"`);
  stream.pipe(res);
}
