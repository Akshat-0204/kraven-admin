import type { AuthUser } from '@kraven/types';
import { compare, hash } from 'bcrypt';
import { Types } from 'mongoose';
import { HttpError } from '../../shared/errors/httpError.js';
import { UserModel } from './user.model.js';

export async function verifyLogin(email: string, password: string): Promise<AuthUser> {
  const user = await UserModel.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const passwordMatches = await compare(password, user.hashedPassword);

  if (!passwordMatches) {
    throw new HttpError(401, 'Invalid email or password');
  }

  return toAuthUser(user._id, user.email);
}

export async function getSessionUser(userId: string): Promise<AuthUser> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new HttpError(401, 'Authentication required');
  }

  const user = await UserModel.findById(userId);

  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }

  return toAuthUser(user._id, user.email);
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new HttpError(401, 'Authentication required');
  }

  const user = await UserModel.findById(userId);

  if (!user) {
    throw new HttpError(401, 'Authentication required');
  }

  const passwordMatches = await compare(currentPassword, user.hashedPassword);

  if (!passwordMatches) {
    throw new HttpError(400, 'Current password is incorrect');
  }

  user.hashedPassword = await hash(newPassword, 12);
  await user.save();
}

function toAuthUser(id: unknown, email: string): AuthUser {
  return {
    id: String(id),
    email
  };
}
