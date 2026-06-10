import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, apiBlob } from './api';
import { getIdToken, getGoogleAccessToken, hasGmailAccess, logOut } from './auth';

vi.mock('./auth', () => ({
  getIdToken: vi.fn(),
  getGoogleAccessToken: vi.fn(),
  hasGmailAccess: vi.fn(),
  logOut: vi.fn(),
}));

vi.mock('./apiBaseUrl', () => ({
  API_BASE_URL: 'http://test.api'
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('api exhaustive', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    window.location = { ...originalLocation, replace: vi.fn(), pathname: '/dashboard' } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('calls fetch with firebase token for normal path', async () => {
    vi.mocked(getIdToken).mockResolvedValue('firebase-token');
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const res = await api('/normal');
    expect(res.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('http://test.api/normal', expect.objectContaining({
      headers: expect.any(Headers)
    }));
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.get('Authorization')).toBe('Bearer firebase-token');
  });

  it('handles null token correctly', async () => {
    vi.mocked(getIdToken).mockResolvedValue(null);
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await api('/no-token');
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.get('Authorization')).toBeNull();
  });

  it('calls fetch with google token for gmail path', async () => {
    vi.mocked(hasGmailAccess).mockReturnValue(true);
    vi.mocked(getGoogleAccessToken).mockReturnValue('google-token');
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    await api('/gmail/something');
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.get('Authorization')).toBe('Bearer google-token');
  });

  it('throws error if gmail path without access', async () => {
    vi.mocked(hasGmailAccess).mockReturnValue(false);
    await expect(api('/gmail/something')).rejects.toThrow('User does not have Gmail access.');
  });

  it('handles 401 unauthorized and redirects', async () => {
    vi.mocked(getIdToken).mockResolvedValue('token');
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ detail: 'Token expired' })
    });
    
    await expect(api('/normal')).rejects.toThrow('API request failed: Token expired');
    expect(logOut).toHaveBeenCalled();
    expect(window.location.replace).toHaveBeenCalledWith('/');
  });

  it('handles logOut failure in 401 handler', async () => {
      vi.mocked(logOut).mockRejectedValue(new Error('LogOut Fail'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({}) });
      
      await expect(api('/fail')).rejects.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('unauthorized Firebase session'), expect.any(Error));
  });

  it('handles non-JSON error response in api', async () => {
    mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('SyntaxError'))
    });
    await expect(api('/err')).rejects.toThrow('API request failed: 500 Internal Server Error');
  });
});

describe('apiBlob exhaustive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches blob and return preview info', async () => {
    vi.mocked(getIdToken).mockResolvedValue('token');
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test'])),
      headers: new Headers({
        'Content-Disposition': 'attachment; filename="test.pdf"',
        'X-PDF-Preview-Path': '/preview/test.pdf'
      })
    });

    const res = await apiBlob('/blob');
    expect(res.blob).toBeInstanceOf(Blob);
    expect(res.filename).toBe('test.pdf');
    expect(res.previewUrl).toBe('http://test.api/preview/test.pdf');
  });

  it('handles 401 in apiBlob', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });
      await expect(apiBlob('/blob')).rejects.toThrow('API request failed: 401 Unauthorized');
      expect(logOut).toHaveBeenCalled();
  });

  it('defaults content-type if body is present', async () => {
      vi.mocked(getIdToken).mockResolvedValue('token');
      mockFetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob()), headers: new Headers() });
      await apiBlob('/blob', { body: JSON.stringify({ x: 1 }) });
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.get('Content-Type')).toBe('application/json');
  });
});
