import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  convertLeadController,
  createLeadController,
  deleteLeadController,
  getLeadController,
  listLeadsController,
  updateLeadController
} from './lead.controller.js';

export const leadRoutes = Router();

leadRoutes.get('/', asyncHandler(listLeadsController));
leadRoutes.post('/', asyncHandler(createLeadController));
leadRoutes.get('/:id', asyncHandler(getLeadController));
leadRoutes.patch('/:id', asyncHandler(updateLeadController));
leadRoutes.delete('/:id', asyncHandler(deleteLeadController));
leadRoutes.post('/:id/convert', asyncHandler(convertLeadController));
