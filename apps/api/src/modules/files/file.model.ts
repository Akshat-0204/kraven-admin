import { ACTIVITY_ENTITY_TYPES } from '@kraven/config';
import { Schema, model } from 'mongoose';

export interface FileMetadataDocument {
  gridFsId: Schema.Types.ObjectId;
  filename: string;
  contentType?: string;
  length: number;
  associatedEntityType?: (typeof ACTIVITY_ENTITY_TYPES)[number];
  associatedEntityId?: Schema.Types.ObjectId;
  uploadedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fileMetadataSchema = new Schema<FileMetadataDocument>(
  {
    gridFsId: { type: Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true, trim: true },
    contentType: { type: String, trim: true },
    length: { type: Number, required: true, min: 0 },
    associatedEntityType: { type: String, enum: ACTIVITY_ENTITY_TYPES },
    associatedEntityId: { type: Schema.Types.ObjectId },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

fileMetadataSchema.index({ associatedEntityType: 1, associatedEntityId: 1 });
fileMetadataSchema.index({ gridFsId: 1 });

export const FileMetadataModel = model<FileMetadataDocument>('FileMetadata', fileMetadataSchema);
