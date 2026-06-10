import { render, screen } from '@testing-library/react';
import { PrimaryColumnDetails } from './PrimaryColumnDetails';
import { useSettings } from '@/pages/settings/provider/settingsContext';
import { vi } from 'vitest';

vi.mock('@/pages/settings/provider/settingsContext', () => ({
  useSettings: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('PrimaryColumnDetails', () => {
  it('renders correctly for separate behavior', () => {
    (useSettings as any).mockReturnValue({
      primaryColumnBehavior: 'separate',
      selectedPrimaryColumn: 'accepted',
      setSelectedPrimaryColumn: vi.fn(),
    });
    render(<PrimaryColumnDetails />);
    expect(screen.getByText(/Keep Accepted and Rejected columns separate/i)).toBeInTheDocument();
  });

  it('renders correctly for mixed behavior', () => {
    (useSettings as any).mockReturnValue({
      primaryColumnBehavior: 'mixed',
      selectedPrimaryColumn: 'accepted',
      setSelectedPrimaryColumn: vi.fn(),
    });
    render(<PrimaryColumnDetails />);
    expect(screen.getByText(/Cycle between Accepted and Rejected/i)).toBeInTheDocument();
  });
});
