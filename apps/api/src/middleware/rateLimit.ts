import { rateLimit } from 'express-rate-limit';

export const LOGIN_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 10 } as const;

/** Failed login attempts per IP: 10 per 15 minutes. Successful logins do not count. */
export const loginRateLimiter = rateLimit({
  ...LOGIN_RATE_LIMIT,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again later.' }
});
