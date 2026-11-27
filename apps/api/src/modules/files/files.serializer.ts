import type { FileMetadataRecord } from '@kraven/types';
import type { FileMetadataDocument } from './file.model.js';

export function serializeFileMetadata(file: FileMetadataDocument & { _id: unknown }): FileMetadataRecord {
  return {
    id: String(file._id),
    filename: file.filename,
    contentType: file.contentType,
    length: file.length,
    clientVisible: file.clientVisible ?? false,
    category: file.category,
    sourceDocument: file.sourceDocument ? String(file.sourceDocument) : undefined,
    associatedEntityType: file.associatedEntityType,
    associatedEntityId: file.associatedEntityId ? String(file.associatedEntityId) : undefined,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString()
  };
}
