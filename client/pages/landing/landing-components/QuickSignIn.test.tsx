import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuickSignIn } from './QuickSignIn';
import { thirdPartyLogIn } from '../landing.api';

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate
}));

vi.mock('../landing.api', () => ({
  thirdPartyLogIn: vi.fn()
}));

describe('QuickSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render provider buttons', () => {
    render(<QuickSignIn />);
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByText('Continue with Outlook')).toBeInTheDocument();
  });

  it('should call thirdPartyLogIn and navigate on success', async () => {
    vi.mocked(thirdPartyLogIn).mockResolvedValue([true, 'Success']);
    render(<QuickSignIn />);
    
    // Test Google
    await act(async () => {
        fireEvent.click(screen.getByText('Continue with Google').closest('button')!);
    });
    expect(thirdPartyLogIn).toHaveBeenCalledWith('Google');
    expect(mockNavigate).toHaveBeenCalledWith('/home');

    // Test Outlook
    await act(async () => {
        fireEvent.click(screen.getByText('Continue with Outlook').closest('button')!);
    });
    expect(thirdPartyLogIn).toHaveBeenCalledWith('Outlook');
    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it('should not navigate on failure', async () => {
    vi.mocked(thirdPartyLogIn).mockResolvedValue([false, 'Error']);
    render(<QuickSignIn />);
    
    await act(async () => {
        fireEvent.click(screen.getByText('Continue with Google').closest('button')!);
    });

    expect(thirdPartyLogIn).toHaveBeenCalledWith('Google');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
