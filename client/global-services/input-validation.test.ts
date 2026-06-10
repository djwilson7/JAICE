import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from './input-validation';

describe('input-validation', () => {
  it('should validate email correctly', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
  });

  it('should validate password correctly', () => {
    expect(validatePassword('Password123!')).toBe(true);
    expect(validatePassword('weak')).toBe(false);
  });
});
