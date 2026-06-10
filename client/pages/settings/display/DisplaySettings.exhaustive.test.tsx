import { render, screen, fireEvent } from '@testing-library/react';
import { DisplaySettings } from './DisplaySettings';
import * as settingsContextModule from '@/pages/settings/provider/settingsContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@/pages/settings/provider/settingsContext', () => ({
  useSettings: vi.fn(),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('DisplaySettings exhaustive', () => {
  const mocks = {
    setTheme: vi.fn(),
    setTextScale: vi.fn(),
    setMotion: vi.fn(),
    setContrast: vi.fn(),
    setNavigationBehavior: vi.fn(),
    setReviewBehavior: vi.fn(),
    setPrimaryColumnBehavior: vi.fn(),
    setSelectedPrimaryColumn: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (settingsContextModule.useSettings as any).mockReturnValue({
      theme: 'light',
      textScale: 'default',
      motion: 'default',
      contrast: 'default',
      navigationBehavior: 'open',
      reviewBehavior: 'column',
      primaryColumnBehavior: 'separate',
      selectedPrimaryColumn: 'accepted',
      ...mocks,
    });
  });

  it('triggers all setters when buttons are clicked', () => {
    render(<DisplaySettings />);

    fireEvent.click(screen.getByTitle(/Set Dark Theme/i));
    expect(mocks.setTheme).toHaveBeenCalledWith('dark');

    fireEvent.click(screen.getByTitle(/Shrink Text/i));
    expect(mocks.setTextScale).toHaveBeenCalledWith('small');

    fireEvent.click(screen.getByTitle(/Slower Animations/i));
    expect(mocks.setMotion).toHaveBeenCalledWith('slow');

    fireEvent.click(screen.getByTitle(/Stronger Contrast/i));
    expect(mocks.setContrast).toHaveBeenCalledWith('high');

    fireEvent.click(screen.getByTitle(/Combine accepted & rejected columns/i));
    expect(mocks.setPrimaryColumnBehavior).toHaveBeenCalledWith('unified');

    fireEvent.click(screen.getByTitle(/Show reviews inline/i));
    expect(mocks.setReviewBehavior).toHaveBeenCalledWith('inline');

    fireEvent.click(screen.getByTitle(/Keep the navigation bar hidden/i));
    expect(mocks.setNavigationBehavior).toHaveBeenCalledWith('closed');
  });

  it('covers ContrastDetails branches', () => {
    const { rerender } = render(<DisplaySettings />);
    
    const cases = [
        { val: 'low', text: /Softer shades and shadows/ },
        { val: 'high', text: /Vivid colors and sharp contrasts/ },
        { val: 'bw', text: /black and white for maximum contrast/ }
    ];

    cases.forEach(c => {
        (settingsContextModule.useSettings as any).mockReturnValue({
            ...mocks,
            contrast: c.val,
        });
        rerender(<DisplaySettings />);
        expect(screen.getByText(c.text)).toBeInTheDocument();
    });
  });

  it('covers PrimaryColumnDetails interactivity and branches', () => {
    const { rerender } = render(<DisplaySettings />);
    
    // Switch to unified to show the toggleable title
    (settingsContextModule.useSettings as any).mockReturnValue({
        ...mocks,
        primaryColumnBehavior: 'unified',
        selectedPrimaryColumn: 'accepted',
      });
    rerender(<DisplaySettings />);

    const acceptedText = screen.getByText('Accepted');
    fireEvent.click(acceptedText.parentElement!);
    expect(mocks.setSelectedPrimaryColumn).toHaveBeenCalledWith('rejected');

    // Toggle back
    (settingsContextModule.useSettings as any).mockReturnValue({
        ...mocks,
        primaryColumnBehavior: 'unified',
        selectedPrimaryColumn: 'rejected',
      });
    rerender(<DisplaySettings />);
    fireEvent.click(acceptedText.parentElement!);
    expect(mocks.setSelectedPrimaryColumn).toHaveBeenCalledWith('accepted');
  });

  it('covers TextSizeDetails branches', () => {
    const { rerender } = render(<DisplaySettings />);
    (settingsContextModule.useSettings as any).mockReturnValue({ ...mocks, textScale: 'small' });
    rerender(<DisplaySettings />);
    expect(screen.getByText(/Smaller text size/)).toBeInTheDocument();

    (settingsContextModule.useSettings as any).mockReturnValue({ ...mocks, textScale: 'large' });
    rerender(<DisplaySettings />);
    expect(screen.getByText(/Larger text size/)).toBeInTheDocument();
  });

  it('covers MotionDetails branches', () => {
    const { rerender } = render(<DisplaySettings />);
    (settingsContextModule.useSettings as any).mockReturnValue({ ...mocks, motion: 'slow' });
    rerender(<DisplaySettings />);
    expect(screen.getByText(/Reduced animation speeds/)).toBeInTheDocument();

    (settingsContextModule.useSettings as any).mockReturnValue({ ...mocks, motion: 'fast' });
    rerender(<DisplaySettings />);
    expect(screen.getByText(/Increased animation speeds/)).toBeInTheDocument();
  });

  it('covers NavigationDetails branches', () => {
    const { rerender } = render(<DisplaySettings />);
    (settingsContextModule.useSettings as any).mockReturnValue({ ...mocks, navigationBehavior: 'hover' });
    rerender(<DisplaySettings />);
    expect(screen.getByText(/compacted, expanding on hover/)).toBeInTheDocument();

    (settingsContextModule.useSettings as any).mockReturnValue({ ...mocks, navigationBehavior: 'closed' });
    rerender(<DisplaySettings />);
    expect(screen.getByText(/collapsed for a cleaner interface/)).toBeInTheDocument();
  });
});
