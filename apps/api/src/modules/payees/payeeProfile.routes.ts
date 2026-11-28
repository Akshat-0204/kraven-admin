import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  createPayeeProfile,
  deletePayeeProfile,
  listPayeeProfiles,
  serializePayeeProfile,
  updatePayeeProfile
} from './payeeProfile.service.js';

export const payeeProfileRoutes = Router();

payeeProfileRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ payeeProfiles: (await listPayeeProfiles()).map(serializePayeeProfile) });
  })
);
payeeProfileRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json({ payeeProfile: serializePayeeProfile(await createPayeeProfile(req.body)) });
  })
);
payeeProfileRoutes.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ payeeProfile: serializePayeeProfile(await updatePayeeProfile(req.params.id, req.body)) });
  })
);
payeeProfileRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deletePayeeProfile(req.params.id);
    res.status(204).end();
  })
);
