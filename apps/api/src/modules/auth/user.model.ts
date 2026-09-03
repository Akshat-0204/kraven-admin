import { Schema, model } from 'mongoose';

export interface UserDocument {
  email: string;
  hashedPassword: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    hashedPassword: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

export const UserModel = model<UserDocument>('User', userSchema);
