import { LEAD_STATUSES } from '@kraven/config';
import { Schema, Types, model } from 'mongoose';

export interface LeadDocument {
  name: string;
  companyName: string;
  email?: string;
  phone?: string;
  leadSource?: string;
  serviceInterested?: string;
  estimatedValue?: number;
  assignedPerson?: string;
  dateCreated: Date;
  lastContactedDate?: Date;
  nextFollowUpDate?: Date;
  status: (typeof LEAD_STATUSES)[number];
  notes?: string;
  convertedClient?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<LeadDocument>(
  {
    name: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    leadSource: { type: String, trim: true },
    serviceInterested: { type: String, trim: true },
    estimatedValue: { type: Number, min: 0 },
    assignedPerson: { type: String, trim: true },
    dateCreated: { type: Date, default: Date.now },
    lastContactedDate: Date,
    nextFollowUpDate: Date,
    status: { type: String, enum: LEAD_STATUSES, default: 'New', required: true },
    notes: String,
    convertedClient: { type: Schema.Types.ObjectId, ref: 'Client' }
  },
  { timestamps: true }
);

leadSchema.index({ status: 1 });
leadSchema.index({ companyName: 1 });
leadSchema.index({ nextFollowUpDate: 1 });

export const LeadModel = model<LeadDocument>('Lead', leadSchema);
