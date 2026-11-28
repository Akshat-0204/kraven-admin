import { Types } from 'mongoose';
import { HttpError } from '../errors/httpError.js';

export function toObjectId(id: string) {
  return new Types.ObjectId(id);
}

/** Throws 400 "Invalid <label> id" when `id` is not a valid ObjectId. Returns the id for chaining. */
export function assertObjectId(id: unknown, label: string): string {
  if (typeof id !== 'string' || !Types.ObjectId.isValid(id) || String(new Types.ObjectId(id)) !== id.toLowerCase()) {
    throw new HttpError(400, `Invalid ${label} id`);
  }
  return id;
}

/** Parses a list-position path param; throws 400 when it is not a non-negative integer. */
export function parseIndex(value: unknown, label: string): number {
  const index = Number(value);
  if (typeof value !== 'string' || value.trim() === '' || !Number.isInteger(index) || index < 0) {
    throw new HttpError(400, `Invalid ${label} index`);
  }
  return index;
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
