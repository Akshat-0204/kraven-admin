import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';

const DEV_KEY = Buffer.alloc(32, 7);

function getKey(): Buffer {
  const raw = env.google.tokenKey;
  if (!raw) {
    if (env.nodeEnv === 'production') throw new Error('GOOGLE_TOKEN_KEY must be set in production');
    return DEV_KEY;
  }
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('GOOGLE_TOKEN_KEY must be 32 bytes (64 hex chars or base64)');
  return key;
}

/** AES-256-GCM; output is `iv.tag.ciphertext` in base64. */
export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64')).join('.');
}

export function decryptToken(payload: string): string {
  const [iv, tag, data] = payload.split('.').map((part) => Buffer.from(part, 'base64'));
  if (!iv || !tag || !data) throw new Error('Malformed encrypted token');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
