import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useBrandImage } from './useBrandImage';
import brandLight from '@/assets/images/brand_light.png';
import brandDark from '@/assets/images/brand_dark.png';

describe('useBrandImage', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.removeAttribute('data-contrast');
  });

  it('should return light brand image', () => {
    const { result } = renderHook(() => useBrandImage());
    expect(result.current).toBe(brandLight);
  });

  it('should return dark brand image when theme is dark', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const { result } = renderHook(() => useBrandImage());
    expect(result.current).toBe(brandDark);
  });

  it('should return dark brand image when contrast is bw', () => {
    document.documentElement.setAttribute('data-contrast', 'bw');
    const { result } = renderHook(() => useBrandImage());
    expect(result.current).toBe(brandDark);
  });

  it('should update on appearance change', () => {
    const { result } = renderHook(() => useBrandImage());
    
    act(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      window.dispatchEvent(new Event('appearancechange'));
    });
    
    expect(result.current).toBe(brandDark);
  });
});
