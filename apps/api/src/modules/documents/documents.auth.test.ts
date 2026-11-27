import request from 'supertest';
import { describe, it } from 'vitest';
import { createApp } from '../../app.js';

describe('document routes auth', () => {
  it.each([
    ['get', '/document-templates'],
    ['get', '/document-templates/variables'],
    ['post', '/document-templates'],
    ['get', '/documents'],
    ['post', '/documents'],
    ['post', '/documents/64b7f0c2a1b2c3d4e5f60718/pdf'],
    ['get', '/documents/64b7f0c2a1b2c3d4e5f60718/pdf'],
    ['get', '/documents/64b7f0c2a1b2c3d4e5f60718/variables']
  ] as const)('%s %s requires a session', async (method, path) => {
    await request(createApp())[method](path).expect(401);
  });
});
