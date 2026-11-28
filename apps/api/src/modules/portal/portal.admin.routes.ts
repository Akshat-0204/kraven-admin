import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { getPortalSettings, revokePortalAccess, setPortalCode, updatePortalSettings } from './portal.access.service.js';

/** Admin portal settings for one client, mounted at `/clients/:id/portal` (behind `authenticate`). */
export const portalAdminRoutes = Router({ mergeParams: true });

portalAdminRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ portal: await getPortalSettings(req.params.id) });
  })
);
portalAdminRoutes.put(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ portal: await updatePortalSettings(req.params.id, req.body) });
  })
);
portalAdminRoutes.post(
  '/code',
  asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await setPortalCode(req.params.id, req.body));
  })
);
portalAdminRoutes.post(
  '/revoke',
  asyncHandler(async (req, res) => {
    res.json({ portal: await revokePortalAccess(req.params.id) });
  })
);
