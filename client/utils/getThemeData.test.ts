import { renderHook, act } from '@testing-library/react';
import { useThemeData } from './getThemeData';
import { describe, it, expect, beforeEach } from 'vitest';

describe('useThemeData', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.removeAttribute('data-contrast');
  });

  it('should return light theme by default when data-theme is light', () => {
    const { result } = renderHook(() => useThemeData());
    expect(result.current.label).toBe('Light Mode');
  });

  it('should return dark theme when data-theme is dark', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const { result } = renderHook(() => useThemeData());
    expect(result.current.label).toBe('Dark Mode');
  });

  it('should return bw theme when data-contrast is bw', () => {
    document.documentElement.setAttribute('data-contrast', 'bw');
    const { result } = renderHook(() => useThemeData());
    expect(result.current.label).toBe('Black and White');
  });

  it('should update theme when appearancechange event is dispatched', () => {
    const { result } = renderHook(() => useThemeData());
    expect(result.current.label).toBe('Light Mode');
    
    act(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      window.dispatchEvent(new Event('appearancechange'));
    });
    
    expect(result.current.label).toBe('Dark Mode');
  });
});
