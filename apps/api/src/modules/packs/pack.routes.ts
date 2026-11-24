import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  createPack,
  deletePack,
  listPacks,
  sendPack,
  setPaymentItemStatus,
  updatePack
} from './pack.service.js';

/** Admin packs, mounted at `/packs` behind `authenticate`. */
export const packRoutes = Router();

packRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ packs: await listPacks(typeof req.query.client === 'string' ? req.query.client : undefined) });
  })
);
packRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json({ pack: await createPack(req.body, req.session.userId) });
  })
);
packRoutes.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ pack: await updatePack(req.params.id, req.body) });
  })
);
packRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deletePack(req.params.id);
    res.status(204).end();
  })
);
packRoutes.post(
  '/:id/send',
  asyncHandler(async (req, res) => {
    res.json({ pack: await sendPack(req.params.id) });
  })
);
packRoutes.patch(
  '/:id/items/:itemId/payment-status',
  asyncHandler(async (req, res) => {
    res.json({ pack: await setPaymentItemStatus(req.params.id, req.params.itemId, req.body) });
  })
);
