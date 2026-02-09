import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { FileOrganizer } from './file-organizer';

describe('FileOrganizer', () => {
  let organizer: FileOrganizer;
  const testOutputDir = join(__dirname, '../test-output');

  beforeEach(() => {
    organizer = new FileOrganizer();
  });

  afterEach(async () => {
    try {
      await rm(testOutputDir, { recursive: true, force: true });
    } catch {
    }
  });

  describe('constructor', () => {
    it('should initialize with empty urlToFileMap', () => {
      expect(organizer.getUrlToFileMap()).toBeInstanceOf(Map);
      expect(organizer.getUrlToFileMap().size).toBe(0);
    });
  });

  describe('mapUrlToPath', () => {
    it('should map root path to index.html', () => {
      const result = organizer.mapUrlToPath('https://example.com/', 'https://example.com/');
      expect(result).toContain('example.com');
      expect(result).toContain('index.html');
    });

    it('should map empty path to index.html', () => {
      const result = organizer.mapUrlToPath('https://example.com', 'https://example.com');
      expect(result).toContain('example.com');
      expect(result).toContain('index.html');
    });

    it('should map path ending with slash to directory index', () => {
      const result = organizer.mapUrlToPath('https://example.com/about/', 'https://example.com/');
      expect(result).toContain('example.com');
      expect(result).toContain('about/index.html');
    });

    it('should map path without slash to .html file', () => {
      const result = organizer.mapUrlToPath('https://example.com/about', 'https://example.com/');
      expect(result).toContain('example.com');
      expect(result).toContain('about.html');
    });

    it('should preserve .html extension for paths ending with .html', () => {
      const result = organizer.mapUrlToPath('https://example.com/page.html', 'https://example.com/');
      expect(result).toContain('example.com');
      expect(result).toContain('page.html');
      expect(result).not.toContain('page.html.html');
    });

    it('should handle nested paths', () => {
      const result = organizer.mapUrlToPath('https://example.com/products/item-123', 'https://example.com/');
      expect(result).toContain('example.com');
      expect(result).toContain('products/item-123.html');
    });

    it('should handle nested paths with trailing slash', () => {
      const result = organizer.mapUrlToPath('https://example.com/products/category/', 'https://example.com/');
      expect(result).toContain('example.com');
      expect(result).toContain('products/category/index.html');
    });

    it('should handle deeply nested paths', () => {
      const result = organizer.mapUrlToPath('https://example.com/a/b/c/d/e', 'https://example.com/');
      expect(result).toContain('example.com');
      expect(result).toContain('a/b/c/d/e.html');
    });

    it('should handle paths with query parameters', () => {
      const result = organizer.mapUrlToPath('https://example.com/page?id=1', 'https://example.com/');
      expect(result).toContain('example.com');
      expect(result).toContain('page.html');
    });

    it('should handle paths with hash fragments', () => {
      const result = organizer.mapUrlToPath('https://example.com/page#section', 'https://example.com/');
      expect(result).toContain('example.com');
      expect(result).toContain('page.html');
    });

    it('should use correct hostname from baseUrl', () => {
      const result = organizer.mapUrlToPath('https://subdomain.example.com/', 'https://subdomain.example.com/');
      expect(result).toContain('subdomain.example.com');
      expect(result).toContain('index.html');
    });

    it('should handle mixed case hostname', () => {
      const result = organizer.mapUrlToPath('https://Example.COM/', 'https://Example.COM/');
      expect(result).toContain('example.com');
      expect(result).toContain('index.html');
    });
  });

  describe('organize', () => {
    it('should create index.html for root URL', async () => {
      const pages = new Map([['https://example.com/', '<html><body>Home</body></html>']]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const indexPath = join(testOutputDir, 'example.com', 'index.html');
      expect(existsSync(indexPath)).toBe(true);

      const content = await readFile(indexPath, 'utf-8');
      expect(content).toContain('Home');
    });

    it('should create .html files for simple paths', async () => {
      const pages = new Map([['https://example.com/about', '<html><body>About</body></html>']]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const aboutPath = join(testOutputDir, 'example.com', 'about.html');
      expect(existsSync(aboutPath)).toBe(true);

      const content = await readFile(aboutPath, 'utf-8');
      expect(content).toContain('About');
    });

    it('should create index.html for paths with trailing slash', async () => {
      const pages = new Map([['https://example.com/contact/', '<html><body>Contact</body></html>']]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const contactPath = join(testOutputDir, 'example.com', 'contact', 'index.html');
      expect(existsSync(contactPath)).toBe(true);

      const content = await readFile(contactPath, 'utf-8');
      expect(content).toContain('Contact');
    });

    it('should handle multiple pages', async () => {
      const pages = new Map([
        ['https://example.com/', '<html><body>Home</body></html>'],
        ['https://example.com/about', '<html><body>About</body></html>'],
        ['https://example.com/contact/', '<html><body>Contact</body></html>']
      ]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      expect(existsSync(join(testOutputDir, 'example.com', 'index.html'))).toBe(true);
      expect(existsSync(join(testOutputDir, 'example.com', 'about.html'))).toBe(true);
      expect(existsSync(join(testOutputDir, 'example.com', 'contact', 'index.html'))).toBe(true);
    });

    it('should create _metadata.json file', async () => {
      const pages = new Map([
        ['https://example.com/', '<html><body>Home</body></html>'],
        ['https://example.com/about', '<html><body>About</body></html>']
      ]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const metadataPath = join(testOutputDir, '_metadata.json');
      expect(existsSync(metadataPath)).toBe(true);

      const metadataContent = await readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata.length).toBe(2);
      expect(metadata[0]).toHaveProperty('url');
      expect(metadata[0]).toHaveProperty('filePath');
    });

    it('should populate urlToFileMap after organize', async () => {
      const pages = new Map([
        ['https://example.com/', '<html><body>Home</body></html>'],
        ['https://example.com/about', '<html><body>About</body></html>']
      ]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const urlMap = organizer.getUrlToFileMap();
      expect(urlMap.size).toBe(2);
      expect(urlMap.has('https://example.com/')).toBe(true);
      expect(urlMap.has('https://example.com/about')).toBe(true);
    });

    it('should create nested directory structure', async () => {
      const pages = new Map([['https://example.com/products/item-123', '<html><body>Product</body></html>']]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const productPath = join(testOutputDir, 'example.com', 'products', 'item-123.html');
      expect(existsSync(productPath)).toBe(true);

      const content = await readFile(productPath, 'utf-8');
      expect(content).toContain('Product');
    });

    it('should handle deeply nested directory structure', async () => {
      const pages = new Map([['https://example.com/a/b/c/d', '<html><body>Deep</body></html>']]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const deepPath = join(testOutputDir, 'example.com', 'a', 'b', 'c', 'd.html');
      expect(existsSync(deepPath)).toBe(true);
    });

    it('should handle empty pages map', async () => {
      const pages = new Map();
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const metadataPath = join(testOutputDir, '_metadata.json');
      expect(existsSync(metadataPath)).toBe(true);

      const metadataContent = await readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      expect(Array.isArray(metadata)).toBe(true);
      expect(metadata.length).toBe(0);
    });

    it('should handle HTML content with special characters', async () => {
      const htmlContent = '<html><body>Текст на русском &amp; more</body></html>';
      const pages = new Map([['https://example.com/', htmlContent]]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const indexPath = join(testOutputDir, 'example.com', 'index.html');
      const content = await readFile(indexPath, 'utf-8');

      expect(content).toContain('Текст на русском');
    });

    it('should handle URLs with query parameters', async () => {
      const pages = new Map([['https://example.com/page?id=1', '<html><body>Page</body></html>']]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const pagePath = join(testOutputDir, 'example.com', 'page.html');
      expect(existsSync(pagePath)).toBe(true);
    });

    it('should handle URLs with hash fragments', async () => {
      const pages = new Map([['https://example.com/page#section', '<html><body>Page</body></html>']]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const pagePath = join(testOutputDir, 'example.com', 'page.html');
      expect(existsSync(pagePath)).toBe(true);
    });
  });

  describe('getUrlToFileMap', () => {
    it('should return the same map instance', () => {
      const map1 = organizer.getUrlToFileMap();
      const map2 = organizer.getUrlToFileMap();

      expect(map1).toBe(map2);
    });

    it('should return empty map initially', () => {
      const map = organizer.getUrlToFileMap();
      expect(map.size).toBe(0);
    });

    it('should return populated map after organize', async () => {
      const pages = new Map([['https://example.com/', '<html><body>Home</body></html>']]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const map = organizer.getUrlToFileMap();
      expect(map.size).toBe(1);
      expect(map.get('https://example.com/')).toContain('index.html');
    });
  });

  describe('integration tests', () => {
    it('should handle complete website structure', async () => {
      const pages = new Map([
        ['https://example.com/', '<html><body>Home</body></html>'],
        ['https://example.com/about', '<html><body>About</body></html>'],
        ['https://example.com/contact/', '<html><body>Contact</body></html>'],
        ['https://example.com/products/item-1', '<html><body>Product 1</body></html>'],
        ['https://example.com/products/item-2', '<html><body>Product 2</body></html>'],
        ['https://example.com/blog/2024/01/post', '<html><body>Blog Post</body></html>']
      ]);
      await organizer.organize(pages, testOutputDir, 'https://example.com/');

      const expectedFiles = [
        'example.com/index.html',
        'example.com/about.html',
        'example.com/contact/index.html',
        'example.com/products/item-1.html',
        'example.com/products/item-2.html',
        'example.com/blog/2024/01/post.html'
      ];

      for (const file of expectedFiles) {
        const filePath = join(testOutputDir, file);
        expect(existsSync(filePath), `File ${file} should exist`).toBe(true);
      }

      const metadataPath = join(testOutputDir, '_metadata.json');
      const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
      expect(metadata.length).toBe(6);
    });

    it('should handle different hostname', async () => {
      const pages = new Map([['https://test-site.com/', '<html><body>Test</body></html>']]);
      await organizer.organize(pages, testOutputDir, 'https://test-site.com/');

      const indexPath = join(testOutputDir, 'test-site.com', 'index.html');
      expect(existsSync(indexPath)).toBe(true);
    });
  });
});
