import { describe, it, expect, vi } from 'vitest';
import { supabase } from './database';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({ testClient: true })
}));

describe('database', () => {
  it('should export initialized supabase client', () => {
    expect(supabase).toBeDefined();
    expect((supabase as any).testClient).toBe(true);
  });
});
