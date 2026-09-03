import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  getDashboardLeadsController,
  getDashboardProjectsController,
  getDashboardRevenueController,
  getDashboardSummaryController
} from './dashboard.controller.js';

export const dashboardRoutes = Router();

dashboardRoutes.get('/summary', asyncHandler(getDashboardSummaryController));
dashboardRoutes.get('/revenue', asyncHandler(getDashboardRevenueController));
dashboardRoutes.get('/projects', asyncHandler(getDashboardProjectsController));
dashboardRoutes.get('/leads', asyncHandler(getDashboardLeadsController));
