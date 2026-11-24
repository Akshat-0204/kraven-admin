import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { listClientEmails, sendPortalAccessEmail } from './email.actions.js';

/** Admin email actions for one client, mounted at `/clients/:id/emails`. */
export const clientEmailRoutes = Router({ mergeParams: true });

clientEmailRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ emails: await listClientEmails(req.params.id) });
  })
);
clientEmailRoutes.post(
  '/portal',
  asyncHandler(async (req, res) => {
    res.status(201).json({ email: await sendPortalAccessEmail(req.params.id) });
  })
);
