import { render, screen } from '@testing-library/react';
import { ThemeDetails } from './ThemeDetails';
import { useSettings } from '@/pages/settings/provider/settingsContext';
import { vi } from 'vitest';

vi.mock('@/pages/settings/provider/settingsContext', () => ({
  useSettings: vi.fn(),
}));

describe('ThemeDetails', () => {
  it('renders correctly for light theme', () => {
    (useSettings as any).mockReturnValue({ theme: 'light' });
    render(<ThemeDetails />);
    expect(screen.getByText(/light theme/i)).toBeInTheDocument();
  });

  it('renders correctly for dark theme', () => {
    (useSettings as any).mockReturnValue({ theme: 'dark' });
    render(<ThemeDetails />);
    expect(screen.getByText(/dark theme/i)).toBeInTheDocument();
  });
});
