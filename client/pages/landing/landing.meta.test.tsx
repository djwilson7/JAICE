import { describe, it, expect } from 'vitest';
import { LandingRoute } from './landing.meta';

describe('landing.meta', () => {
  it('should export the correct route object', () => {
    expect(LandingRoute.path).toBe('/');
    expect(LandingRoute.element).toBeTruthy();
  });
});
