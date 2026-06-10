import { describe, it, expect, vi } from 'vitest';
import { writeJobsToDB } from './writeJobsToDB';
import { api } from '@/global-services/api';

vi.mock('@/global-services/api', () => ({
  api: vi.fn()
}));

describe('writeJobsToDB', () => {
  it('should skip api call if empty array', async () => {
    const res = await writeJobsToDB({ jobs_to_update: [] });
    expect(res.status).toBe('success');
    expect(api).not.toHaveBeenCalled();
  });

  it('should call api if array has jobs', async () => {
    vi.mocked(api).mockResolvedValue({ status: 'success' });
    const res = await writeJobsToDB({ jobs_to_update: [{ id: '1' } as any] });
    expect(res.status).toBe('success');
    expect(api).toHaveBeenCalled();
  });

  it('should throw error if api fails', async () => {
    vi.mocked(api).mockRejectedValue(new Error('Network Error'));
    await expect(writeJobsToDB({ jobs_to_update: [{ id: '1' } as any] })).rejects.toThrow('Network Error');
  });
});
