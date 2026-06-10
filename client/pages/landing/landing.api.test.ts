import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateNewAccount, LogUserIn, thirdPartyLogIn } from './landing.api';
import { emailSignIn, emailSignUp, googleSignIn } from '@/global-services/auth';
import { api } from '@/global-services/api';

vi.mock('@/global-services/auth', () => ({
  emailSignIn: vi.fn(),
  emailSignUp: vi.fn(),
  googleSignIn: vi.fn()
}));

vi.mock('@/global-services/api', () => ({
  api: vi.fn()
}));

describe('landing.api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CreateNewAccount', () => {
    it('should successfully create account', async () => {
      vi.mocked(emailSignUp).mockResolvedValue(undefined as never);
      vi.mocked(api).mockResolvedValue({ status: 200 } as any);

      const [ok, msg] = await CreateNewAccount({ email: 'test@example.com', password: 'pwd' });
      expect(ok).toBe(true);
      expect(msg).toBe('Account created successfully');
    });

    it('should handle failure during signup', async () => {
      vi.mocked(emailSignUp).mockRejectedValue(new Error('Firebase error'));

      const [ok, msg] = await CreateNewAccount({ email: 'test@example.com', password: 'pwd' });
      expect(ok).toBe(false);
      expect(msg).toBe('Firebase error');
    });
  });

  describe('LogUserIn', () => {
    it('should successfully log in user', async () => {
      vi.mocked(emailSignIn).mockResolvedValue(undefined as never);
      vi.mocked(api).mockResolvedValue({ status: 200 } as any);
      const navigate = vi.fn();

      const [ok, msg] = await LogUserIn({ navigate, email: 'test@example.com', password: 'pwd' });
      expect(ok).toBe(true);
      expect(navigate).toHaveBeenCalledWith('/home');
    });

    it('should handle login error', async () => {
      vi.mocked(emailSignIn).mockRejectedValue(new Error('Auth failed'));
      const navigate = vi.fn();

      const [ok, msg] = await LogUserIn({ navigate, email: 'test@example.com', password: 'pwd' });
      expect(ok).toBe(false);
      expect(msg).toBe('Auth failed');
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('thirdPartyLogIn', () => {
    it('should handle Google login', async () => {
      vi.mocked(googleSignIn).mockResolvedValue(undefined as never);
      vi.mocked(api).mockResolvedValue({ status: 200 } as any);

      const [ok, msg] = await thirdPartyLogIn('Google');
      expect(ok).toBe(true);
    });

    it('should return not implemented for Outlook', async () => {
      const [ok, msg] = await thirdPartyLogIn('Outlook');
      expect(ok).toBe(false);
      expect(msg).toBe('Outlook sign in not implemented');
    });
  });
});
