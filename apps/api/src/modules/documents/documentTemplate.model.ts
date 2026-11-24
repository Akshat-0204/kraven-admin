import { DOCUMENT_TEMPLATE_TYPES } from '@kraven/config';
import { Schema, model } from 'mongoose';

export interface DocumentTemplateDocument {
  name: string;
  type: (typeof DOCUMENT_TEMPLATE_TYPES)[number];
  /** Sanitized HTML with `{{variable}}` placeholders. */
  html: string;
  /** Variable keys referenced by `html`, recomputed on every save. */
  variables: string[];
  /** Starts at 1 and increments on every edit; documents record the version they were rendered from. */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const documentTemplateSchema = new Schema<DocumentTemplateDocument>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: DOCUMENT_TEMPLATE_TYPES, required: true },
    html: { type: String, default: '' },
    variables: { type: [String], default: [] },
    version: { type: Number, required: true, default: 1, min: 1 }
  },
  { timestamps: true }
);

documentTemplateSchema.index({ name: 1 });

export const DocumentTemplateModel = model<DocumentTemplateDocument>('DocumentTemplate', documentTemplateSchema);
