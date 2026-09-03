import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('API foundation', () => {
  it('responds to /health', async () => {
    const response = await request(createApp()).get('/health').expect(200);

    expect(response.body).toEqual({
      app: 'Kraven',
      status: 'ok'
    });
  });
});
