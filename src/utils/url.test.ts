import { describe, it, expect } from 'vitest';
import { normalizeUrl, isSameOrigin } from './index.js';

describe('normalizeUrl', () => {
  it('should remove hash and search params', () => {
    const result = normalizeUrl('https://example.com/page?param=value#section');
    expect(result).toBe('https://example.com/page');
  });

  it('should keep protocol and path', () => {
    const result = normalizeUrl('https://example.com/path/to/page');
    expect(result).toBe('https://example.com/path/to/page');
  });

  it('should handle URLs without hash and search', () => {
    const result = normalizeUrl('https://example.com/page');
    expect(result).toBe('https://example.com/page');
  });
});

describe('isSameOrigin', () => {
  it('should return true for same hostname', () => {
    const url = new URL('https://example.com/page');
    expect(isSameOrigin(url, 'example.com')).toBe(true);
  });

  it('should return false for different hostname', () => {
    const url = new URL('https://other.com/page');
    expect(isSameOrigin(url, 'example.com')).toBe(false);
  });

  it('should return false for subdomain', () => {
    const url = new URL('https://sub.example.com/page');
    expect(isSameOrigin(url, 'example.com')).toBe(false);
  });
});
