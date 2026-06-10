import { describe, it, expect, vi } from 'vitest';
import { getCSSVar } from './getCSSVar';

describe('getCSSVar', () => {
  it('should return the computed style property value', () => {
    // Mock getComputedStyle
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = vi.fn().mockImplementation(() => ({
      getPropertyValue: (name: string) => {
        if (name === '--test-var') return 'test-value';
        return '';
      }
    })) as any;

    expect(getCSSVar('--test-var')).toBe('test-value');
    expect(getCSSVar('--unknown-var')).toBe('');

    // Restore original getComputedStyle
    window.getComputedStyle = originalGetComputedStyle;
  });
});
