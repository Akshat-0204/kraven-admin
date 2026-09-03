import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  addClientLinkController,
  attachClientDocumentController,
  createClientController,
  deleteClientController,
  getClientController,
  listClientsController,
  removeClientDocumentController,
  removeClientLinkController,
  updateClientController
} from './client.controller.js';

export const clientRoutes = Router();

clientRoutes.get('/', asyncHandler(listClientsController));
clientRoutes.post('/', asyncHandler(createClientController));
clientRoutes.get('/:id', asyncHandler(getClientController));
clientRoutes.patch('/:id', asyncHandler(updateClientController));
clientRoutes.delete('/:id', asyncHandler(deleteClientController));
clientRoutes.post('/:id/links', asyncHandler(addClientLinkController));
clientRoutes.delete('/:id/links/:linkIndex', asyncHandler(removeClientLinkController));
clientRoutes.post('/:id/documents', asyncHandler(attachClientDocumentController));
clientRoutes.delete('/:id/documents/:fileId', asyncHandler(removeClientDocumentController));
