import { DOCUMENT_ACCESS_ROLES, DOCUMENT_STATUSES, DOCUMENT_TEMPLATE_TYPES } from '@kraven/config';
import { Schema, Types, model } from 'mongoose';

export interface DocumentAccessDoc {
  email: string;
  role: (typeof DOCUMENT_ACCESS_ROLES)[number];
  permissionId?: string;
}

export interface DocumentDocument {
  title: string;
  type?: (typeof DOCUMENT_TEMPLATE_TYPES)[number];
  /** Optional while Draft; required to share. */
  client?: Types.ObjectId;
  project?: Types.ObjectId;
  /** Unset for blank documents. */
  template?: Types.ObjectId;
  /** The Google Doc (a Drive copy of the template). Content lives in Google. */
  googleFileId: string;
  webViewLink: string;
  status: (typeof DOCUMENT_STATUSES)[number];
  access: DocumentAccessDoc[];
  lockedAt?: Date;
  /** Latest exported or snapshot PDF. */
  pdfFile?: Types.ObjectId;
  /** Drive headRevisionId when `pdfFile` was exported; a mismatch means the PDF is stale. */
  pdfRevisionId?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const accessSchema = new Schema<DocumentAccessDoc>(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, enum: DOCUMENT_ACCESS_ROLES, required: true },
    permissionId: String
  },
  { _id: false }
);

const documentSchema = new Schema<DocumentDocument>(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: DOCUMENT_TEMPLATE_TYPES },
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    template: { type: Schema.Types.ObjectId, ref: 'DocumentTemplate' },
    googleFileId: { type: String, required: true },
    webViewLink: { type: String, required: true },
    status: { type: String, enum: DOCUMENT_STATUSES, default: 'Draft', required: true },
    access: { type: [accessSchema], default: [] },
    lockedAt: Date,
    pdfFile: { type: Schema.Types.ObjectId, ref: 'FileMetadata' },
    pdfRevisionId: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

documentSchema.index({ client: 1, createdAt: -1 });
documentSchema.index({ project: 1, createdAt: -1 });
documentSchema.index({ createdAt: -1 });

export const DocumentModel = model<DocumentDocument>('Document', documentSchema);
