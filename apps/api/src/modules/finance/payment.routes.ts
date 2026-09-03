import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  deletePaymentController,
  getPaymentController,
  listPaymentsController,
  recordPaymentController
} from './payment.controller.js';

export const paymentRoutes = Router();

paymentRoutes.get('/', asyncHandler(listPaymentsController));
paymentRoutes.post('/', asyncHandler(recordPaymentController));
paymentRoutes.get('/:id', asyncHandler(getPaymentController));
paymentRoutes.delete('/:id', asyncHandler(deletePaymentController));
