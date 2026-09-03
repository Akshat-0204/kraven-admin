import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  createInvoiceController,
  deleteInvoiceController,
  getInvoiceController,
  listInvoicesController,
  updateInvoiceController
} from './invoice.controller.js';

export const invoiceRoutes = Router();

invoiceRoutes.get('/', asyncHandler(listInvoicesController));
invoiceRoutes.post('/', asyncHandler(createInvoiceController));
invoiceRoutes.get('/:id', asyncHandler(getInvoiceController));
invoiceRoutes.patch('/:id', asyncHandler(updateInvoiceController));
invoiceRoutes.delete('/:id', asyncHandler(deleteInvoiceController));
