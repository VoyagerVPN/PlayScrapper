import { describe, it, expect, beforeEach } from 'vitest';
import { AssetRegistry } from './registry';

describe('AssetRegistry', () => {
  let registry: AssetRegistry;

  beforeEach(() => {
    registry = new AssetRegistry();
  });

  describe('normalize', () => {
    it('should remove hash from URL', () => {
      const result = registry.normalize('https://example.com/image.jpg#hash', 'https://example.com');
      expect(result).toBe('https://example.com/image.jpg');
    });

    it('should keep whitelisted query parameters', () => {
      const url = 'https://example.com/image.jpg?w=800&q=90&format=webp';
      const result = registry.normalize(url, url);
      expect(result).toContain('w=800');
      expect(result).toContain('q=90');
      expect(result).toContain('format=webp');
    });

    it('should remove non-whitelisted query parameters', () => {
      const url = 'https://example.com/image.jpg?w=800&session=abc123&timestamp=123456';
      const result = registry.normalize(url, url);
      expect(result).toContain('w=800');
      expect(result).not.toContain('session');
      expect(result).not.toContain('timestamp');
    });

    it('should normalize URLs with different width parameters', () => {
      const url1 = 'https://example.com/image.jpg?w=800&q=80';
      const url2 = 'https://example.com/image.jpg?w=1200&q=80';
      const result1 = registry.normalize(url1, url1);
      const result2 = registry.normalize(url2, url2);
      expect(result1).not.toBe(result2);
    });

    it('should normalize relative URLs with base', () => {
      const result = registry.normalize('/images/logo.png', 'https://example.com/page/');
      expect(result).toBe('https://example.com/images/logo.png');
    });

    it('should remove width/height variations properly', () => {
      const url1 = 'https://example.com/image.jpg?w=800&h=600';
      const url2 = 'https://example.com/image.jpg?w=800&h=600';
      const result1 = registry.normalize(url1, url1);
      const result2 = registry.normalize(url2, url2);
      expect(result1).toBe(result2);
    });

    it('should handle empty query strings', () => {
      const url = 'https://example.com/image.jpg?';
      const result = registry.normalize(url, url);
      expect(result).toBe('https://example.com/image.jpg');
    });
  });

  describe('add', () => {
    it('should add new URL and return true', async () => {
      const result = await registry.add('https://example.com/image.jpg');
      expect(result).toBe(true);
      expect(await registry.size()).toBe(1);
    });

    it('should reject duplicate URL and return false', async () => {
      const url = 'https://example.com/image.jpg';
      const result1 = await registry.add(url);
      const result2 = await registry.add(url);
      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(await registry.size()).toBe(1);
    });

    it('should normalize URL before adding', async () => {
      await registry.add('https://example.com/image.jpg#hash1');
      const result = await registry.add('https://example.com/image.jpg#hash2');
      expect(result).toBe(false);
      expect(await registry.size()).toBe(1);
    });

    it('should treat URLs with different whitelisted params as different', async () => {
      await registry.add('https://example.com/image.jpg?w=800');
      const result = await registry.add('https://example.com/image.jpg?w=1200');
      expect(result).toBe(true);
      expect(await registry.size()).toBe(2);
    });

    it('should treat URLs with different non-whitelisted params as same', async () => {
      await registry.add('https://example.com/image.jpg?session=abc');
      const result = await registry.add('https://example.com/image.jpg?session=xyz');
      expect(result).toBe(false);
      expect(await registry.size()).toBe(1);
    });
  });

  describe('has', () => {
    it('should return true for existing URL', async () => {
      const url = 'https://example.com/image.jpg';
      await registry.add(url);
      expect(await registry.has(url)).toBe(true);
    });

    it('should return false for non-existing URL', async () => {
      expect(await registry.has('https://example.com/missing.jpg')).toBe(false);
    });

    it('should normalize URL before checking', async () => {
      const url = 'https://example.com/image.jpg#hash';
      await registry.add(url);
      expect(await registry.has('https://example.com/image.jpg')).toBe(true);
    });
  });

  describe('size', () => {
    it('should return 0 for empty registry', async () => {
      expect(await registry.size()).toBe(0);
    });

    it('should return correct count after adding URLs', async () => {
      await registry.add('https://example.com/1.jpg');
      await registry.add('https://example.com/2.jpg');
      await registry.add('https://example.com/3.jpg');
      expect(await registry.size()).toBe(3);
    });

    it('should not increase on duplicates', async () => {
      await registry.add('https://example.com/image.jpg');
      await registry.add('https://example.com/image.jpg');
      expect(await registry.size()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all URLs', async () => {
      await registry.add('https://example.com/1.jpg');
      await registry.add('https://example.com/2.jpg');
      await registry.clear();
      expect(await registry.size()).toBe(0);
      expect(await registry.has('https://example.com/1.jpg')).toBe(false);
    });

    it('should allow adding after clear', async () => {
      await registry.add('https://example.com/1.jpg');
      await registry.clear();
      const result = await registry.add('https://example.com/1.jpg');
      expect(result).toBe(true);
    });
  });

  describe('thread safety simulation', () => {
    it('should handle concurrent add operations', async () => {
      const promises: Promise<boolean>[] = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve(registry.add(`https://example.com/image${i}.jpg`))
        );
      }

      const results = await Promise.all(promises);
      expect(results.every(r => r === true)).toBe(true);
      expect(await registry.size()).toBe(100);
    });

    it('should handle concurrent duplicate add operations', async () => {
      const promises: Promise<boolean>[] = [];
      const url = 'https://example.com/image.jpg';

      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve(registry.add(url)));
      }

      const results = await Promise.all(promises);
      const trueCount = results.filter(r => r === true).length;
      expect(trueCount).toBe(1);
      expect(await registry.size()).toBe(1);
    });
  });
});
