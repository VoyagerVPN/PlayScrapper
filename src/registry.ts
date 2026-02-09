import { Mutex } from 'async-mutex';
import { IAssetRegistry } from './types';

const QUERY_WHITELIST = ['w', 'width', 'h', 'height', 'q', 'quality', 'format', 'fit'];

class AssetRegistry implements IAssetRegistry {
  private seen = new Set<string>();
  private mutex = new Mutex();

  normalize(url: string, base: string): string {
    const parsed = new URL(url, base);
    parsed.hash = '';
    const filtered = new URLSearchParams();
    
    for (const [key, val] of parsed.searchParams) {
      if (QUERY_WHITELIST.includes(key)) {
        filtered.set(key, val);
      }
    }
    
    parsed.search = filtered.toString();
    return parsed.href;
  }

  async add(url: string): Promise<boolean> {
    const normalized = this.normalize(url, url);
    const release = await this.mutex.acquire();
    
    try {
      if (this.seen.has(normalized)) {
        return false;
      }
      this.seen.add(normalized);
      return true;
    } finally {
      release();
    }
  }

  async has(url: string): Promise<boolean> {
    const normalized = this.normalize(url, url);
    const release = await this.mutex.acquire();
    
    try {
      return this.seen.has(normalized);
    } finally {
      release();
    }
  }

  async size(): Promise<number> {
    const release = await this.mutex.acquire();
    
    try {
      return this.seen.size;
    } finally {
      release();
    }
  }

  async clear(): Promise<void> {
    const release = await this.mutex.acquire();
    
    try {
      this.seen.clear();
    } finally {
      release();
    }
  }
}

export { AssetRegistry };
export const assetRegistry = new AssetRegistry();
