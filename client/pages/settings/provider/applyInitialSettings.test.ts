import { applyInitialSettings } from './applyInitialSettings';
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

describe('applyInitialSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-contrast');
    document.documentElement.style.removeProperty('--text-scale');
    document.documentElement.style.removeProperty('--animation-duration');
    vi.clearAllMocks();
  });

  it('applies default settings when localStorage is empty', () => {
    applyInitialSettings();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe('1');
    expect(document.documentElement.style.getPropertyValue('--animation-duration')).toBe('0.2s');
    expect(document.documentElement.getAttribute('data-contrast')).toBe('default');
  });

  it('applies light theme from matchMedia if localStorage is empty', () => {
    (window.matchMedia as any).mockImplementationOnce(query => ({
      matches: true,
      media: query,
    }));
    applyInitialSettings();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('applies settings from localStorage', () => {
    localStorage.setItem(SETTINGS_KEYS.THEME, 'light');
    localStorage.setItem(SETTINGS_KEYS.TEXT_SCALE, 'small');
    localStorage.setItem(SETTINGS_KEYS.MOTION, 'slow');
    localStorage.setItem(SETTINGS_KEYS.CONTRAST, 'high');
    
    applyInitialSettings();
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe('0.85');
    expect(document.documentElement.style.getPropertyValue('--animation-duration')).toBe('0.4s');
    expect(document.documentElement.getAttribute('data-contrast')).toBe('high');
  });

  it('handles other scale and motion values', () => {
    localStorage.setItem(SETTINGS_KEYS.TEXT_SCALE, 'large');
    localStorage.setItem(SETTINGS_KEYS.MOTION, 'fast');
    
    applyInitialSettings();
    
    expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe('1.15');
    expect(document.documentElement.style.getPropertyValue('--animation-duration')).toBe('0.1s');
  });

  it('handles errors gracefully in try-catch', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage access denied');
    });

    // Should not throw
    expect(() => applyInitialSettings()).not.toThrow();
    
    getItemSpy.mockRestore();
  });
});
