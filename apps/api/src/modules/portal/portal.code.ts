import { randomInt } from 'node:crypto';
import { compare, hash } from 'bcrypt';

/** No 0/O, 1/I/L: codes are read aloud and typed from messages. */
export const PORTAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const PORTAL_CODE_LENGTH = 10;
const BCRYPT_ROUNDS = 10;

export function generatePortalCode(length = PORTAL_CODE_LENGTH) {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += PORTAL_CODE_ALPHABET[randomInt(PORTAL_CODE_ALPHABET.length)];
  }
  return code;
}

/** Codes are case-insensitive and ignore surrounding whitespace. */
export function normalizePortalCode(code: string) {
  return code.trim().toUpperCase();
}

export function hashPortalCode(code: string) {
  return hash(normalizePortalCode(code), BCRYPT_ROUNDS);
}

let dummyHash: Promise<string> | undefined;

/**
 * Compares a submitted code with the stored hash. Without a hash (unknown slug, no code set) it still
 * runs a bcrypt compare against a dummy hash so response timing does not reveal which slugs exist.
 */
export async function checkPortalCode(code: string, codeHash: string | undefined) {
  if (!codeHash) {
    dummyHash ??= hash('portal-dummy-code', BCRYPT_ROUNDS);
    await compare(normalizePortalCode(code), await dummyHash);
    return false;
  }
  return compare(normalizePortalCode(code), codeHash);
}
