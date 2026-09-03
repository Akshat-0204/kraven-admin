import { INVOICE_PAYMENT_STATUSES } from '@kraven/config';
import { Schema, Types, model, type HydratedDocument, type Model } from 'mongoose';

export interface InvoiceDocument {
  client: Types.ObjectId;
  project?: Types.ObjectId;
  invoiceNumber: string;
  amount: number;
  invoiceDate: Date;
  dueDate: Date;
  paymentStatus: (typeof INVOICE_PAYMENT_STATUSES)[number];
  amountPaid: number;
  remainingAmount: number;
  paymentDate?: Date;
  paymentMethod?: string;
  transactionReferenceId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceHydratedDocument = HydratedDocument<InvoiceDocument>;

const invoiceSchema = new Schema<InvoiceDocument>(
  {
    client: { type: Schema.Types.ObjectId, required: true, ref: 'Client' },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    paymentStatus: { type: String, enum: INVOICE_PAYMENT_STATUSES, default: 'Pending', required: true },
    amountPaid: { type: Number, min: 0, default: 0 },
    remainingAmount: { type: Number, min: 0, default: 0 },
    paymentDate: Date,
    paymentMethod: { type: String, trim: true },
    transactionReferenceId: { type: String, trim: true },
    notes: String
  },
  { timestamps: true }
);

invoiceSchema.pre('validate', function deriveRemainingAmount() {
  this.remainingAmount = Math.max(this.amount - this.amountPaid, 0);
});

invoiceSchema.index({ client: 1 });
invoiceSchema.index({ project: 1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ dueDate: 1 });

export const InvoiceModel: Model<InvoiceDocument> = model<InvoiceDocument>('Invoice', invoiceSchema);
