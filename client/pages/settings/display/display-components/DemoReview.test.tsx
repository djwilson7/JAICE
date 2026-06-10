import { render, screen } from '@testing-library/react';
import { DemoReview } from './DemoReview';
import { useSettings } from '@/pages/settings/provider/settingsContext';
import { vi } from 'vitest';

vi.mock('@/pages/settings/provider/settingsContext', () => ({
  useSettings: vi.fn(),
}));

describe('DemoReview', () => {
  it('renders correctly for inline behavior', () => {
    (useSettings as any).mockReturnValue({ reviewBehavior: 'inline' });
    render(<DemoReview />);
    expect(screen.getByText(/Review cards will be shown within each standard column/i)).toBeInTheDocument();
  });

  it('renders correctly for column behavior', () => {
    (useSettings as any).mockReturnValue({ reviewBehavior: 'column' });
    render(<DemoReview />);
    expect(screen.getByText(/Always display a dedicated review column/i)).toBeInTheDocument();
  });
});
