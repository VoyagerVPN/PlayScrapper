import { writeFile } from 'fs/promises';
import { join, basename, extname } from 'path';
import { IDownloader, AssetType } from './types.js';
import { ensureDir } from './utils/index.js';

export class Downloader implements IDownloader {
  private assetMap: Map<string, string>;
  private outputDir: string;

  constructor(outputDir: string = './scraped/static') {
    this.assetMap = new Map();
    this.outputDir = outputDir;
  }

  async download(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to download ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  getLocalPath(url: string): string {
    if (this.assetMap.has(url)) {
      return this.assetMap.get(url)!;
    }

    const assetType = this.detectAssetType(url);
    const fileName = this.generateFileName(url);
    const subDir = this.getAssetSubDir(assetType);
    const localPath = join(this.outputDir, subDir, fileName);

    this.assetMap.set(url, localPath);
    return localPath;
  }

  async saveAsset(url: string, buffer: Buffer): Promise<string> {
    const localPath = this.getLocalPath(url);
    await ensureDir(localPath);
    await writeFile(localPath, buffer);
    return localPath;
  }

  getAssetMap(): ReadonlyMap<string, string> {
    return this.assetMap;
  }

  private detectAssetType(url: string): AssetType {
    const ext = extname(url).toLowerCase();
    const path = url.toLowerCase();

    if (ext === '.css' || path.includes('/css/') || path.includes('.css')) {
      return AssetType.CSS;
    }
    if (ext === '.js' || path.includes('/js/') || path.includes('.js')) {
      return AssetType.JS;
    }
    if (ext === '.ico' || path.includes('favicon') || path.includes('favicons/')) {
      return AssetType.FAVICON;
    }
    if (ext === '.json' || path.includes('manifest')) {
      return AssetType.MANIFEST;
    }
    if (ext === '.xml' || path.includes('browserconfig')) {
      return AssetType.CONFIG;
    }
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
      return AssetType.IMG;
    }
    if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) {
      return AssetType.FONT;
    }
    return AssetType.OTHER;
  }

  private getAssetSubDir(assetType: AssetType): string {
    switch (assetType) {
      case AssetType.CSS:
        return 'css';
      case AssetType.JS:
        return 'js';
      case AssetType.IMG:
        return 'images';
      case AssetType.FONT:
        return 'fonts';
      case AssetType.FAVICON:
        return 'favicons';
      case AssetType.MANIFEST:
        return 'pwa';
      case AssetType.CONFIG:
        return 'pwa';
      case AssetType.MASK_ICON:
        return 'favicons';
      default:
        return 'other';
    }
  }

  private generateFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      let fileName = basename(urlObj.pathname);
      
      if (!fileName || fileName === '/') {
        const hash = this.simpleHash(url);
        const ext = this.detectExtension(url);
        fileName = `asset_${hash}${ext}`;
      }

      if (extname(fileName) === '') {
        const ext = this.detectExtension(url);
        fileName = `${fileName}${ext}`;
      }

      return fileName;
    } catch {
      const hash = this.simpleHash(url);
      return `asset_${hash}.bin`;
    }
  }

  private detectExtension(url: string): string {
    const ext = extname(url);
    if (ext) {
      return ext;
    }
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('css')) return '.css';
    if (lowerUrl.includes('js')) return '.js';
    if (lowerUrl.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)/)) return '.png';
    if (lowerUrl.match(/\.(woff|woff2|ttf|otf|eot)/)) return '.woff';
    return '';
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }
}
