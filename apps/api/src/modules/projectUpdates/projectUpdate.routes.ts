import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  createProjectUpdate,
  deleteProjectUpdate,
  listProjectUpdates,
  serializeProjectUpdate,
  updateProjectUpdate
} from './projectUpdate.service.js';

export const projectUpdateRoutes = Router();

projectUpdateRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ updates: (await listProjectUpdates(req.query.project)).map(serializeProjectUpdate) });
  })
);
projectUpdateRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json({ update: serializeProjectUpdate(await createProjectUpdate(req.body, req.session.userId)) });
  })
);
projectUpdateRoutes.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ update: serializeProjectUpdate(await updateProjectUpdate(req.params.id, req.body)) });
  })
);
projectUpdateRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteProjectUpdate(req.params.id);
    res.status(204).end();
  })
);
