import { describe, expect, it } from 'vitest';
import { changePasswordSchema, loginSchema } from '@kraven/validation';

describe('auth validation', () => {
  it('validates login and change password input structures', () => {
    expect(
      loginSchema.safeParse({ email: 'admin@kraven.local', password: 'password123' }).success
    ).toBe(true);

    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'oldPassword123',
        newPassword: 'newStrongPassword123'
      }).success
    ).toBe(true);

    expect(
      changePasswordSchema.safeParse({
        currentPassword: '',
        newPassword: 'short'
      }).success
    ).toBe(false);
  });
});
