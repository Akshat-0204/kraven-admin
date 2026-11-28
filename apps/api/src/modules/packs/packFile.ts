import { HttpError } from '../../shared/errors/httpError.js';
import { FileMetadataModel } from '../files/file.model.js';
import { PRESIGNED_URL_TTL_SECONDS, presignObject } from '../files/storage.service.js';

/** Presigned download for a file that the caller already verified is in a live pack. */
export async function getPackFileUrl(fileId: string) {
  const file = await FileMetadataModel.findById(fileId).lean();
  if (!file) throw new HttpError(404, 'File not found');
  return { url: await presignObject(file.bucketKey, { filename: file.filename }), expiresIn: PRESIGNED_URL_TTL_SECONDS };
}
