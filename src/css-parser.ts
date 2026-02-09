import type { IAsset, AssetType } from './types.js';

export function extractAssetsFromCSS(cssContent: string, baseUrl: string): IAsset[] {
  const assets: IAsset[] = [];

  const fontFaceRegex = /@font-face\s*{[^}]*url\(['"]?([^'")\s]+)['"]?[^}]*}/gi;
  let match;
  while ((match = fontFaceRegex.exec(cssContent)) !== null) {
    const url = match[1];
    if (url && !url.startsWith('data:')) {
      try {
        const absoluteUrl = new URL(url, baseUrl).href;
        assets.push({ url: absoluteUrl, type: 'FONT' as AssetType });
      } catch {
        assets.push({ url: url, type: 'FONT' as AssetType });
      }
    }
  }

  const bgImageRegex = /background(?:-image)?:\s*url\(['"]?([^'")\s]+)['"]?[^;]*;/gi;
  while ((match = bgImageRegex.exec(cssContent)) !== null) {
    const url = match[1];
    if (url && !url.startsWith('data:')) {
      try {
        const absoluteUrl = new URL(url, baseUrl).href;
        assets.push({ url: absoluteUrl, type: 'IMG' as AssetType });
      } catch {
        assets.push({ url: url, type: 'IMG' as AssetType });
      }
    }
  }

  return assets;
}
