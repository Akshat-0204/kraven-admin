import { PACK_ITEM_KINDS, PACK_PAYMENT_STATUSES, PACK_STATUSES } from '@kraven/config';
import { Schema, Types, model } from 'mongoose';

export interface PackItemDocument {
  _id: Types.ObjectId;
  kind: (typeof PACK_ITEM_KINDS)[number];
  document?: Types.ObjectId;
  file?: Types.ObjectId;
  label?: string;
  amount?: number;
  reference?: string;
  paymentStatus?: (typeof PACK_PAYMENT_STATUSES)[number];
}

export interface PackDocument {
  client: Types.ObjectId;
  project?: Types.ObjectId;
  title: string;
  items: PackItemDocument[];
  status: (typeof PACK_STATUSES)[number];
  expiresAt?: Date;
  sentAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const packItemSchema = new Schema<PackItemDocument>({
  kind: { type: String, enum: PACK_ITEM_KINDS, required: true },
  document: { type: Schema.Types.ObjectId, ref: 'Document' },
  file: { type: Schema.Types.ObjectId, ref: 'FileMetadata' },
  label: String,
  amount: { type: Number, min: 0 },
  reference: String,
  // Set by admins only; the portal can never change it.
  paymentStatus: { type: String, enum: PACK_PAYMENT_STATUSES }
});

const packSchema = new Schema<PackDocument>(
  {
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    title: { type: String, required: true, trim: true },
    items: { type: [packItemSchema], default: [] },
    status: { type: String, enum: PACK_STATUSES, default: 'Draft', required: true },
    expiresAt: Date,
    sentAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

packSchema.index({ client: 1, createdAt: -1 });

export const PackModel = model<PackDocument>('Pack', packSchema);
