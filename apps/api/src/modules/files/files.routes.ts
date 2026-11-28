import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { downloadFile, getDownloadUrl, listFiles, updateFileVisibility, uploadFile } from './files.controller.js';

const upload = multer({ storage: multer.memoryStorage() });

export const filesRoutes = Router();

filesRoutes.get('/', asyncHandler(listFiles));
filesRoutes.post('/', upload.single('file'), asyncHandler(uploadFile));
filesRoutes.get('/:id', asyncHandler(downloadFile));
filesRoutes.get('/:id/url', asyncHandler(getDownloadUrl));
filesRoutes.patch('/:id', asyncHandler(updateFileVisibility));
