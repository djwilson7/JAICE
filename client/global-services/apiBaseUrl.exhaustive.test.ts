import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('apiBaseUrl exhaustive', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('resolves production URL with HTTPS', async () => {
    vi.stubEnv('PROD', 'true');
    vi.stubEnv('VITE_API_BASE_URL_PROD', 'https://api.prod.com/');
    
    const { API_BASE_URL } = await import('./apiBaseUrl');
    expect(API_BASE_URL).toBe('https://api.prod.com');
  });

  it('resolves production URL with loopback HTTP', async () => {
    vi.stubEnv('PROD', 'true');
    vi.stubEnv('VITE_API_BASE_URL_PROD', 'http://localhost:8000');
    
    const { API_BASE_URL } = await import('./apiBaseUrl');
    expect(API_BASE_URL).toBe('http://localhost:8000');
  });

  it('throws in production if not HTTPS or loopback', async () => {
    vi.stubEnv('PROD', 'true');
    vi.stubEnv('VITE_API_BASE_URL_PROD', 'http://api.insecure.com');
    
    await expect(import('./apiBaseUrl')).rejects.toThrow('Production API traffic must use HTTPS.');
  });

  it('resolves local URL in dev mode', async () => {
    vi.stubEnv('PROD', ''); // falsy
    vi.stubEnv('VITE_API_BASE_URL_LOCAL', 'http://localhost:3000///');
    
    const { API_BASE_URL } = await import('./apiBaseUrl');
    expect(API_BASE_URL).toBe('http://localhost:3000');
  });

  it('falls back to empty string if no env var', async () => {
    vi.stubEnv('PROD', '');
    vi.stubEnv('VITE_API_BASE_URL_LOCAL', '');
    
    const { API_BASE_URL } = await import('./apiBaseUrl');
    expect(API_BASE_URL).toBe('');
  });
});
