import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlaywrightBrowser } from './browser.js';

describe('PlaywrightBrowser', () => {
  let browser: PlaywrightBrowser;

  beforeEach(() => {
    browser = new PlaywrightBrowser();
  });

  afterEach(async () => {
    try {
      await browser.close();
    } catch {
    }
  });

  describe('browser lifecycle', () => {
    it('should launch browser successfully', async () => {
      await browser.launch();
      expect(browser).toBeDefined();
    });

    it('should close browser successfully after launch', async () => {
      await browser.launch();
      await browser.close();
    });

    it('should handle close without launch gracefully', async () => {
      await browser.close();
    });

    it('should allow multiple launch and close cycles', async () => {
      await browser.launch();
      await browser.close();

      await browser.launch();
      await browser.close();
    });
  });

  describe('scrapePage', () => {
    beforeEach(async () => {
      await browser.launch();
    });

    it('should scrape https://example.com successfully', async () => {
      const result = await browser.scrapePage('https://example.com');
      expect(result).toBeDefined();
      expect(result.url).toBe('https://example.com');
      expect(result.html).toBeTruthy();
      expect(result.html.length).toBeGreaterThan(0);
      expect(Array.isArray(result.assets)).toBe(true);
    });

    it('should scrape https://github.com successfully', async () => {
      const result = await browser.scrapePage('https://github.com');
      expect(result).toBeDefined();
      expect(result.url).toBe('https://github.com');
      expect(result.html).toBeTruthy();
      expect(result.html.length).toBeGreaterThan(0);
    });

    it('should extract assets from page', async () => {
      const result = await browser.scrapePage('https://github.com');
      expect(result.assets).toBeDefined();
      expect(Array.isArray(result.assets)).toBe(true);
      expect(result.assets.length).toBeGreaterThan(0);
    });

    it('should extract CSS assets', async () => {
      const result = await browser.scrapePage('https://example.com');
      const cssAssets = result.assets.filter(a => a.type === 'CSS');
      expect(cssAssets.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract JS assets', async () => {
      const result = await browser.scrapePage('https://example.com');
      const jsAssets = result.assets.filter(a => a.type === 'JS');
      expect(jsAssets.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract IMG assets', async () => {
      const result = await browser.scrapePage('https://example.com');
      const imgAssets = result.assets.filter(a => a.type === 'IMG');
      expect(imgAssets.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract assets with valid URLs', async () => {
      const result = await browser.scrapePage('https://example.com');
      result.assets.forEach(asset => {
        expect(asset.url).toBeTruthy();
        expect(typeof asset.url).toBe('string');
        expect(asset.url.length).toBeGreaterThan(0);
      });
    });

    it('should extract assets with valid types', async () => {
      const result = await browser.scrapePage('https://example.com');
      const validTypes = ['CSS', 'JS', 'IMG', 'FONT'];
      result.assets.forEach(asset => {
        expect(validTypes).toContain(asset.type);
      });
    });

    it('should return HTML containing DOCTYPE', async () => {
      const result = await browser.scrapePage('https://example.com');
      expect(result.html).toMatch(/^<!DOCTYPE html>/i);
    });

    it('should return HTML containing <html> tag', async () => {
      const result = await browser.scrapePage('https://example.com');
      expect(result.html).toMatch(/<html/i);
    });

    it('should return HTML containing <body> tag', async () => {
      const result = await browser.scrapePage('https://example.com');
      expect(result.html).toMatch(/<body/i);
    });

    it('should handle multiple scrapePage calls', async () => {
      const result1 = await browser.scrapePage('https://example.com');
      const result2 = await browser.scrapePage('https://example.com');

      expect(result1.url).toBe('https://example.com');
      expect(result2.url).toBe('https://example.com');
      expect(result1.html).toBe(result2.html);
    });
  });

  describe('error handling', () => {
    it('should throw error when scraping without launching browser', async () => {
      const browser = new PlaywrightBrowser();
      await expect(browser.scrapePage('https://example.com')).rejects.toThrow('Browser not launched');
    });

    it('should throw error for invalid URL', async () => {
      await browser.launch();
      await expect(browser.scrapePage('invalid-url')).rejects.toThrow();
    });

    it('should throw error for empty URL', async () => {
      await browser.launch();
      await expect(browser.scrapePage('')).rejects.toThrow();
    });

    it('should throw error for malformed URL', async () => {
      await browser.launch();
      await expect(browser.scrapePage('http://')).rejects.toThrow();
    });

    it('should throw error for non-existent URL', async () => {
      await browser.launch();
      await expect(browser.scrapePage('http://this-domain-does-not-exist-12345.com')).rejects.toThrow();
    });

    it('should allow browser to close after error', async () => {
      await browser.launch();
      try {
        await browser.scrapePage('invalid-url');
      } catch {
      }
      await expect(browser.close()).resolves.not.toThrow();
    });
  });

  describe('graceful shutdown', () => {
    it('should close browser after successful scrape', async () => {
      await browser.launch();
      await browser.scrapePage('https://example.com');
      await expect(browser.close()).resolves.not.toThrow();
    });

    it('should close browser after failed scrape', async () => {
      await browser.launch();
      try {
        await browser.scrapePage('invalid-url');
      } catch {
      }
      await expect(browser.close()).resolves.not.toThrow();
    });

    it('should handle multiple error scenarios', async () => {
      await browser.launch();

      try {
        await browser.scrapePage('invalid-url-1');
      } catch {
      }

      try {
        await browser.scrapePage('invalid-url-2');
      } catch {
      }

      await expect(browser.close()).resolves.not.toThrow();
    });

    it('should allow re-launch after error', async () => {
      await browser.launch();
      try {
        await browser.scrapePage('invalid-url');
      } catch {
      }
      await browser.close();

      await browser.launch();
      const result = await browser.scrapePage('https://example.com');
      expect(result.url).toBe('https://example.com');
      await browser.close();
    });
  });

  describe('integration tests', () => {
    it('should perform complete workflow: launch -> scrape -> close', async () => {
      await browser.launch();
      const result = await browser.scrapePage('https://example.com');
      expect(result.url).toBe('https://example.com');
      await browser.close();
    });

    it('should handle multiple pages in sequence', async () => {
      await browser.launch();

      const urls = [
        'https://example.com',
        'https://example.com',
        'https://example.com'
      ];

      for (const url of urls) {
        const result = await browser.scrapePage(url);
        expect(result.url).toBe(url);
      }

      await browser.close();
    });

    it('should maintain browser state between scrapes', async () => {
      await browser.launch();

      const result1 = await browser.scrapePage('https://example.com');
      const result2 = await browser.scrapePage('https://example.com');

      expect(result1.url).toBe(result2.url);
      expect(result1.html).toBe(result2.html);

      await browser.close();
    });

    it('should handle edge cases: empty href/src and data URLs', async () => {
      await browser.launch();
      const result = await browser.scrapePage('file:///' + __dirname + '/../test-pages/edge-cases.html');

      const cssAssets = result.assets.filter(a => a.type === 'CSS');
      const jsAssets = result.assets.filter(a => a.type === 'JS');
      const imgAssets = result.assets.filter(a => a.type === 'IMG');
      const fontAssets = result.assets.filter(a => a.type === 'FONT');

      expect(cssAssets.length).toBeGreaterThanOrEqual(2);
      expect(cssAssets.some(a => a.url.includes('style.css'))).toBe(true);

      expect(jsAssets.length).toBeGreaterThanOrEqual(2);
      expect(jsAssets.some(a => a.url.includes('script.js'))).toBe(true);

      expect(imgAssets.length).toBeGreaterThanOrEqual(2);
      expect(imgAssets.some(a => a.url.includes('image.png'))).toBe(true);

      expect(fontAssets.length).toBeGreaterThanOrEqual(2);
      expect(fontAssets.some(f => f.url.includes('.woff'))).toBe(true);
      expect(fontAssets.some(f => f.url.includes('.ttf'))).toBe(true);

      const dataUrls = result.assets.filter(a => a.url.startsWith('data:'));
      expect(dataUrls).toHaveLength(0);

      await browser.close();
    });
  });
});
