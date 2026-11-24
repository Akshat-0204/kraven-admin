import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { loginRateLimiter } from '../../middleware/rateLimit.js';
import { changePassword, login, logout, me } from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/login', loginRateLimiter, asyncHandler(login));
authRoutes.post('/logout', authenticate, asyncHandler(logout));
authRoutes.get('/me', authenticate, asyncHandler(me));
authRoutes.post('/change-password', authenticate, asyncHandler(changePassword));
