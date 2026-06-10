import { render, screen } from '@testing-library/react';
import { NavigationDetails } from './NavigationDetails';
import { useSettings } from '@/pages/settings/provider/settingsContext';
import { vi } from 'vitest';

vi.mock('@/pages/settings/provider/settingsContext', () => ({
  useSettings: vi.fn(),
}));

describe('NavigationDetails', () => {
  it('renders correctly for open navigation', () => {
    (useSettings as any).mockReturnValue({ navigationBehavior: 'open' });
    render(<NavigationDetails />);
    expect(screen.getByText(/expanded for easy access/i)).toBeInTheDocument();
  });
});
