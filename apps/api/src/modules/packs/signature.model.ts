import { Schema, Types, model } from 'mongoose';

export interface SignatureDocument {
  document: Types.ObjectId;
  client: Types.ObjectId;
  signerName: string;
  method: 'typed' | 'drawn';
  consent: boolean;
  signedAt: Date;
  ip: string;
  userAgent: string;
  originalSha256: string;
  sealedSha256: string;
  sealedKey: string;
}

const signatureSchema = new Schema<SignatureDocument>({
  // Unique: a document can be signed exactly once.
  document: { type: Schema.Types.ObjectId, ref: 'Document', required: true, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  signerName: { type: String, required: true },
  method: { type: String, enum: ['typed', 'drawn'], required: true },
  consent: { type: Boolean, required: true },
  signedAt: { type: Date, required: true },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  originalSha256: { type: String, required: true },
  sealedSha256: { type: String, required: true },
  sealedKey: { type: String, required: true }
});

export const SignatureModel = model<SignatureDocument>('Signature', signatureSchema);
