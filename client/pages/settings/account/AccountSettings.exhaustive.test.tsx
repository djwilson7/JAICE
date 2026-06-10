import { render, screen, act, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { AccountSettings } from './AccountSettings';
import { useAuth } from '@/global-components/authContext';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as apiModule from '@/global-services/api';
import * as authModule from '@/global-services/auth';
import * as checkGmailStatusModule from '@/pages/home/utils/checkGmailStatus';
import React from 'react';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/settings' }),
  };
});

vi.mock('@/global-components/authContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/global-services/api', () => ({
  api: vi.fn(),
}));

vi.mock('@/pages/home/utils/checkGmailStatus', () => ({
  checkGmailStatus: vi.fn(),
}));

vi.mock('@/global-services/auth', () => ({
  getIdToken: vi.fn(),
  logOut: vi.fn(),
}));

// Mock framer-motion and react-dom for portals
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ ...props }: any) => <img {...props} />,
    small: ({ children, ...props }: any) => <small {...props}>{children}</small>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("react-dom", async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    createPortal: (node: any) => node,
  };
});

describe('AccountSettings exhaustive branch coverage', () => {
  const applyProfileUpdateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_GMAIL_CONSENT_URL', ''); // Force fallback to ?? branch
    (useAuth as any).mockReturnValue({
      user: { displayName: 'John Doe', photoURL: 'http://example.com/photo.jpg' },
      applyProfileUpdate: applyProfileUpdateMock,
    });
    (apiModule.api as any).mockResolvedValue({ status: "success" });
    (authModule.getIdToken as any).mockResolvedValue('fake-token');
    (checkGmailStatusModule.checkGmailStatus as any).mockImplementation(({ setGmailConnected }: any) => setGmailConnected(true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('covers name fallbacks, empty photoURL, and profile update success', async () => {
    (useAuth as any).mockReturnValue({
        user: { displayName: null, photoURL: null },
        applyProfileUpdate: applyProfileUpdateMock,
    });
    render(<MemoryRouter><AccountSettings /></MemoryRouter>);
    
    expect(screen.getByDisplayValue('Enter your first name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Enter your last name')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'smith' } });
    
    await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: /Update Profile/i }).closest('form')!);
    });

    expect(applyProfileUpdateMock).toHaveBeenCalledWith('Alice Smith', '');
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('covers link gmail success branch', async () => {
    (checkGmailStatusModule.checkGmailStatus as any).mockImplementation(({ setGmailConnected }: any) => setGmailConnected(false));
    render(<MemoryRouter><AccountSettings /></MemoryRouter>);
    
    fireEvent.click(screen.getByRole('button', { name: /Link Gmail/i }));
    fireEvent.click(screen.getByText('1 month'));
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));
    });
    expect(apiModule.api).toHaveBeenCalledWith('/api/auth/setup-rls-session', expect.any(Object));
  });

  it('covers unlink failure paths (revoke fail, logout catch)', async () => {
      render(<MemoryRouter><AccountSettings /></MemoryRouter>);
      
      // Revoke fail
      (apiModule.api as any).mockResolvedValueOnce({ status: 'error' });
      fireEvent.click(screen.getByRole('button', { name: /Unlink Gmail/i }));
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Unlink' })); });
      expect(screen.getByText(/Unable to unlink/)).toBeInTheDocument();

      // Logout catch
      (apiModule.api as any).mockResolvedValueOnce({ status: 'success' }); // revoke ok
      (apiModule.api as any).mockRejectedValueOnce(new Error('Logout fail')); // backend logout throw
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fireEvent.click(screen.getByRole('button', { name: /Unlink Gmail/i }));
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Unlink' })); });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Backend logout failed'), expect.any(Error));
      consoleSpy.mockRestore();
  });

  it('covers delete account exception branch', async () => {
      render(<MemoryRouter><AccountSettings /></MemoryRouter>);
      
      (apiModule.api as any).mockRejectedValueOnce(new Error('Crash'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fireEvent.click(screen.getByRole('button', { name: /Delete Account/i }));
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Delete' })); });
      expect(screen.getAllByText(/network error occurred/)[0]).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
  });
});
