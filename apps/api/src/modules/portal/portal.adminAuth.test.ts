import request from 'supertest';
import { describe, it } from 'vitest';
import { createApp } from '../../app.js';

const id = '64b7f0c2a1b2c3d4e5f60718';

describe('portal admin routes auth', () => {
  it.each([
    ['get', `/clients/${id}/portal`],
    ['put', `/clients/${id}/portal`],
    ['post', `/clients/${id}/portal/code`],
    ['post', `/clients/${id}/portal/revoke`],
    ['get', `/project-updates?project=${id}`],
    ['post', '/project-updates'],
    ['patch', `/project-updates/${id}`],
    ['delete', `/project-updates/${id}`],
    ['get', '/payee-profiles'],
    ['post', '/payee-profiles'],
    ['patch', `/payee-profiles/${id}`],
    ['delete', `/payee-profiles/${id}`],
    ['get', `/files?associatedEntityType=Client&associatedEntityId=${id}`],
    ['patch', `/files/${id}`],
    ['post', `/documents/${id}/share`]
  ] as const)('%s %s requires an admin session', async (method, path) => {
    await request(createApp())[method](path).expect(401);
  });
});
