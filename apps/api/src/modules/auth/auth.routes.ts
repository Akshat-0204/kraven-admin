import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { changePassword, login, logout, me } from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/login', asyncHandler(login));
authRoutes.post('/logout', authenticate, asyncHandler(logout));
authRoutes.get('/me', authenticate, asyncHandler(me));
authRoutes.post('/change-password', authenticate, asyncHandler(changePassword));
