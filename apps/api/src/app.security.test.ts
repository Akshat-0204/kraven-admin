import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { env } from './config/env.js';

const allowedOrigin = env.corsOrigins[0];
const foreignOrigin = 'https://evil.example';

describe('CORS allowlist', () => {
  it('allows credentialed requests from an allowlisted origin', async () => {
    const response = await request(createApp()).get('/health').set('Origin', allowedOrigin).expect(200);

    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not grant CORS to other origins', async () => {
    const response = await request(createApp()).get('/health').set('Origin', foreignOrigin).expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers preflight only for allowlisted origins', async () => {
    const allowed = await request(createApp())
      .options('/auth/login')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);
    const denied = await request(createApp())
      .options('/auth/login')
      .set('Origin', foreignOrigin)
      .set('Access-Control-Request-Method', 'POST');

    expect(allowed.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Origin check on state-changing requests', () => {
  it('rejects POSTs from a foreign Origin', async () => {
    const response = await request(createApp()).post('/auth/login').set('Origin', foreignOrigin).send({}).expect(403);

    expect(response.body).toEqual({ message: 'Origin not allowed' });
  });

  it('rejects POSTs whose Referer is foreign when Origin is absent', async () => {
    await request(createApp()).post('/auth/login').set('Referer', `${foreignOrigin}/page`).send({}).expect(403);
  });

  it('rejects the opaque "null" Origin', async () => {
    await request(createApp()).post('/auth/login').set('Origin', 'null').send({}).expect(403);
  });

  it('lets allowlisted and non-browser POSTs through to the route', async () => {
    await request(createApp()).post('/auth/login').set('Origin', allowedOrigin).send({}).expect(400);
    await request(createApp()).post('/auth/login').send({}).expect(400);
  });

  it('does not block safe methods from foreign origins', async () => {
    await request(createApp()).get('/health').set('Origin', foreignOrigin).expect(200);
  });
});

describe('security headers', () => {
  it('sets helmet headers', async () => {
    const response = await request(createApp()).get('/health').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
