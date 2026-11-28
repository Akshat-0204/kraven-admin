import { Schema, model } from 'mongoose';

/** UPI payee shown on the client portal's pay page. */
export interface PayeeProfileDocument {
  name: string;
  vpa: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const payeeProfileSchema = new Schema<PayeeProfileDocument>(
  {
    name: { type: String, required: true, trim: true },
    vpa: { type: String, required: true, trim: true, unique: true },
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const PayeeProfileModel = model<PayeeProfileDocument>('PayeeProfile', payeeProfileSchema);
