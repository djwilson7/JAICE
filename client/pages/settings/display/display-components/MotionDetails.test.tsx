import { render, screen } from '@testing-library/react';
import { MotionDetails } from './MotionDetails';
import { useSettings } from '@/pages/settings/provider/settingsContext';
import { vi } from 'vitest';

vi.mock('@/pages/settings/provider/settingsContext', () => ({
  useSettings: vi.fn(),
}));

describe('MotionDetails', () => {
  it('renders correctly for slow motion', () => {
    (useSettings as any).mockReturnValue({ motion: 'slow' });
    render(<MotionDetails />);
    expect(screen.getByText(/Reduced animation speeds/i)).toBeInTheDocument();
  });
});
