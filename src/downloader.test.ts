import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Downloader } from './downloader.js';
import { AssetType } from './types.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { normalize } from 'path';

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

global.fetch = vi.fn();

describe('Downloader', () => {
  let downloader: Downloader;

  beforeEach(() => {
    downloader = new Downloader('./test-output');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default output directory', () => {
      const defaultDownloader = new Downloader();
      expect(defaultDownloader['outputDir']).toBe('./scraped/static');
    });

    it('should initialize with custom output directory', () => {
      const customDownloader = new Downloader('./custom-dir');
      expect(customDownloader['outputDir']).toBe('./custom-dir');
    });

    it('should initialize empty asset map', () => {
      expect(downloader.getAssetMap().size).toBe(0);
    });
  });

  describe('download', () => {
    it('should download content successfully', async () => {
      const mockContent = 'test content';
      const mockResponse = {
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode(mockContent).buffer),
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await downloader.download('https://example.com/test.js');
      const decodedContent = new TextDecoder().decode(result);
      expect(decodedContent).toBe(mockContent);
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/test.js');
    });

    it('should throw error for HTTP 404', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        arrayBuffer: vi.fn(),
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(downloader.download('https://example.com/missing.js'))
        .rejects
        .toThrow('HTTP 404: Not Found');
    });

    it('should throw error for HTTP 500', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        arrayBuffer: vi.fn(),
      };

      vi.mocked(global.fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(downloader.download('https://example.com/error.js'))
        .rejects
        .toThrow('HTTP 500: Internal Server Error');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      vi.mocked(global.fetch).mockRejectedValue(networkError);

      await expect(downloader.download('https://example.com/test.js'))
        .rejects
        .toThrow('Failed to download https://example.com/test.js: Network timeout');
    });

    it('should handle non-Error throwables', async () => {
      const nonErrorValue = 'string error';
      vi.mocked(global.fetch).mockRejectedValue(nonErrorValue);

      await expect(downloader.download('https://example.com/test.js'))
        .rejects
        .toThrow(nonErrorValue);
    });
  });

  describe('getLocalPath', () => {
    it('should generate local path for CSS file', () => {
      const path = downloader.getLocalPath('https://example.com/styles/main.css');
      expect(normalize(path)).toContain(normalize('./test-output/css/main.css'));
      expect(path).toContain('main.css');
    });

    it('should generate local path for JS file', () => {
      const path = downloader.getLocalPath('https://example.com/js/app.js');
      expect(normalize(path)).toContain(normalize('./test-output/js/app.js'));
    });

    it('should generate local path for image', () => {
      const path = downloader.getLocalPath('https://example.com/images/logo.png');
      expect(normalize(path)).toContain(normalize('./test-output/images/logo.png'));
    });

    it('should generate local path for font', () => {
      const path = downloader.getLocalPath('https://example.com/fonts/roboto.woff2');
      expect(normalize(path)).toContain(normalize('./test-output/fonts/roboto.woff2'));
    });

    it('should handle URLs without extension', () => {
      const path = downloader.getLocalPath('https://example.com/js/script');
      expect(normalize(path)).toContain(normalize('./test-output/js'));
      expect(path).toContain('script');
    });

    it('should handle URLs ending with slash', () => {
      const path = downloader.getLocalPath('https://cdn.example.com/');
      expect(normalize(path)).toContain(normalize('./test-output'));
      expect(path).toContain('asset_');
    });

    it('should return same path for duplicate URLs (deduplication)', () => {
      const url = 'https://example.com/style.css';
      const path1 = downloader.getLocalPath(url);
      const path2 = downloader.getLocalPath(url);
      expect(path1).toBe(path2);
      expect(downloader.getAssetMap().size).toBe(1);
    });

    it('should detect CSS type from URL path', () => {
      const path = downloader.getLocalPath('https://cdn.example.com/css/main');
      expect(normalize(path)).toContain(normalize('./test-output/css'));
    });

    it('should detect JS type from URL path', () => {
      const path = downloader.getLocalPath('https://cdn.example.com/js/bundle');
      expect(normalize(path)).toContain(normalize('./test-output/js'));
    });

    it('should categorize SVG as image', () => {
      const path = downloader.getLocalPath('https://example.com/icon.svg');
      expect(normalize(path)).toContain(normalize('./test-output/images/icon.svg'));
    });

    it('should categorize WEBP as image', () => {
      const path = downloader.getLocalPath('https://example.com/photo.webp');
      expect(normalize(path)).toContain(normalize('./test-output/images/photo.webp'));
    });

    it('should categorize WOFF2 as font', () => {
      const path = downloader.getLocalPath('https://example.com/fonts/inter.woff2');
      expect(normalize(path)).toContain(normalize('./test-output/fonts/inter.woff2'));
    });

    it('should categorize TTF as font', () => {
      const path = downloader.getLocalPath('https://example.com/fonts/arial.ttf');
      expect(normalize(path)).toContain(normalize('./test-output/fonts/arial.ttf'));
    });

    it('should handle unknown extensions as OTHER', () => {
      const path = downloader.getLocalPath('https://example.com/data/file.xyz');
      expect(normalize(path)).toContain(normalize('./test-output/other'));
    });
  });

  describe('saveAsset', () => {
    it('should save asset with buffer', async () => {
      const mockBuffer = Buffer.from('test content');
      const localPath = './test-output/css/style.css';
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      downloader['assetMap'].set('https://example.com/style.css', localPath);

      const result = await downloader.saveAsset('https://example.com/style.css', mockBuffer);
      expect(result).toBe(localPath);
      expect(mkdir).toHaveBeenCalledWith('./test-output/css', { recursive: true });
      expect(writeFile).toHaveBeenCalledWith(localPath, mockBuffer);
    });

    it('should generate local path for new URL', async () => {
      const mockBuffer = Buffer.from('test content');
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const result = await downloader.saveAsset('https://example.com/new.css', mockBuffer);
      expect(normalize(result)).toContain(normalize('./test-output/css/new.css'));
      expect(downloader.getAssetMap().size).toBe(1);
    });

    it('should reuse local path for existing URL', async () => {
      const mockBuffer = Buffer.from('test content');
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const url = 'https://example.com/duplicate.css';
      downloader.getLocalPath(url);
      expect(downloader.getAssetMap().size).toBe(1);

      const result = await downloader.saveAsset(url, mockBuffer);
      expect(downloader.getAssetMap().size).toBe(1);
      expect(result).toBe(downloader.getLocalPath(url));
    });
  });

  describe('getAssetMap', () => {
    it('should return readonly map', () => {
      const url = 'https://example.com/test.js';
      downloader.getLocalPath(url);
      const map = downloader.getAssetMap();
      expect(map.has(url)).toBe(true);
      expect(map.size).toBe(1);
    });

    it('should return empty map initially', () => {
      const map = downloader.getAssetMap();
      expect(map.size).toBe(0);
    });

    it('should reflect all added assets', () => {
      const urls = [
        'https://example.com/style.css',
        'https://example.com/app.js',
        'https://example.com/logo.png',
      ];

      urls.forEach(url => downloader.getLocalPath(url));
      const map = downloader.getAssetMap();

      expect(map.size).toBe(3);
      urls.forEach(url => expect(map.has(url)).toBe(true));
    });
  });

  describe('file name generation edge cases', () => {
    it('should handle URL with query parameters', () => {
      const path = downloader.getLocalPath('https://example.com/style.css?v=123&hash=abc');
      expect(normalize(path)).toContain(normalize('./test-output/css'));
      expect(path).toContain('style.css');
    });

    it('should handle URL with hash fragment', () => {
      const path = downloader.getLocalPath('https://example.com/script.js#section');
      expect(normalize(path)).toContain(normalize('./test-output/js'));
      expect(path).toContain('script.js');
    });

    it('should handle URL with encoded characters', () => {
      const path = downloader.getLocalPath('https://example.com/file%20name.png');
      expect(normalize(path)).toContain(normalize('./test-output/images'));
    });

    it('should handle invalid URL gracefully', () => {
      const path = downloader.getLocalPath('not-a-url');
      expect(normalize(path)).toContain(normalize('./test-output/other'));
      expect(path).toContain('asset_');
    });

    it('should handle empty URL path', () => {
      const path = downloader.getLocalPath('https://example.com');
      expect(normalize(path)).toContain(normalize('./test-output'));
      expect(path).toContain('asset_');
    });

    it('should handle root path', () => {
      const path = downloader.getLocalPath('https://cdn.example.com/');
      expect(normalize(path)).toContain(normalize('./test-output'));
      expect(path).toContain('asset_');
    });

    it('should handle multiple dots in filename', () => {
      const path = downloader.getLocalPath('https://example.com/file.min.js');
      expect(normalize(path)).toContain(normalize('./test-output/js/file.min.js'));
    });

    it('should handle uppercase extensions', () => {
      const path = downloader.getLocalPath('https://example.com/IMAGE.JPG');
      expect(normalize(path)).toContain(normalize('./test-output/images/IMAGE.JPG'));
    });

    it('should handle mixed case extensions', () => {
      const path = downloader.getLocalPath('https://example.com/PNG.Image');
      expect(normalize(path)).toContain(normalize('./test-output/other'));
    });
  });

  describe('asset type detection', () => {
    it('should detect CSS from extension', () => {
      expect(downloader['detectAssetType']('https://example.com/style.css')).toBe(AssetType.CSS);
    });

    it('should detect JS from extension', () => {
      expect(downloader['detectAssetType']('https://example.com/app.js')).toBe(AssetType.JS);
    });

    it('should detect PNG image', () => {
      expect(downloader['detectAssetType']('https://example.com/logo.png')).toBe(AssetType.IMG);
    });

    it('should detect JPEG image', () => {
      expect(downloader['detectAssetType']('https://example.com/photo.jpg')).toBe(AssetType.IMG);
    });

    it('should detect JPEG image with double extension', () => {
      expect(downloader['detectAssetType']('https://example.com/photo.jpeg')).toBe(AssetType.IMG);
    });

    it('should detect GIF image', () => {
      expect(downloader['detectAssetType']('https://example.com/anim.gif')).toBe(AssetType.IMG);
    });

    it('should detect SVG image', () => {
      expect(downloader['detectAssetType']('https://example.com/icon.svg')).toBe(AssetType.IMG);
    });

    it('should detect WEBP image', () => {
      expect(downloader['detectAssetType']('https://example.com/image.webp')).toBe(AssetType.IMG);
    });

    it('should detect ICO image', () => {
      expect(downloader['detectAssetType']('https://example.com/favicon.ico')).toBe(AssetType.FAVICON);
    });

    it('should detect WOFF font', () => {
      expect(downloader['detectAssetType']('https://example.com/font.woff')).toBe(AssetType.FONT);
    });

    it('should detect WOFF2 font', () => {
      expect(downloader['detectAssetType']('https://example.com/font.woff2')).toBe(AssetType.FONT);
    });

    it('should detect TTF font', () => {
      expect(downloader['detectAssetType']('https://example.com/font.ttf')).toBe(AssetType.FONT);
    });

    it('should detect OTF font', () => {
      expect(downloader['detectAssetType']('https://example.com/font.otf')).toBe(AssetType.FONT);
    });

    it('should detect EOT font', () => {
      expect(downloader['detectAssetType']('https://example.com/font.eot')).toBe(AssetType.FONT);
    });

    it('should detect CSS from URL path', () => {
      expect(downloader['detectAssetType']('https://cdn.example.com/css/main')).toBe(AssetType.CSS);
    });

    it('should detect JS from URL path', () => {
      expect(downloader['detectAssetType']('https://cdn.example.com/js/bundle')).toBe(AssetType.JS);
    });

    it('should categorize unknown extension as OTHER', () => {
      expect(downloader['detectAssetType']('https://example.com/file.xyz')).toBe(AssetType.OTHER);
    });

    it('should categorize file without extension as OTHER', () => {
      expect(downloader['detectAssetType']('https://example.com/file')).toBe(AssetType.OTHER);
    });
  });

  describe('hash generation consistency', () => {
    it('should generate consistent hash for same URL', () => {
      const url = 'https://example.com/test';
      const path1 = downloader.getLocalPath(url);
      const path2 = downloader.getLocalPath(url);
      expect(path1).toBe(path2);
    });

    it('should generate different hashes for different URLs', () => {
      const path1 = downloader.getLocalPath('https://example.com/file1');
      const path2 = downloader.getLocalPath('https://example.com/file2');
      expect(path1).not.toBe(path2);
    });
  });
});
