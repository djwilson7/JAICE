import { render, screen } from '@testing-library/react';
import { DisplaySettings } from './DisplaySettings';
import { useSettings } from '@/pages/settings/provider/settingsContext';
import { vi } from 'vitest';

vi.mock('@/pages/settings/provider/settingsContext', () => ({
  useSettings: vi.fn(),
}));

describe('DisplaySettings', () => {
  beforeEach(() => {
    (useSettings as any).mockReturnValue({
      theme: 'system',
      setTheme: vi.fn(),
      textScale: 'default',
      setTextScale: vi.fn(),
      motion: 'default',
      setMotion: vi.fn(),
      contrast: 'default',
      setContrast: vi.fn(),
      navigationBehavior: 'floating',
      setNavigationBehavior: vi.fn(),
      reviewBehavior: 'minimal',
      setReviewBehavior: vi.fn(),
      primaryColumnBehavior: 'mixed',
      setPrimaryColumnBehavior: vi.fn(),
    });
  });

  it('renders correctly', () => {
    render(<DisplaySettings />);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Text Size')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Motion Speed')).toBeInTheDocument();
    expect(screen.getByText('Contrast')).toBeInTheDocument();
    expect(screen.getByText('Workspace Layout')).toBeInTheDocument();
    expect(screen.getByText('Primary Columns')).toBeInTheDocument();
    expect(screen.getByText('Review Cards')).toBeInTheDocument();
    expect(screen.getByText('Navigation Bar')).toBeInTheDocument();
  });
});
