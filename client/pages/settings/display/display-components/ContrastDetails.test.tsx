import { render, screen } from '@testing-library/react';
import { ContrastDetails } from './ContrastDetails';
import { useSettings } from '@/pages/settings/provider/settingsContext';
import { vi } from 'vitest';

vi.mock('@/pages/settings/provider/settingsContext', () => ({
  useSettings: vi.fn(),
}));

describe('ContrastDetails', () => {
  it('renders correctly for low contrast', () => {
    (useSettings as any).mockReturnValue({ contrast: 'low' });
    render(<ContrastDetails />);
    expect(screen.getByText(/Softer shades/i)).toBeInTheDocument();
  });
  
  it('renders correctly for bw contrast', () => {
    (useSettings as any).mockReturnValue({ contrast: 'bw' });
    render(<ContrastDetails />);
    expect(screen.getByText(/black and white/i)).toBeInTheDocument();
  });
});
