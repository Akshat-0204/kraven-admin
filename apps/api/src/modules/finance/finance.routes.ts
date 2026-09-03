import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { getFinanceOverviewController, getProjectFinancialsController } from './finance.controller.js';

export const financeRoutes = Router();

financeRoutes.get('/overview', asyncHandler(getFinanceOverviewController));
financeRoutes.get('/projects/:projectId', asyncHandler(getProjectFinancialsController));
