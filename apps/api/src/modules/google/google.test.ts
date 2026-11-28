import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { UserModel } from '../auth/user.model.js';
import { GoogleConnectionModel } from './google.connection.model.js';
import { mapGoogleError } from './google.client.js';
import { copyFile, parseDocId, setAccess } from './drive.service.js';
import { replacePlaceholders } from './docs.service.js';
import { decryptToken, encryptToken } from './token.crypto.js';

const driveMock = {
  files: { get: vi.fn(), copy: vi.fn() },
  permissions: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }
};
const docsMock = { documents: { batchUpdate: vi.fn() } };

vi.mock('@googleapis/drive', () => ({ drive: () => driveMock }));
vi.mock('@googleapis/docs', () => ({ docs: () => docsMock }));
vi.mock('../../middleware/authenticate.js', async () => {
  const { authenticateAsTestUser } = await import('../../test/mockAuthenticate.js');
  return { authenticate: authenticateAsTestUser };
});

const connection = GoogleConnectionModel.hydrate({
  _id: new Types.ObjectId(),
  email: 'agency@example.com',
  refreshToken: encryptToken('refresh'),
  scopes: [],
  connectedAt: new Date(),
  status: 'connected'
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(GoogleConnectionModel, 'findOne').mockReturnValue({ sort: () => Promise.resolve(connection) } as never);
  vi.spyOn(GoogleConnectionModel, 'updateMany').mockResolvedValue({} as never);
});
afterEach(() => vi.restoreAllMocks());

describe('parseDocId', () => {
  it.each([
    ['https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUv/edit?usp=sharing', '1AbCdEfGhIjKlMnOpQrStUv'],
    ['https://docs.google.com/document/u/0/d/1AbCdEfGhIjKlMnOpQrStUv', '1AbCdEfGhIjKlMnOpQrStUv'],
    ['https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUv', '1AbCdEfGhIjKlMnOpQrStUv'],
    ['https://example.com/nothing', null]
  ])('%s', (url, id) => expect(parseDocId(url)).toBe(id));
});

describe('token crypto', () => {
  it('round-trips and uses a fresh iv', () => {
    const a = encryptToken('secret');
    expect(a).not.toContain('secret');
    expect(a).not.toBe(encryptToken('secret'));
    expect(decryptToken(a)).toBe('secret');
  });
});

describe('error mapping', () => {
  it('maps Google failures to HttpError', () => {
    expect(mapGoogleError({ code: 404 }).statusCode).toBe(404);
    expect(mapGoogleError({ code: 403, errors: [{ reason: 'forbidden' }] }).statusCode).toBe(403);
    expect(mapGoogleError({ code: 403, errors: [{ reason: 'storageQuotaExceeded' }] }).statusCode).toBe(429);
    expect(mapGoogleError({ message: 'invalid_grant' })).toMatchObject({ statusCode: 409, message: 'Reconnect Google' });
    expect(mapGoogleError(new HttpError(418, 'x')).statusCode).toBe(418);
  });

  it('marks the connection disconnected on invalid_grant', async () => {
    driveMock.files.copy.mockRejectedValue(new Error('invalid_grant'));
    await expect(copyFile('abc', 'n')).rejects.toMatchObject({ statusCode: 409 });
    expect(GoogleConnectionModel.updateMany).toHaveBeenCalled();
  });
});

describe('drive + docs services', () => {
  it('diffs permissions: create, update, delete, never notifying', async () => {
    driveMock.permissions.list.mockResolvedValue({
      data: {
        permissions: [
          { id: 'p1', type: 'user', role: 'writer', emailAddress: 'keep@x.com' },
          { id: 'p2', type: 'user', role: 'reader', emailAddress: 'drop@x.com' },
          { id: 'own', type: 'user', role: 'owner', emailAddress: 'agency@example.com' }
        ]
      }
    });
    driveMock.permissions.create.mockResolvedValue({ data: { id: 'p3' } });
    await setAccess('file', [
      { email: 'keep@x.com', role: 'commenter' },
      { email: 'new@x.com', role: 'writer' }
    ]);
    expect(driveMock.permissions.update).toHaveBeenCalledWith(expect.objectContaining({ permissionId: 'p1', requestBody: { role: 'commenter' } }));
    expect(driveMock.permissions.create).toHaveBeenCalledWith(expect.objectContaining({ sendNotificationEmail: false }));
    expect(driveMock.permissions.delete).toHaveBeenCalledWith(expect.objectContaining({ permissionId: 'p2' }));
    expect(driveMock.permissions.delete).toHaveBeenCalledTimes(1);
  });

  it('replaces placeholders in one batchUpdate', async () => {
    await replacePlaceholders('doc', { 'client.company': 'Acme', today: '1 Jan' });
    expect(docsMock.documents.batchUpdate).toHaveBeenCalledTimes(1);
    const requests = docsMock.documents.batchUpdate.mock.calls[0][0].requestBody.requests;
    expect(requests).toHaveLength(2);
    expect(requests[0].replaceAllText.containsText.text).toBe('{{client.company}}');
  });
});

describe('google routes', () => {
  it('reports status', async () => {
    const res = await request(createApp()).get('/google/status').expect(200);
    expect(res.body).toMatchObject({ connected: true, email: 'agency@example.com' });
  });

  it('409s when not connected', async () => {
    vi.spyOn(GoogleConnectionModel, 'findOne').mockReturnValue({ sort: () => Promise.resolve(null) } as never);
    await expect(copyFile('a', 'b')).rejects.toMatchObject({ statusCode: 409, message: 'Google not connected' });
  });

  it('rejects an OAuth callback with a forged state', async () => {
    await request(createApp()).get('/google/oauth/callback?code=x&state=bad.state').expect(400);
  });

  it('lists admins', async () => {
    vi.spyOn(UserModel, 'find').mockReturnValue({
      select: () => ({ sort: () => Promise.resolve([{ _id: new Types.ObjectId(), email: 'a@kraven.test' }]) })
    } as never);
    const res = await request(createApp()).get('/admins').expect(200);
    expect(res.body.admins[0]).toMatchObject({ name: 'a', email: 'a@kraven.test' });
  });
});
