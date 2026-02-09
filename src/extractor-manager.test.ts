import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtractorManager } from './extractor-manager';
import { IAssetExtractor, PageContext, Asset, AssetType } from './types';

describe('ExtractorManager', () => {
  let manager: ExtractorManager;
  let mockContext: PageContext;
  let mockExtractor1: IAssetExtractor;
  let mockExtractor2: IAssetExtractor;
  let mockExtractor3: IAssetExtractor;

  beforeEach(() => {
    manager = new ExtractorManager();
    
    mockContext = {
      url: 'https://example.com',
      html: '<html><body><img src="image.jpg" /></body></html>',
      registry: {
        normalize: vi.fn((url: string) => url),
        add: vi.fn(() => Promise.resolve(true)),
        has: vi.fn(() => Promise.resolve(false)),
        size: vi.fn(() => Promise.resolve(0))
      }
    };

    mockExtractor1 = {
      name: 'Extractor1',
      priority: 1,
      canHandle: vi.fn(() => true),
      extract: async function* (_context: PageContext): AsyncIterable<Asset> {
        yield { url: 'https://example.com/image1.jpg', type: AssetType.IMG, source: 'Extractor1' };
      }
    };

    mockExtractor2 = {
      name: 'Extractor2',
      priority: 2,
      canHandle: vi.fn(() => true),
      extract: async function* (_context: PageContext): AsyncIterable<Asset> {
        yield { url: 'https://example.com/image2.jpg', type: AssetType.IMG, source: 'Extractor2' };
      }
    };

    mockExtractor3 = {
      name: 'Extractor3',
      priority: 3,
      canHandle: vi.fn(() => true),
      extract: async function* (_context: PageContext): AsyncIterable<Asset> {
        yield { url: 'https://example.com/image3.jpg', type: AssetType.IMG, source: 'Extractor3' };
      }
    };
  });

  describe('register', () => {
    it('should register an extractor', () => {
      manager.register(mockExtractor1);
      expect(manager.getRegisteredExtractors()).toContain('Extractor1');
    });

    it('should register multiple extractors', () => {
      manager.register(mockExtractor1);
      manager.register(mockExtractor2);
      manager.register(mockExtractor3);
      expect(manager.getRegisteredExtractors().length).toBe(3);
    });

    it('should sort extractors by priority (highest first)', () => {
      manager.register(mockExtractor1);
      manager.register(mockExtractor3);
      manager.register(mockExtractor2);
      expect(manager.getRegisteredExtractors()).toEqual(['Extractor3', 'Extractor2', 'Extractor1']);
    });

    it('should handle same priority extractors', () => {
      const mockExtractor4 = {
        name: 'Extractor4',
        priority: 2,
        canHandle: vi.fn(() => true),
        extract: async function* (_context: PageContext): AsyncIterable<Asset> {
          yield { url: 'https://example.com/image4.jpg', type: AssetType.IMG, source: 'Extractor4' };
        }
      };

      manager.register(mockExtractor2);
      manager.register(mockExtractor4);
      
      const names = manager.getRegisteredExtractors();
      expect(names).toContain('Extractor2');
      expect(names).toContain('Extractor4');
      expect(names.length).toBe(2);
    });
  });

  describe('unregister', () => {
    it('should unregister an extractor', () => {
      manager.register(mockExtractor1);
      manager.register(mockExtractor2);
      manager.unregister('Extractor1');
      expect(manager.getRegisteredExtractors()).not.toContain('Extractor1');
      expect(manager.getRegisteredExtractors()).toContain('Extractor2');
    });

    it('should handle unregistering non-existent extractor', () => {
      manager.register(mockExtractor1);
      manager.unregister('NonExistent');
      expect(manager.getRegisteredExtractors()).toContain('Extractor1');
    });

    it('should handle unregistering when no extractors registered', () => {
      expect(() => manager.unregister('AnyExtractor')).not.toThrow();
    });
  });

  describe('extract', () => {
    it('should extract assets from all capable extractors', async () => {
      manager.register(mockExtractor1);
      manager.register(mockExtractor2);

      const assets: Asset[] = [];
      for await (const asset of manager.extract(mockContext)) {
        assets.push(asset);
      }

      expect(assets.length).toBe(2);
      expect(assets.some(a => a.url === 'https://example.com/image1.jpg')).toBe(true);
      expect(assets.some(a => a.url === 'https://example.com/image2.jpg')).toBe(true);
    });

    it('should respect extractor priority order', async () => {
      manager.register(mockExtractor1);
      manager.register(mockExtractor3);
      manager.register(mockExtractor2);

      const assets: Asset[] = [];
      for await (const asset of manager.extract(mockContext)) {
        assets.push(asset);
      }

      expect(assets[0].source).toBe('Extractor3');
      expect(assets[1].source).toBe('Extractor2');
      expect(assets[2].source).toBe('Extractor1');
    });

    it('should skip extractors that cannot handle context', async () => {
      const mockNonHandler: IAssetExtractor = {
        name: 'NonHandler',
        priority: 10,
        canHandle: vi.fn(() => false),
        extract: async function* (_context: PageContext): AsyncIterable<Asset> {
          yield { url: 'https://example.com/should-not-appear.jpg', type: AssetType.IMG, source: 'NonHandler' };
        }
      };

      manager.register(mockNonHandler);
      manager.register(mockExtractor1);

      const assets: Asset[] = [];
      for await (const asset of manager.extract(mockContext)) {
        assets.push(asset);
      }

      expect(assets.length).toBe(1);
      expect(assets[0].source).toBe('Extractor1');
      expect(mockNonHandler.canHandle).toHaveBeenCalled();
    });

    it('should deduplicate assets by type and URL', async () => {
      const duplicateExtractor: IAssetExtractor = {
        name: 'Duplicate',
        priority: 5,
        canHandle: vi.fn(() => true),
        extract: async function* (_context: PageContext): AsyncIterable<Asset> {
          yield { url: 'https://example.com/image1.jpg', type: AssetType.IMG, source: 'Duplicate' };
        }
      };

      manager.register(mockExtractor1);
      manager.register(duplicateExtractor);

      const assets: Asset[] = [];
      for await (const asset of manager.extract(mockContext)) {
        assets.push(asset);
      }

      const image1Assets = assets.filter(a => a.url === 'https://example.com/image1.jpg');
      expect(image1Assets.length).toBe(1);
    });

    it('should handle extractor errors gracefully', async () => {
      const failingExtractor: IAssetExtractor = {
        name: 'Failing',
        priority: 10,
        canHandle: vi.fn(() => true),
        extract: async function* (_context: PageContext): AsyncIterable<Asset> {
          yield { url: 'should-not-appear.jpg', type: AssetType.IMG, source: 'Failing' };
          throw new Error('Extractor failed');
        }
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      manager.register(failingExtractor);
      manager.register(mockExtractor1);

      const assets: Asset[] = [];
      for await (const asset of manager.extract(mockContext)) {
        assets.push(asset);
      }

      expect(assets.length).toBe(2);
      expect(assets[0].source).toBe('Failing');
      expect(assets[1].source).toBe('Extractor1');
      expect(consoleSpy).toHaveBeenCalledWith('Extractor Failing failed: Extractor failed');

      consoleSpy.mockRestore();
    });

    it('should handle async canHandle', async () => {
      const asyncHandler: IAssetExtractor = {
        name: 'AsyncHandler',
        priority: 10,
        canHandle: vi.fn(async () => true),
        extract: async function* (_context: PageContext): AsyncIterable<Asset> {
          yield { url: 'https://example.com/async.jpg', type: AssetType.IMG, source: 'AsyncHandler' };
        }
      };

      manager.register(asyncHandler);

      const assets: Asset[] = [];
      for await (const asset of manager.extract(mockContext)) {
        assets.push(asset);
      }

      expect(assets.length).toBe(1);
      expect(assets[0].source).toBe('AsyncHandler');
    });

    it('should yield assets as they are generated (streaming)', async () => {
      let yieldedCount = 0;

      const streamingExtractor: IAssetExtractor = {
        name: 'Streaming',
        priority: 1,
        canHandle: vi.fn(() => true),
        extract: async function* (_context: PageContext): AsyncIterable<Asset> {
          for (let i = 1; i <= 10; i++) {
            yield {
              url: `https://example.com/image${i}.jpg`,
              type: AssetType.IMG,
              source: 'Streaming'
            };
            yieldedCount++;
          }
        }
      };

      manager.register(streamingExtractor);

      const assets: Asset[] = [];
      for await (const asset of manager.extract(mockContext)) {
        assets.push(asset);
      }

      expect(assets.length).toBe(10);
      expect(yieldedCount).toBe(10);
    });

    it('should handle empty extraction', async () => {
      const emptyExtractor: IAssetExtractor = {
        name: 'Empty',
        priority: 1,
        canHandle: vi.fn(() => true),
        extract: async function* (_context: PageContext): AsyncIterable<Asset> {
          const yieldValue = false;
          if (yieldValue) {
            yield { url: 'never-reached.jpg', type: AssetType.IMG, source: 'Empty' };
          }
        }
      };

      manager.register(emptyExtractor);

      const assets: Asset[] = [];
      for await (const asset of manager.extract(mockContext)) {
        assets.push(asset);
      }

      expect(assets.length).toBe(0);
    });
  });

  describe('getRegisteredExtractors', () => {
    it('should return empty array when no extractors registered', () => {
      expect(manager.getRegisteredExtractors()).toEqual([]);
    });

    it('should return all registered extractor names', () => {
      manager.register(mockExtractor1);
      manager.register(mockExtractor2);
      manager.register(mockExtractor3);
      expect(manager.getRegisteredExtractors()).toContain('Extractor1');
      expect(manager.getRegisteredExtractors()).toContain('Extractor2');
      expect(manager.getRegisteredExtractors()).toContain('Extractor3');
    });
  });

  describe('clear', () => {
    it('should remove all registered extractors', () => {
      manager.register(mockExtractor1);
      manager.register(mockExtractor2);
      manager.clear();
      expect(manager.getRegisteredExtractors()).toEqual([]);
    });

    it('should allow registering after clear', () => {
      manager.register(mockExtractor1);
      manager.clear();
      manager.register(mockExtractor2);
      expect(manager.getRegisteredExtractors()).toEqual(['Extractor2']);
    });

    it('should handle clear when no extractors registered', () => {
      expect(() => manager.clear()).not.toThrow();
      expect(manager.getRegisteredExtractors()).toEqual([]);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex multi-extractor scenario with duplicates and failures', async () => {
      const failingExtractor: IAssetExtractor = {
        name: 'Failing',
        priority: 10,
        canHandle: vi.fn(() => true),
        extract: async function* (_context: PageContext): AsyncIterable<Asset> {
          yield { url: 'should-not-appear.jpg', type: AssetType.IMG, source: 'Failing' };
          throw new Error('Failed');
        }
      };

      const nonHandler: IAssetExtractor = {
        name: 'NonHandler',
        priority: 5,
        canHandle: vi.fn(() => false),
        extract: async function* (_context: PageContext): AsyncIterable<Asset> {
          yield { url: 'https://example.com/no.jpg', type: AssetType.IMG, source: 'NonHandler' };
        }
      };

      const duplicateExtractor: IAssetExtractor = {
        name: 'Duplicate',
        priority: 3,
        canHandle: vi.fn(() => true),
        extract: async function* (_context: PageContext): AsyncIterable<Asset> {
          yield { url: 'https://example.com/image1.jpg', type: AssetType.IMG, source: 'Duplicate' };
          yield { url: 'https://example.com/image4.jpg', type: AssetType.IMG, source: 'Duplicate' };
        }
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      manager.register(mockExtractor1);
      manager.register(mockExtractor2);
      manager.register(mockExtractor3);
      manager.register(failingExtractor);
      manager.register(nonHandler);
      manager.register(duplicateExtractor);

      const assets: Asset[] = [];
      for await (const asset of manager.extract(mockContext)) {
        assets.push(asset);
      }

      expect(assets.length).toBe(5);
      expect(assets[0].source).toBe('Failing');
      expect(assets[1].source).toBe('Extractor3');
      expect(assets[2].source).toBe('Duplicate');
      expect(assets[3].source).toBe('Duplicate');
      expect(assets[4].source).toBe('Extractor2');

      consoleSpy.mockRestore();
    });

    it('should handle dynamic extractor registration during extraction', async () => {
      manager.register(mockExtractor1);

      const assets: Asset[] = [];
      for await (const asset of manager.extract(mockContext)) {
        assets.push(asset);
      }

      expect(assets.length).toBe(1);
      expect(assets[0].source).toBe('Extractor1');

      manager.register(mockExtractor2);

      const assets2: Asset[] = [];
      for await (const asset of manager.extract(mockContext)) {
        assets2.push(asset);
      }

      expect(assets2.length).toBe(2);
    });
  });
});
