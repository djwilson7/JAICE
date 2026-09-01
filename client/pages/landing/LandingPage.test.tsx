import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LandingPage } from './LandingPage';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate
}));

vi.mock('@/pages/landing/landing-components/LandingForm', () => ({
  LandingForm: () => <div data-testid="landing-form" />
}));

vi.mock('@/global-services/useBrandImage', () => ({
  useBrandImage: () => 'mock-brand-image.png'
}));

describe('LandingPage', () => {
  it('should render brand info and form in dev mode', async () => {
    render(<LandingPage projectMode="dev" />);
    expect(screen.getByText('Job Application Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Simplify Your Job Hunt')).toBeInTheDocument();
    expect(await screen.findByTestId('landing-form')).toBeInTheDocument();
  });

  it('should not load the sign-in panel in demo mode', () => {
    const { container } = render(<LandingPage projectMode="demo" />);
    expect(screen.queryByTestId('landing-form')).not.toBeInTheDocument();
    expect(screen.queryByText('About')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take a guided tour' })).toBeInTheDocument();
    expect(screen.getByText('Simplify')).toBeInTheDocument();
    expect(screen.getByText('Your Job Hunt')).toBeInTheDocument();
    expect(screen.getByText('Never lose track of what comes next.')).toBeInTheDocument();
    expect(screen.getByText('Emails')).toBeInTheDocument();
    expect(screen.getByLabelText('Emails flow through JAICE into next steps')).toBeInTheDocument();
    expect(screen.getByText('Sync your emails')).toBeInTheDocument();
    expect(screen.getByText('Stats that guide you')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('landing-page--demo');
  });

  it('should render About instead of the demo action in dev mode', () => {
    render(<LandingPage projectMode="dev" />);
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take a guided tour' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('About'));
    expect(mockNavigate).toHaveBeenCalledWith('/about');
  });

  it('should open the home page from the guided-tour action', () => {
    render(<LandingPage projectMode="demo" />);

    fireEvent.click(screen.getByRole('button', { name: 'Take a guided tour' }));
    expect(mockNavigate).toHaveBeenCalledWith('/home', {
      state: { startGuidedTour: true }
    });
  });
});
