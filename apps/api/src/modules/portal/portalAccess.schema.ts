import { Schema } from 'mongoose';

/** Client portal access, embedded on the Client. Only a bcrypt hash of the access code is stored. */
export interface PortalAccess {
  slug?: string;
  codeHash?: string;
  enabled: boolean;
  expiresAt?: Date;
  /** Bumped on code rotation and revoke; portal cookies carry it and stop working when it changes. */
  accessVersion: number;
  failedAttempts: number;
  lockedUntil?: Date;
  codeUpdatedAt?: Date;
  lastLoginAt?: Date;
  lastViewedAt?: Date;
}

export const portalAccessSchema = new Schema<PortalAccess>(
  {
    slug: { type: String, trim: true, lowercase: true },
    codeHash: { type: String, select: false },
    enabled: { type: Boolean, default: false },
    expiresAt: Date,
    accessVersion: { type: Number, default: 0, min: 0 },
    failedAttempts: { type: Number, default: 0, min: 0 },
    lockedUntil: Date,
    codeUpdatedAt: Date,
    lastLoginAt: Date,
    lastViewedAt: Date
  },
  { _id: false }
);
