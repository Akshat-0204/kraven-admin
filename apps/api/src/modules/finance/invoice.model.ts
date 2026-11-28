import { INVOICE_PAYMENT_STATUSES } from '@kraven/config';
import { Schema, Types, model, type HydratedDocument, type Model } from 'mongoose';

export interface InvoiceDocument {
  client: Types.ObjectId;
  project?: Types.ObjectId;
  invoiceNumber: string;
  amount: number;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  /** When the reminder job last emailed about this overdue invoice. */
  lastRemindedAt?: Date;
  invoiceDate: Date;
  dueDate: Date;
  paymentStatus: (typeof INVOICE_PAYMENT_STATUSES)[number];
  amountPaid: number;
  remainingAmount: number;
  paymentDate?: Date;
  paymentMethod?: string;
  transactionReferenceId?: string;
  notes?: string;
  /** UPI payee for this invoice; the default payee profile applies when unset. */
  payeeProfile?: Types.ObjectId | null;
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
    lineItems: {
      type: [
        new Schema(
          {
            description: { type: String, required: true, trim: true },
            quantity: { type: Number, required: true, min: 0 },
            unitPrice: { type: Number, required: true, min: 0 }
          },
          { _id: false }
        )
      ],
      default: []
    },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    subtotal: { type: Number, min: 0, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    lastRemindedAt: Date,
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    paymentStatus: { type: String, enum: INVOICE_PAYMENT_STATUSES, default: 'Pending', required: true },
    amountPaid: { type: Number, min: 0, default: 0 },
    remainingAmount: { type: Number, min: 0, default: 0 },
    paymentDate: Date,
    paymentMethod: { type: String, trim: true },
    transactionReferenceId: { type: String, trim: true },
    notes: String,
    payeeProfile: { type: Schema.Types.ObjectId, ref: 'PayeeProfile' }
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
