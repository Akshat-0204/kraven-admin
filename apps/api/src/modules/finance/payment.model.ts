import { Schema, model } from 'mongoose';

export interface PaymentDocument {
  invoice: Schema.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod?: string;
  transactionReferenceId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    invoice: { type: Schema.Types.ObjectId, required: true, ref: 'Invoice' },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true },
    paymentMethod: { type: String, trim: true },
    transactionReferenceId: { type: String, trim: true },
    notes: String
  },
  { timestamps: true }
);

paymentSchema.index({ invoice: 1 });
paymentSchema.index({ paymentDate: 1 });

export const PaymentModel = model<PaymentDocument>('Payment', paymentSchema);
