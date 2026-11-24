import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { LOGIN_RATE_LIMIT } from '../../middleware/rateLimit.js';

describe('login rate limit', () => {
  it('blocks an IP after 10 failed logins within the window', async () => {
    const app = createApp();

    for (let attempt = 0; attempt < LOGIN_RATE_LIMIT.limit; attempt += 1) {
      await request(app).post('/auth/login').send({}).expect(400);
    }

    const blocked = await request(app).post('/auth/login').send({}).expect(429);

    expect(LOGIN_RATE_LIMIT).toEqual({ windowMs: 15 * 60 * 1000, limit: 10 });
    expect(blocked.body).toEqual({ message: 'Too many login attempts. Try again later.' });
    expect(blocked.headers['retry-after']).toBeDefined();
  });

});
