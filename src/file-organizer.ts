import { writeFile } from 'fs/promises';
import { join } from 'path';
import { posix } from 'path';
import { IFileOrganizer } from './types';
import { ensureDir } from './utils/index.js';

interface MetadataEntry {
  url: string;
  filePath: string;
}

export class FileOrganizer implements IFileOrganizer {
  private urlToFileMap: Map<string, string>;

  constructor() {
    this.urlToFileMap = new Map();
  }

  mapUrlToPath(url: string, baseUrl: string): string {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const baseHostname = new URL(baseUrl).hostname;

    let relativePath: string;

    if (path === '/' || path === '') {
      relativePath = 'index.html';
    } else if (path.endsWith('/')) {
      relativePath = `${path.slice(0, -1)}/index.html`;
    } else {
      relativePath = path.endsWith('.html') ? path : `${path}.html`;
    }

    return posix.join(baseHostname, relativePath);
  }

  async organize(pages: Map<string, string>, outputDir: string, baseUrl: string): Promise<void> {
    const metadata: MetadataEntry[] = [];

    await ensureDir(join(outputDir, '_metadata.json'));

    for (const [url, html] of pages) {
      const filePath = this.mapUrlToPath(url, baseUrl);
      this.urlToFileMap.set(url, filePath);

      const fullPath = join(outputDir, filePath);
      await ensureDir(fullPath);
      await writeFile(fullPath, html, 'utf-8');

      metadata.push({ url, filePath });
    }

    const metadataPath = join(outputDir, '_metadata.json');
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  getUrlToFileMap(): Map<string, string> {
    return this.urlToFileMap;
  }
}
