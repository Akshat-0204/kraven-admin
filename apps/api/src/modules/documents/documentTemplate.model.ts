import { DOCUMENT_TEMPLATE_TYPES } from '@kraven/config';
import { Schema, model } from 'mongoose';

export interface DocumentTemplateDocument {
  name: string;
  type: (typeof DOCUMENT_TEMPLATE_TYPES)[number];
  /** Link to the template Google Doc, edited by hand in Google. */
  googleDocUrl: string;
  /** Drive file id parsed from `googleDocUrl`. */
  googleFileId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const documentTemplateSchema = new Schema<DocumentTemplateDocument>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: DOCUMENT_TEMPLATE_TYPES, required: true },
    googleDocUrl: { type: String, required: true, trim: true },
    googleFileId: { type: String, required: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

documentTemplateSchema.index({ name: 1 });

export const DocumentTemplateModel = model<DocumentTemplateDocument>('DocumentTemplate', documentTemplateSchema);
