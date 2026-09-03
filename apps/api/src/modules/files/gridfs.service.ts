import { Readable } from 'node:stream';
import { ACTIVITY_ENTITY_TYPES } from '@kraven/config';
import mongoose, { mongo, Types } from 'mongoose';
import { HttpError } from '../../shared/errors/httpError.js';
import { FileMetadataModel } from './file.model.js';

interface StoreFileInput {
  file: Express.Multer.File;
  associatedEntityType?: (typeof ACTIVITY_ENTITY_TYPES)[number];
  associatedEntityId?: string;
  uploadedBy?: string;
}

function getBucket() {
  if (!mongoose.connection.db) {
    throw new HttpError(503, 'File storage is unavailable until MongoDB is connected');
  }

  return new mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'files' });
}

export async function storeFile(input: StoreFileInput) {
  const bucket = getBucket();
  const uploadStream = bucket.openUploadStream(input.file.originalname, {
    contentType: input.file.mimetype
  });

  await new Promise<void>((resolve, reject) => {
    Readable.from([input.file.buffer]).pipe(uploadStream).on('error', reject).on('finish', resolve);
  });

  return FileMetadataModel.create({
    gridFsId: uploadStream.id,
    filename: input.file.originalname,
    contentType: input.file.mimetype,
    length: input.file.size,
    associatedEntityType: input.associatedEntityType,
    associatedEntityId: input.associatedEntityId ? new Types.ObjectId(input.associatedEntityId) : undefined,
    uploadedBy: input.uploadedBy ? new Types.ObjectId(input.uploadedBy) : undefined
  });
}

export async function getFileMetadata(id: string) {
  const metadata = await FileMetadataModel.findById(id);

  if (!metadata) {
    throw new HttpError(404, 'File not found');
  }

  return metadata;
}

export async function openFileDownload(id: string) {
  const metadata = await getFileMetadata(id);
  const bucket = getBucket();

  return {
    metadata,
    stream: bucket.openDownloadStream(metadata.gridFsId as unknown as Types.ObjectId)
  };
}
