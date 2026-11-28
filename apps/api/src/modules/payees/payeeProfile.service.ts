import type { PayeeProfileRecord, PortalPayee } from '@kraven/types';
import { payeeProfileSchema, updatePayeeProfileSchema } from '@kraven/validation';
import { isValidObjectId } from 'mongoose';
import { HttpError } from '../../shared/errors/httpError.js';
import { PayeeProfileModel, type PayeeProfileDocument } from './payeeProfile.model.js';

export function serializePayeeProfile(profile: PayeeProfileDocument & { _id: unknown }): PayeeProfileRecord {
  return {
    id: String(profile._id),
    name: profile.name,
    vpa: profile.vpa,
    isDefault: profile.isDefault ?? false,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

export function listPayeeProfiles() {
  return PayeeProfileModel.find().sort({ isDefault: -1, name: 1 }).lean();
}

async function getPayeeProfile(id: string) {
  if (!isValidObjectId(id)) throw new HttpError(404, 'Payee profile not found');
  const profile = await PayeeProfileModel.findById(id);
  if (!profile) throw new HttpError(404, 'Payee profile not found');
  return profile;
}

/** Keeps a single default: making one default clears the flag on the others. */
async function clearOtherDefaults(id: unknown) {
  await PayeeProfileModel.updateMany({ _id: { $ne: id }, isDefault: true }, { $set: { isDefault: false } });
}

function duplicateVpa(error: unknown): never {
  if ((error as { code?: number }).code === 11000) throw new HttpError(409, 'A payee with this UPI ID already exists', { vpa: 'A payee with this UPI ID already exists' });
  throw error;
}

export async function createPayeeProfile(body: unknown) {
  const input = payeeProfileSchema.parse(body);
  const profile = await PayeeProfileModel.create(input).catch(duplicateVpa);
  if (profile.isDefault) await clearOtherDefaults(profile._id);
  return profile;
}

export async function updatePayeeProfile(id: string, body: unknown) {
  const input = updatePayeeProfileSchema.parse(body);
  const profile = await getPayeeProfile(id);
  Object.assign(profile, input);
  await profile.save().catch(duplicateVpa);
  if (profile.isDefault) await clearOtherDefaults(profile._id);
  return profile;
}

export async function deletePayeeProfile(id: string) {
  const profile = await getPayeeProfile(id);
  await profile.deleteOne();
}

/** Resolves an invoice's payee: its own profile, else the default, else the first profile. */
export function createPayeeResolver(profiles: (PayeeProfileDocument & { _id: unknown })[]) {
  const byId = new Map(profiles.map((profile) => [String(profile._id), profile]));
  const fallback = profiles.find((profile) => profile.isDefault) ?? profiles[0];

  return (payeeProfileId: unknown): PortalPayee | null => {
    const profile = (payeeProfileId ? byId.get(String(payeeProfileId)) : undefined) ?? fallback;
    return profile ? { name: profile.name, vpa: profile.vpa } : null;
  };
}
