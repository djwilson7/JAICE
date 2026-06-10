import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LandingPage } from './LandingPage';

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn()
}));

vi.mock('@/pages/landing/landing-components/LandingForm', () => ({
  LandingForm: () => <div data-testid="landing-form" />
}));

vi.mock('@/global-services/useBrandImage', () => ({
  useBrandImage: () => 'mock-brand-image.png'
}));

describe('LandingPage', () => {
  it('should render brand info and form', () => {
    render(<LandingPage />);
    expect(screen.getByText('Job Application Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Simplify Your Job Hunt')).toBeInTheDocument();
    expect(screen.getByTestId('landing-form')).toBeInTheDocument();
  });

  it('should render About button', () => {
    render(<LandingPage />);
    expect(screen.getByText('About')).toBeInTheDocument();
  });
});
