import { Router } from 'express';
import { sendPackEmail } from '../email/email.actions.js';
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
    const pack = await sendPack(req.params.id);
    // Optional: `{ "email": true }` also emails the client a portal link (best effort; the send is logged).
    let email;
    let emailError: string | undefined;
    if (req.body?.email === true) {
      try {
        email = await sendPackEmail(req.params.id);
      } catch (error) {
        emailError = error instanceof Error ? error.message : 'Email failed';
      }
    }
    res.json({ pack, email, emailError });
  })
);
packRoutes.post(
  '/:id/email',
  asyncHandler(async (req, res) => {
    res.status(201).json({ email: await sendPackEmail(req.params.id) });
  })
);
packRoutes.patch(
  '/:id/items/:itemId/payment-status',
  asyncHandler(async (req, res) => {
    res.json({ pack: await setPaymentItemStatus(req.params.id, req.params.itemId, req.body) });
  })
);
