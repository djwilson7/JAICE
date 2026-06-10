import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  emailSignUp,
  emailSignIn,
  googleSignIn,
  logOut,
  hasValidAuthenticatedSession,
  getIdToken,
  hasGmailAccess,
  getCurrentUserInfo,
  deleteCurrentUser,
  observeUser
} from './auth';
import { auth } from './firebase';
import * as firebaseAuth from 'firebase/auth';

let mockCurrentUser: any = null;

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  deleteUser: vi.fn(),
  reauthenticateWithPopup: vi.fn(),
  EmailAuthProvider: { credential: vi.fn(() => 'mock-cred') },
  reauthenticateWithCredential: vi.fn(),
}));

vi.mock('./firebase', () => {
  return {
    auth: {
      get currentUser() { return mockCurrentUser; },
      authStateReady: vi.fn(),
    },
    googleProvider: { id: 'google-prov' }
  };
});

describe('auth exhaustive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockCurrentUser = {
        uid: '123',
        email: 'test@example.com',
        displayName: 'Test',
        getIdToken: vi.fn().mockResolvedValue('token'),
        providerData: [{ providerId: 'password' }]
    };
    (auth.authStateReady as any).mockResolvedValue(undefined);
  });

  it('observeUser should call callback', () => {
      const cb = vi.fn();
      (firebaseAuth.onAuthStateChanged as any).mockImplementation((a: any, callback: any) => {
          callback({ uid: '456' });
          return () => {};
      });
      observeUser(cb);
      expect(cb).toHaveBeenCalledWith({ uid: '456' });
  });

  it('emailSignUp works', async () => {
    (firebaseAuth.createUserWithEmailAndPassword as any).mockResolvedValue({ user: { uid: '123' } });
    const user = await emailSignUp('a', 'b');
    expect(user.uid).toBe('123');
  });

  it('emailSignIn works', async () => {
    (firebaseAuth.signInWithEmailAndPassword as any).mockResolvedValue({ user: { uid: '123' } });
    const user = await emailSignIn('a', 'b');
    expect(user.uid).toBe('123');
  });

  it('googleSignIn works', async () => {
    (firebaseAuth.signInWithPopup as any).mockResolvedValue({ user: { uid: '123' } });
    const user = await googleSignIn();
    expect(user.uid).toBe('123');
  });

  it('logOut works', async () => {
    (firebaseAuth.signOut as any).mockResolvedValue(undefined);
    await logOut();
    expect(firebaseAuth.signOut).toHaveBeenCalled();
  });

  it('hasValidAuthenticatedSession returns false if no user', async () => {
    mockCurrentUser = null;
    const res = await hasValidAuthenticatedSession();
    expect(res).toBe(false);
  });

  it('hasValidAuthenticatedSession handles errors and logOut failure', async () => {
    mockCurrentUser = {
        getIdToken: vi.fn().mockRejectedValue(new Error('Token Fail'))
    };
    (firebaseAuth.signOut as any).mockRejectedValue(new Error('SignOut Fail'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const res = await hasValidAuthenticatedSession();
    expect(res).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('invalid Firebase session'), expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('getIdToken returns null if no user', async () => {
    mockCurrentUser = null;
    expect(await getIdToken()).toBeNull();
  });

  it('hasGmailAccess logic', () => {
    // Non-google user, no consent
    expect(hasGmailAccess()).toBe(false);

    // Non-google user, with consent
    localStorage.setItem('gmail_consent_granted', 'true');
    expect(hasGmailAccess()).toBe(true);

    // Google user, no token, no consent
    localStorage.removeItem('gmail_consent_granted');
    mockCurrentUser = { providerData: [{ providerId: 'google.com' }] };
    expect(hasGmailAccess()).toBe(false);

    // Google user, with token
    localStorage.setItem('google_access_token', 'tok');
    expect(hasGmailAccess()).toBe(true);

    // No user
    mockCurrentUser = null;
    expect(hasGmailAccess()).toBe(false);
  });

  it('getCurrentUserInfo logic', () => {
    expect(getCurrentUserInfo()?.email).toBe('test@example.com');
    
    mockCurrentUser = null;
    expect(getCurrentUserInfo()).toBeNull();
  });

  describe('deleteCurrentUser', () => {
    it('returns no-user if no currentUser', async () => {
      mockCurrentUser = null;
      expect(await deleteCurrentUser()).toEqual({ ok: false, code: 'no-user' });
    });

    it('returns ok on success', async () => {
      (firebaseAuth.deleteUser as any).mockResolvedValue(undefined);
      expect(await deleteCurrentUser()).toEqual({ ok: true });
    });

    it('handles non-recent login error', async () => {
      (firebaseAuth.deleteUser as any).mockRejectedValue({ code: 'auth/internal-error' });
      expect(await deleteCurrentUser()).toEqual({ ok: false, code: 'auth/internal-error' });
    });

    it('handles reauth with Google', async () => {
      (firebaseAuth.deleteUser as any).mockRejectedValueOnce({ code: 'auth/requires-recent-login' });
      mockCurrentUser = { providerData: [{ providerId: 'google.com' }] };
      (firebaseAuth.reauthenticateWithPopup as any).mockResolvedValue({});
      (firebaseAuth.deleteUser as any).mockResolvedValue(undefined);

      expect(await deleteCurrentUser()).toEqual({ ok: true });
      expect(firebaseAuth.reauthenticateWithPopup).toHaveBeenCalled();
    });

    it('handles reauth with Password', async () => {
      (firebaseAuth.deleteUser as any).mockRejectedValueOnce({ code: 'auth/requires-recent-login' });
      mockCurrentUser = { providerData: [{ providerId: 'password' }] };
      (firebaseAuth.reauthenticateWithCredential as any).mockResolvedValue({});
      (firebaseAuth.deleteUser as any).mockResolvedValue(undefined);

      expect(await deleteCurrentUser({ email: 'e', password: 'p' })).toEqual({ ok: true });
      expect(firebaseAuth.reauthenticateWithCredential).toHaveBeenCalled();
    });

    it('returns reauth-needed for password if no opts', async () => {
      (firebaseAuth.deleteUser as any).mockRejectedValueOnce({ code: 'auth/requires-recent-login' });
      mockCurrentUser = { providerData: [{ providerId: 'password' }] };
      expect(await deleteCurrentUser()).toEqual({ ok: false, code: 'reauth-needed' });
    });

    it('returns reauth-needed for unknown provider', async () => {
      (firebaseAuth.deleteUser as any).mockRejectedValueOnce({ code: 'auth/requires-recent-login' });
      mockCurrentUser = { providerData: [{ providerId: 'phone' }] };
      expect(await deleteCurrentUser()).toEqual({ ok: false, code: 'reauth-needed' });
    });

    it('handles reauth failure', async () => {
      (firebaseAuth.deleteUser as any).mockRejectedValueOnce({ code: 'auth/requires-recent-login' });
      mockCurrentUser = { providerData: [{ providerId: 'google.com' }] };
      (firebaseAuth.reauthenticateWithPopup as any).mockRejectedValue({ code: 'auth/popup-closed' });
      expect(await deleteCurrentUser()).toEqual({ ok: false, code: 'auth/popup-closed' });
    });

    it('handles non-auth error in getAuthErrorCode', async () => {
        (firebaseAuth.deleteUser as any).mockRejectedValue("not an object");
        expect(await deleteCurrentUser()).toEqual({ ok: false, code: 'unknown' });
    });
  });
});
