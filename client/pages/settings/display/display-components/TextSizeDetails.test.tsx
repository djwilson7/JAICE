import { render, screen } from '@testing-library/react';
import { TextSizeDetails } from './TextSizeDetails';
import { useSettings } from '@/pages/settings/provider/settingsContext';
import { vi } from 'vitest';

vi.mock('@/pages/settings/provider/settingsContext', () => ({
  useSettings: vi.fn(),
}));

describe('TextSizeDetails', () => {
  it('renders correctly for small scale', () => {
    (useSettings as any).mockReturnValue({ textScale: 'small' });
    render(<TextSizeDetails />);
    expect(screen.getByText(/Smaller text size/i)).toBeInTheDocument();
  });

  it('renders correctly for default scale', () => {
    (useSettings as any).mockReturnValue({ textScale: 'default' });
    render(<TextSizeDetails />);
    expect(screen.getByText(/Default text size/i)).toBeInTheDocument();
  });
});
