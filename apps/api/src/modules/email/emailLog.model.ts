import { Schema, Types, model } from 'mongoose';

export const EMAIL_TYPES = ['portal-access', 'pack-sent', 'reminder'] as const;
export const EMAIL_STATUSES = ['queued', 'sent', 'delivered', 'opened', 'bounced', 'failed'] as const;

export interface EmailLogDocument {
  to: string;
  type: (typeof EMAIL_TYPES)[number];
  subject: string;
  client?: Types.ObjectId;
  pack?: Types.ObjectId;
  resendId?: string;
  status: (typeof EMAIL_STATUSES)[number];
  error?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emailLogSchema = new Schema<EmailLogDocument>(
  {
    to: { type: String, required: true },
    type: { type: String, enum: EMAIL_TYPES, required: true },
    subject: { type: String, required: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    pack: { type: Schema.Types.ObjectId, ref: 'Pack' },
    resendId: String,
    status: { type: String, enum: EMAIL_STATUSES, default: 'queued', required: true },
    error: String,
    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date
  },
  { timestamps: true }
);

emailLogSchema.index({ client: 1, createdAt: -1 });
emailLogSchema.index({ resendId: 1 });

export const EmailLogModel = model<EmailLogDocument>('EmailLog', emailLogSchema);
