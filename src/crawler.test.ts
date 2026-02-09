import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Crawler } from './crawler.js';
import type { IBrowser, IPageData } from './types.js';

describe('Crawler', () => {
  const mockBrowser: IBrowser = {
    launch: vi.fn(),
    close: vi.fn(),
    scrapePage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create crawler with browser and maxDepth', () => {
      const crawler = new Crawler(mockBrowser, 2);
      expect(crawler).toBeDefined();
    });
  });


  describe('extractLinks', () => {
    it('should extract absolute links from HTML', () => {
      const crawler = new Crawler(mockBrowser, 2);
      const html = '<a href="https://example.com/page1">Link 1</a>';
      const links = crawler['extractLinks'](html, 'https://example.com');
      expect(links).toEqual(['https://example.com/page1']);
    });

    it('should extract relative links and convert to absolute', () => {
      const crawler = new Crawler(mockBrowser, 2);
      const html = '<a href="/page2">Link 2</a>';
      const links = crawler['extractLinks'](html, 'https://example.com');
      expect(links).toEqual(['https://example.com/page2']);
    });

    it('should extract multiple links', () => {
      const crawler = new Crawler(mockBrowser, 2);
      const html = '<a href="/page1">Link 1</a><a href="https://example.com/page2">Link 2</a>';
      const links = crawler['extractLinks'](html, 'https://example.com');
      expect(links).toEqual(['https://example.com/page1', 'https://example.com/page2']);
    });

    it('should ignore javascript: links', () => {
      const crawler = new Crawler(mockBrowser, 2);
      const html = '<a href="javascript:void(0)">Click</a>';
      const links = crawler['extractLinks'](html, 'https://example.com');
      expect(links).toEqual([]);
    });

    it('should ignore mailto: links', () => {
      const crawler = new Crawler(mockBrowser, 2);
      const html = '<a href="mailto:test@example.com">Email</a>';
      const links = crawler['extractLinks'](html, 'https://example.com');
      expect(links).toEqual([]);
    });

    it('should ignore tel: links', () => {
      const crawler = new Crawler(mockBrowser, 2);
      const html = '<a href="tel:+1234567890">Call</a>';
      const links = crawler['extractLinks'](html, 'https://example.com');
      expect(links).toEqual([]);
    });

    it('should handle empty href attribute', () => {
      const crawler = new Crawler(mockBrowser, 2);
      const html = '<a href="">Empty</a>';
      const links = crawler['extractLinks'](html, 'https://example.com/');
      expect(links).toEqual([]);
    });

    it('should handle relative path with subdirectory', () => {
      const crawler = new Crawler(mockBrowser, 2);
      const html = '<a href="subpage.html">Sub</a>';
      const links = crawler['extractLinks'](html, 'https://example.com/dir/');
      expect(links).toEqual(['https://example.com/dir/subpage.html']);
    });
  });

  describe('crawl', () => {
    it('should scrape start page', async () => {
      const mockPageData: IPageData = {
        url: 'https://example.com/',
        html: '<html><body>No links</body></html>',
        assets: [],
      };
      mockBrowser.scrapePage = vi.fn().mockResolvedValue(mockPageData);

      const crawler = new Crawler(mockBrowser, 2);
      const results = await crawler.crawl('https://example.com');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://example.com/');
      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/');
    });

    it('should follow links within same origin', async () => {
      const createMockPageData = (url: string, html: string): IPageData => ({ url, html, assets: [] });

      mockBrowser.scrapePage = vi.fn()
        .mockResolvedValueOnce(createMockPageData('https://example.com/', '<html><body><a href="/page1">Link 1</a><a href="/page2">Link 2</a></body></html>'))
        .mockResolvedValueOnce(createMockPageData('https://example.com/page1', '<html><body>No links</body></html>'))
        .mockResolvedValueOnce(createMockPageData('https://example.com/page2', '<html><body>No links</body></html>'));

      const crawler = new Crawler(mockBrowser, 2);
      const results = await crawler.crawl('https://example.com');

      expect(results.length).toBeGreaterThan(1);
    });

    it('should not follow links to different origin', async () => {
      const mockPageData: IPageData = {
        url: 'https://example.com/',
        html: '<html><body><a href="https://other.com/page">External Link</a></body></html>',
        assets: [],
      };
      mockBrowser.scrapePage = vi.fn().mockResolvedValue(mockPageData);

      const crawler = new Crawler(mockBrowser, 2);
      const results = await crawler.crawl('https://example.com');

      expect(results).toHaveLength(1);
      expect(mockBrowser.scrapePage).toHaveBeenCalledTimes(1);
    });

    it('should respect maxDepth limit', async () => {
      const mockPageData: (url: string) => IPageData = (url) => ({
        url: url.includes('example.com/') && url.endsWith('/') ? url : url + '/',
        html: '<html><body><a href="/next">Next</a></body></html>',
        assets: [],
      });

      mockBrowser.scrapePage = vi.fn().mockImplementation((url) => Promise.resolve(mockPageData(url)));

      const crawler = new Crawler(mockBrowser, 1);
      await crawler.crawl('https://example.com');

      expect(mockBrowser.scrapePage).toHaveBeenCalledTimes(2);
    });

    it('should not revisit URLs', async () => {
      const mockPageData1: IPageData = {
        url: 'https://example.com/',
        html: '<html><body><a href="/page1">Link 1</a></body></html>',
        assets: [],
      };
      const mockPageData2: IPageData = {
        url: 'https://example.com/page1',
        html: '<html><body><a href="/">Back to home</a></body></html>',
        assets: [],
      };

      mockBrowser.scrapePage = vi.fn()
        .mockResolvedValueOnce(mockPageData1)
        .mockResolvedValueOnce(mockPageData2);

      const crawler = new Crawler(mockBrowser, 2);
      const results = await crawler.crawl('https://example.com');

      expect(results).toHaveLength(2);
      expect(mockBrowser.scrapePage).toHaveBeenCalledTimes(2);
    });

    it('should handle circular references', async () => {
      const mockPageData1: IPageData = {
        url: 'https://example.com/',
        html: '<html><body><a href="/page1">Link 1</a></body></html>',
        assets: [],
      };
      const mockPageData2: IPageData = {
        url: 'https://example.com/page1',
        html: '<html><body><a href="/">Home</a><a href="/page1">Self</a></body></html>',
        assets: [],
      };

      mockBrowser.scrapePage = vi.fn()
        .mockResolvedValueOnce(mockPageData1)
        .mockResolvedValueOnce(mockPageData2);

      const crawler = new Crawler(mockBrowser, 2);
      const results = await crawler.crawl('https://example.com');

      expect(results).toHaveLength(2);
      expect(mockBrowser.scrapePage).toHaveBeenCalledTimes(2);
    });

    it('should normalize URLs before processing', async () => {
      const createMockPageData = (url: string, html: string): IPageData => ({ url, html, assets: [] });

      mockBrowser.scrapePage = vi.fn()
        .mockResolvedValueOnce(createMockPageData('https://example.com/', '<html><body><a href="/page?param=value#hash">Link</a></body></html>'))
        .mockResolvedValueOnce(createMockPageData('https://example.com/page', '<html><body>No links</body></html>'));

      const crawler = new Crawler(mockBrowser, 2);
      await crawler.crawl('https://example.com');

      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/');
      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/page');
    });

    it('should handle empty HTML with no links', async () => {
      const mockPageData: IPageData = {
        url: 'https://example.com',
        html: '<html><body>No links</body></html>',
        assets: [],
      };
      mockBrowser.scrapePage = vi.fn().mockResolvedValue(mockPageData);

      const crawler = new Crawler(mockBrowser, 2);
      const results = await crawler.crawl('https://example.com');

      expect(results).toHaveLength(1);
      expect(mockBrowser.scrapePage).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid URLs gracefully', async () => {
      const createMockPageData = (url: string, html: string): IPageData => ({ url, html, assets: [] });

      mockBrowser.scrapePage = vi.fn().mockImplementation((url: string) => {
        if (url === 'https://example.com/') {
          return Promise.resolve(createMockPageData('https://example.com/', '<html><body><a href="://invalid-url">Invalid</a><a href="/valid">Valid</a></body></html>'));
        }
        return Promise.resolve(createMockPageData(url, '<html><body>No links</body></html>'));
      });

      const crawler = new Crawler(mockBrowser, 2);
      const results = await crawler.crawl('https://example.com');

      expect(results).toHaveLength(2);
      expect(results[0].url).toBe('https://example.com/');
      expect(results[1].url).toBe('https://example.com/valid');
    });

    it('should handle depth 0 (only start page)', async () => {
      const mockPageData: IPageData = {
        url: 'https://example.com/',
        html: '<html><body><a href="/page1">Link</a></body></html>',
        assets: [],
      };
      mockBrowser.scrapePage = vi.fn().mockResolvedValue(mockPageData);

      const crawler = new Crawler(mockBrowser, 0);
      const results = await crawler.crawl('https://example.com');

      expect(results).toHaveLength(1);
      expect(mockBrowser.scrapePage).toHaveBeenCalledTimes(1);
    });

    it('should handle links with hash fragments', async () => {
      const mockPageData: IPageData = {
        url: 'https://example.com/',
        html: '<html><body><a href="/page1#section">Link</a></body></html>',
        assets: [],
      };
      mockBrowser.scrapePage = vi.fn().mockResolvedValue(mockPageData);

      const crawler = new Crawler(mockBrowser, 2);
      await crawler.crawl('https://example.com');

      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/');
      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/page1');
    });

    it('should handle links with query parameters', async () => {
      const mockPageData: IPageData = {
        url: 'https://example.com/',
        html: '<html><body><a href="/page1?param=value">Link</a></body></html>',
        assets: [],
      };
      mockBrowser.scrapePage = vi.fn().mockResolvedValue(mockPageData);

      const crawler = new Crawler(mockBrowser, 2);
      await crawler.crawl('https://example.com');

      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/');
      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/page1');
    });
  });

  describe('edge cases', () => {
    it('should handle malformed HTML gracefully', async () => {
      const mockPageData: IPageData = {
        url: 'https://example.com/',
        html: '<html><body><a href>Link</a><a href="">Empty</a></body></html>',
        assets: [],
      };
      mockBrowser.scrapePage = vi.fn().mockResolvedValue(mockPageData);

      const crawler = new Crawler(mockBrowser, 2);
      const results = await crawler.crawl('https://example.com');

      expect(results).toHaveLength(1);
    });

    it('should handle URLs with special characters', async () => {
      const mockPageData: IPageData = {
        url: 'https://example.com/',
        html: '<html><body><a href="/page?name=test&value=123">Link</a></body></html>',
        assets: [],
      };
      mockBrowser.scrapePage = vi.fn().mockResolvedValue(mockPageData);

      const crawler = new Crawler(mockBrowser, 2);
      await crawler.crawl('https://example.com');

      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/');
      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/page');
    });

    it('should handle protocol-relative URLs', async () => {
      const mockPageData: IPageData = {
        url: 'https://example.com/',
        html: '<html><body><a href="//example.com/page">Link</a></body></html>',
        assets: [],
      };
      mockBrowser.scrapePage = vi.fn().mockResolvedValue(mockPageData);

      const crawler = new Crawler(mockBrowser, 2);
      await crawler.crawl('https://example.com');

      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/');
      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/page');
    });

    it('should handle invalid URLs that throw in URL constructor', async () => {
      const mockPageData: IPageData = {
        url: 'https://example.com/',
        html: '<html><body><a href="http://\u0000">Invalid URL with null byte in protocol</a><a href="/valid">Valid Link</a></body></html>',
        assets: [],
      };
      mockBrowser.scrapePage = vi.fn().mockResolvedValue(mockPageData);

      const crawler = new Crawler(mockBrowser, 2);
      await crawler.crawl('https://example.com');

      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/');
      expect(mockBrowser.scrapePage).toHaveBeenCalledWith('https://example.com/valid');
      expect(mockBrowser.scrapePage).toHaveBeenCalledTimes(2);
    });
  });
});
