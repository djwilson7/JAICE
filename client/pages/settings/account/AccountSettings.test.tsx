import { render, screen, act, fireEvent } from '@testing-library/react';
import { AccountSettings } from './AccountSettings';
import { useAuth } from '@/global-components/authContext';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { api } from '@/global-services/api';

vi.mock('@/global-components/authContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/global-services/api', () => ({
  api: vi.fn().mockResolvedValue({ status: "success" }),
}));

vi.mock('@/pages/home/utils/checkGmailStatus', () => ({
  checkGmailStatus: vi.fn(({ setGmailConnected }) => setGmailConnected(true)),
}));

vi.mock('@/global-services/auth', () => ({
  getIdToken: vi.fn().mockResolvedValue('fake-token'),
  logOut: vi.fn(),
}));

describe('AccountSettings', () => {
  const applyProfileUpdateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { displayName: 'John Doe', photoURL: 'http://example.com/photo.jpg', gmailConnected: true },
      applyProfileUpdate: applyProfileUpdateMock,
      logOut: vi.fn(),
    });
  });

  it('renders correctly', () => {
    render(
      <MemoryRouter>
        <AccountSettings />
      </MemoryRouter>
    );
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('updates profile correctly', async () => {
    render(
      <MemoryRouter>
        <AccountSettings />
      </MemoryRouter>
    );
    const fName = screen.getByLabelText('First Name');
    fireEvent.change(fName, { target: { value: 'Jane' } });
    const updateBtn = screen.getByRole('button', { name: /Update Profile/i });
    await act(async () => {
      fireEvent.click(updateBtn);
    });
    expect(applyProfileUpdateMock).toHaveBeenCalledWith('Jane Doe', 'http://example.com/photo.jpg');
  });

  it('handles unlink gmail', async () => {
    render(
      <MemoryRouter>
        <AccountSettings />
      </MemoryRouter>
    );
    const linkBtn = screen.getByRole('button', { name: /Unlink Gmail/i });
    fireEvent.click(linkBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument(); // Unlink Gmail Modal opens
    const confirmBtn = screen.getAllByRole('button', { name: /Unlink/i }).find(b => b.textContent === 'Unlink');
    await act(async () => {
      fireEvent.click(confirmBtn as HTMLElement);
    });
    expect(api).toHaveBeenCalledWith('/api/auth/revoke-gmail-consent', { method: 'POST' });
  });

  it('handles delete account', async () => {
    render(
      <MemoryRouter>
        <AccountSettings />
      </MemoryRouter>
    );
    const deleteBtn = screen.getAllByRole('button', { name: /Delete Account/i }).find(b => b.tagName === 'BUTTON');
    fireEvent.click(deleteBtn as HTMLElement);
    expect(screen.getByRole('dialog')).toBeInTheDocument(); // Delete Account Modal opens
    
    // In DeleteAccountModal it might just be "Delete" or "Delete Account"
    const confirmBtn = screen.getAllByRole('button', { name: /Delete/i }).find(b => b.textContent === 'Delete' || b.textContent === 'Delete Account' && b !== deleteBtn);
    await act(async () => {
      fireEvent.click(confirmBtn as HTMLElement);
    });
    expect(api).toHaveBeenCalledWith('/api/auth/delete-account', { method: 'POST' });
  });

  it('opens change photo modal', () => {
    render(
      <MemoryRouter>
        <AccountSettings />
      </MemoryRouter>
    );
    const changeBtn = screen.getByRole('button', { name: /Change Photo/i });
    fireEvent.click(changeBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
