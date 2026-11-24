import { Schema, Types, model } from 'mongoose';
import { fileReferenceSchema, linkSchema } from '../../shared/schemas/common.js';
import { type PortalAccess, portalAccessSchema } from '../portal/portalAccess.schema.js';

export interface ClientDocument {
  companyName: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  industry?: string;
  taxInfo?: string;
  notes?: string;
  requirements?: string;
  importantInfo?: string;
  internalNotes?: string;
  links: unknown[];
  documents: unknown[];
  sourceLead?: Types.ObjectId;
  portalAccess?: PortalAccess;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<ClientDocument>(
  {
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    address: String,
    industry: { type: String, trim: true },
    taxInfo: String,
    notes: String,
    requirements: String,
    importantInfo: String,
    internalNotes: String,
    links: { type: [linkSchema], default: [] },
    documents: { type: [fileReferenceSchema], default: [] },
    sourceLead: { type: Schema.Types.ObjectId, ref: 'Lead' },
    portalAccess: { type: portalAccessSchema, default: undefined }
  },
  { timestamps: true }
);

clientSchema.index({ companyName: 'text', contactPerson: 'text', email: 'text' });
clientSchema.index({ sourceLead: 1 });
// Partial so clients without a portal slug do not collide on the unique index.
clientSchema.index(
  { 'portalAccess.slug': 1 },
  { unique: true, partialFilterExpression: { 'portalAccess.slug': { $type: 'string' } } }
);

export const ClientModel = model<ClientDocument>('Client', clientSchema);
