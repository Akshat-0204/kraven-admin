import { Schema, Types, model } from 'mongoose';

export interface GoogleConnectionDocument {
  email: string;
  /** AES-GCM encrypted (see token.crypto.ts). */
  refreshToken: string;
  accessToken?: string;
  expiryDate?: number;
  scopes: string[];
  rootFolderId?: string;
  connectedBy?: Types.ObjectId;
  connectedAt: Date;
  status: 'connected' | 'disconnected';
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const googleConnectionSchema = new Schema<GoogleConnectionDocument>(
  {
    email: { type: String, required: true },
    refreshToken: { type: String, required: true },
    accessToken: String,
    expiryDate: Number,
    scopes: { type: [String], default: [] },
    rootFolderId: String,
    connectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    connectedAt: { type: Date, required: true, default: () => new Date() },
    status: { type: String, enum: ['connected', 'disconnected'], required: true, default: 'connected' },
    lastError: String
  },
  { timestamps: true }
);

/** Single-document collection: the agency's Google connection. */
export const GoogleConnectionModel = model<GoogleConnectionDocument>('GoogleConnection', googleConnectionSchema);
