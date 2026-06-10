import { render, screen, act } from '@testing-library/react';
import { SettingsProvider } from './SettingsProvider';
import { useSettings } from './settingsContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SETTINGS_KEYS } from './settingKeys';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

function TestComponent() {
  const { 
    theme, setTheme, 
    textScale, setTextScale,
    motion, setMotion,
    contrast, setContrast,
    navigationBehavior, setNavigationBehavior,
    reviewBehavior, setReviewBehavior,
    primaryColumnBehavior, setPrimaryColumnBehavior,
    selectedPrimaryColumn, setSelectedPrimaryColumn
  } = useSettings();
  
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <div data-testid="textScale">{textScale}</div>
      <button onClick={() => setTextScale('large')}>Set Large</button>
      <div data-testid="motion">{motion}</div>
      <button onClick={() => setMotion('slow')}>Set Slow</button>
      <div data-testid="contrast">{contrast}</div>
      <button onClick={() => setContrast('high')}>Set High</button>
      <div data-testid="nav">{navigationBehavior}</div>
      <button onClick={() => setNavigationBehavior('click')}>Set Click</button>
      <div data-testid="review">{reviewBehavior}</div>
      <button onClick={() => setReviewBehavior('separate')}>Set Separate Review</button>
      <div data-testid="primary">{primaryColumnBehavior}</div>
      <button onClick={() => setPrimaryColumnBehavior('combined')}>Set Combined</button>
      <div data-testid="selected">{selectedPrimaryColumn}</div>
      <button onClick={() => setSelectedPrimaryColumn('rejected')}>Set Rejected</button>
    </div>
  );
}

describe('SettingsProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-contrast');
    vi.clearAllMocks();
  });

  it('renders children and provides context', () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('updates theme and persists to localStorage', () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    
    act(() => {
      screen.getByText('Set Light').click();
    });
    
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(localStorage.getItem(SETTINGS_KEYS.THEME)).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('updates all other settings', () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    
    act(() => {
      screen.getByText('Set Large').click();
      screen.getByText('Set Slow').click();
      screen.getByText('Set High').click();
      screen.getByText('Set Click').click();
      screen.getByText('Set Separate Review').click();
      screen.getByText('Set Combined').click();
      screen.getByText('Set Rejected').click();
    });
    
    expect(screen.getByTestId('textScale')).toHaveTextContent('large');
    expect(screen.getByTestId('motion')).toHaveTextContent('slow');
    expect(screen.getByTestId('contrast')).toHaveTextContent('high');
    expect(screen.getByTestId('nav')).toHaveTextContent('click');
    expect(screen.getByTestId('review')).toHaveTextContent('separate');
    expect(screen.getByTestId('primary')).toHaveTextContent('combined');
    expect(screen.getByTestId('selected')).toHaveTextContent('rejected');
  });

  it('syncs from DOM on appearancechange event', () => {
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );

    act(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.setAttribute('data-contrast', 'high');
      window.dispatchEvent(new Event('appearancechange'));
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('contrast')).toHaveTextContent('high');
  });

  it('loads initial values from localStorage', () => {
    localStorage.setItem(SETTINGS_KEYS.THEME, 'light');
    localStorage.setItem(SETTINGS_KEYS.TEXT_SCALE, 'small');
    localStorage.setItem(SETTINGS_KEYS.SELECTED_PRIMARY_COLUMN, 'rejected');
    
    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    );
    
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('textScale')).toHaveTextContent('small');
    expect(screen.getByTestId('selected')).toHaveTextContent('rejected');
  });
});
