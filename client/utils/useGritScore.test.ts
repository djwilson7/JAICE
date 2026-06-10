import { renderHook, waitFor } from '@testing-library/react';
import { useGritScore } from './useGritScore';
import { describe, it, expect, vi } from 'vitest';
import { api } from '@/global-services/api';

vi.mock('@/global-services/api', () => ({
  api: vi.fn(),
}));

describe('useGritScore', () => {
  it('should return loading initially, then fetch score successfully', async () => {
    vi.mocked(api).mockResolvedValue({
      data: {
        score: 65,
        weekly_apps: 5,
        followups: 2,
        consistency: 90,
      }
    } as any);

    const { result } = renderHook(() => useGritScore());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.score).toBe(65);
    expect(result.current.tier).toBe('Go-Getter');
  });

  it('should handle error', async () => {
    vi.mocked(api).mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useGritScore());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.score).toBe(0);
    expect(result.current.tier).toBe('Newcomer');
  });
});
