import { DOCUMENT_STATUSES } from '@kraven/config';
import { Schema, Types, model } from 'mongoose';

export interface DocumentDocument {
  title: string;
  client: Types.ObjectId;
  project?: Types.ObjectId;
  template: Types.ObjectId;
  templateVersion: number;
  /** Print-ready HTML rendered when the document was created. Template edits never touch it. */
  html: string;
  status: (typeof DOCUMENT_STATUSES)[number];
  /** Object key of the generated PDF (`documents/<id>.pdf`). */
  pdfKey?: string;
  /** SHA-256 of the `html` the stored PDF was generated from; a mismatch means the PDF is stale. */
  pdfSourceHash?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<DocumentDocument>(
  {
    title: { type: String, required: true, trim: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    template: { type: Schema.Types.ObjectId, ref: 'DocumentTemplate', required: true },
    templateVersion: { type: Number, required: true, min: 1 },
    html: { type: String, required: true },
    status: { type: String, enum: DOCUMENT_STATUSES, default: 'Draft', required: true },
    pdfKey: String,
    pdfSourceHash: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

documentSchema.index({ client: 1, createdAt: -1 });
documentSchema.index({ project: 1, createdAt: -1 });

export const DocumentModel = model<DocumentDocument>('Document', documentSchema);
