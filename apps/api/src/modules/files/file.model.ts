import { ACTIVITY_ENTITY_TYPES } from '@kraven/config';
import { Schema, model } from 'mongoose';

export interface FileMetadataDocument {
  bucketKey: string;
  filename: string;
  contentType?: string;
  length: number;
  clientVisible: boolean;
  associatedEntityType?: (typeof ACTIVITY_ENTITY_TYPES)[number];
  associatedEntityId?: Schema.Types.ObjectId;
  uploadedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fileMetadataSchema = new Schema<FileMetadataDocument>(
  {
    bucketKey: { type: String, required: true },
    filename: { type: String, required: true, trim: true },
    contentType: { type: String, trim: true },
    length: { type: Number, required: true, min: 0 },
    clientVisible: { type: Boolean, default: false },
    associatedEntityType: { type: String, enum: ACTIVITY_ENTITY_TYPES },
    associatedEntityId: { type: Schema.Types.ObjectId },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// Partial so legacy GridFS-era docs without a bucketKey do not block the index build.
fileMetadataSchema.index(
  { bucketKey: 1 },
  { unique: true, partialFilterExpression: { bucketKey: { $exists: true } } }
);
fileMetadataSchema.index({ associatedEntityType: 1, associatedEntityId: 1 });

export const FileMetadataModel = model<FileMetadataDocument>('FileMetadata', fileMetadataSchema);
