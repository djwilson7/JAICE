import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LandingForm } from './LandingForm';

vi.mock('@/pages/landing/landing-components/QuickSignIn', () => ({
  QuickSignIn: () => <div data-testid="quick-sign-in" />
}));

describe('LandingForm', () => {
  it('should render form info and QuickSignIn component', () => {
    render(<LandingForm />);
    expect(screen.getByText('Sign in to JAICE')).toBeInTheDocument();
    expect(screen.getByTestId('quick-sign-in')).toBeInTheDocument();
  });
});
