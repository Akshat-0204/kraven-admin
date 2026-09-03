import { Schema } from 'mongoose';

export const linkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true }
  },
  { _id: false }
);

export const fileReferenceSchema = new Schema(
  {
    fileId: { type: Schema.Types.ObjectId, required: true, ref: 'FileMetadata' },
    filename: { type: String, required: true, trim: true },
    contentType: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);
