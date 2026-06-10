import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogIn } from './LogIn';
import { LogUserIn } from '../landing.api';

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn()
}));

vi.mock('../landing.api', () => ({
  LogUserIn: vi.fn()
}));

describe('LogIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render email and password fields', () => {
    render(<LogIn />);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it('should enable submit button and call LogUserIn when form is valid', async () => {
    render(<LogIn />);
    
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Log In/i });
    
    // Initially disabled
    expect(submitButton).toBeDisabled();

    // Type valid email and password
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.submit(screen.getByRole('button', { name: /Log In/i }));

    expect(LogUserIn).toHaveBeenCalledWith({
      navigate: expect.any(Function),
      email: 'test@example.com',
      password: 'Password123!'
    });
  });

  it('should handle invalid submission state gracefully', async () => {
    render(<LogIn />);
    const emailInput = screen.getByLabelText(/Email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByRole('button', { name: /Log In/i });
    expect(submitButton).toBeDisabled();
    
    // React testing lib can submit form anyway, which calls handleSubmit
    fireEvent.submit(emailInput.closest('form')!);
    
    expect(LogUserIn).not.toHaveBeenCalled();
  });
});
