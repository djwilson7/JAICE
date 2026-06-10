import { describe, it, expect, vi } from 'vitest';
import { auth, googleProvider } from './firebase';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn().mockReturnValue([])
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn().mockReturnValue({}),
  browserLocalPersistence: {},
  setPersistence: vi.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: vi.fn(),
  updateProfile: vi.fn()
}));

describe('firebase', () => {
  it('should export auth and googleProvider', () => {
    expect(auth).toBeDefined();
    expect(googleProvider).toBeDefined();
  });
});
