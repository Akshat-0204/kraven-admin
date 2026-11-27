import { DOCUMENT_STATUSES } from '@kraven/config';
import { Schema, Types, model } from 'mongoose';

export interface DocumentDocument {
  title: string;
  /** Optional while Draft; required to share. */
  client?: Types.ObjectId;
  project?: Types.ObjectId;
  /** Unset for blank documents. */
  template?: Types.ObjectId;
  templateVersion?: number;
  /**
   * Body HTML (no print shell; wrapped at render time). Unmerged, with `{{variable}}` placeholders,
   * while Draft; merged at share. Legacy documents may still hold a full print shell.
   */
  html: string;
  headerHtml: string;
  footerHtml: string;
  /** When variables were merged into html/header/footer (at share). */
  mergedAt?: Date;
  status: (typeof DOCUMENT_STATUSES)[number];
  /** Object key of the generated PDF (`documents/<id>.pdf`). */
  pdfKey?: string;
  /** SHA-256 of the rendered source the stored PDF was generated from; a mismatch means the PDF is stale. */
  pdfSourceHash?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<DocumentDocument>(
  {
    title: { type: String, required: true, trim: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    template: { type: Schema.Types.ObjectId, ref: 'DocumentTemplate' },
    templateVersion: { type: Number, min: 1 },
    html: { type: String, default: '' },
    headerHtml: { type: String, default: '' },
    footerHtml: { type: String, default: '' },
    mergedAt: Date,
    status: { type: String, enum: DOCUMENT_STATUSES, default: 'Draft', required: true },
    pdfKey: String,
    pdfSourceHash: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

documentSchema.index({ client: 1, createdAt: -1 });
documentSchema.index({ project: 1, createdAt: -1 });
documentSchema.index({ createdAt: -1 });

export const DocumentModel = model<DocumentDocument>('Document', documentSchema);
