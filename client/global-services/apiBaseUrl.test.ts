import { describe, it, expect } from 'vitest';
import { API_BASE_URL } from './apiBaseUrl';

describe('apiBaseUrl', () => {
  it('should export API_BASE_URL', () => {
    expect(API_BASE_URL).toBeDefined();
  });
});
