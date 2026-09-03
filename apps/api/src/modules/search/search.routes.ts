import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { globalSearchController } from './search.controller.js';

export const searchRoutes = Router();

searchRoutes.get('/', asyncHandler(globalSearchController));
