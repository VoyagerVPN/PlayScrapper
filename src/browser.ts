import { chromium } from 'playwright';
import type { IBrowser, IPageData, IAsset, AssetType } from './types.js';

function extractAssetsInBrowser(): Array<{ url: string; type: string }> {
  const assetUrls: Array<{ url: string; type: string }> = [];

  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
  links.forEach((link) => {
    const href = link.href;
    if (href) {
      assetUrls.push({ url: href, type: 'CSS' });
    }
  });

  const scripts = document.querySelectorAll<HTMLScriptElement>('script[src]');
  scripts.forEach((script) => {
    const src = script.src;
    if (src && !src.startsWith('data:')) {
      assetUrls.push({ url: src, type: 'JS' });
    }
  });

  const images = document.querySelectorAll<HTMLImageElement>('img[src]');
  images.forEach((img) => {
    const src = img.src;
    if (src && !src.startsWith('data:')) {
      assetUrls.push({ url: src, type: 'IMG' });
    }
  });

  const lazyImages = document.querySelectorAll<HTMLImageElement>('img[data-src], img[data-original]');
  lazyImages.forEach((img) => {
    const src = img.getAttribute('data-src') || img.getAttribute('data-original');
    if (src && !src.startsWith('data:')) {
      try {
        const absoluteUrl = new URL(src, window.location.href).href;
        assetUrls.push({ url: absoluteUrl, type: 'IMG' });
      } catch {
        assetUrls.push({ url: src, type: 'IMG' });
      }
    }
  });

  const fonts = document.querySelectorAll<HTMLLinkElement>(
    'link[href*=".woff"], link[href*=".ttf"], link[href*=".otf"], link[href*=".eot"]'
  );
  fonts.forEach((font) => {
    const href = font.href;
    if (href) {
      assetUrls.push({ url: href, type: 'FONT' });
    }
  });

  const faviconLinks = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]'
  );
  faviconLinks.forEach((link) => {
    const href = link.href;
    if (href && !href.startsWith('data:')) {
      assetUrls.push({ url: href, type: 'FAVICON' });
    }
  });

  const manifestLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]');
  manifestLinks.forEach((link) => {
    const href = link.href;
    if (href && !href.startsWith('data:')) {
      assetUrls.push({ url: href, type: 'MANIFEST' });
    }
  });

  const configMetas = document.querySelectorAll<HTMLMetaElement>('meta[name="msapplication-config"]');
  configMetas.forEach((meta) => {
    const content = meta.content;
    if (content && !content.startsWith('data:')) {
      try {
        const absoluteUrl = new URL(content, window.location.href).href;
        assetUrls.push({ url: absoluteUrl, type: 'CONFIG' });
      } catch {
        assetUrls.push({ url: content, type: 'CONFIG' });
      }
    }
  });

  const maskIconLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="mask-icon"]');
  maskIconLinks.forEach((link) => {
    const href = link.href;
    if (href && !href.startsWith('data:')) {
      assetUrls.push({ url: href, type: 'MASK_ICON' });
    }
  });

  const videos = document.querySelectorAll<HTMLVideoElement>('video[poster]');
  videos.forEach((video) => {
    const poster = video.poster;
    if (poster && !poster.startsWith('data:')) {
      assetUrls.push({ url: poster, type: 'IMG' });
    }
  });

  const svgImages = document.querySelectorAll<SVGImageElement>('svg image');
  svgImages.forEach((img) => {
    const href = img.getAttribute('href');
    if (href && !href.startsWith('data:')) {
      try {
        const absoluteUrl = new URL(href, window.location.href).href;
        assetUrls.push({ url: absoluteUrl, type: 'IMG' });
      } catch {
        assetUrls.push({ url: href, type: 'IMG' });
      }
    }
  });

  const dataBgElements = document.querySelectorAll<HTMLElement>('[data-bg], [data-background]');
  dataBgElements.forEach((element) => {
    const bg = element.getAttribute('data-bg') || element.getAttribute('data-background');
    if (bg && !bg.startsWith('data:')) {
      try {
        const absoluteUrl = new URL(bg, window.location.href).href;
        assetUrls.push({ url: absoluteUrl, type: 'IMG' });
      } catch {
        assetUrls.push({ url: bg, type: 'IMG' });
      }
    }
  });

  const ogImages = document.querySelectorAll<HTMLMetaElement>('meta[property="og:image"], meta[property="og:image:url"], meta[property="og:image:secure_url"]');
  ogImages.forEach((meta) => {
    const content = meta.content;
    if (content && !content.startsWith('data:')) {
      try {
        const absoluteUrl = new URL(content, window.location.href).href;
        assetUrls.push({ url: absoluteUrl, type: 'IMG' });
      } catch {
        assetUrls.push({ url: content, type: 'IMG' });
      }
    }
  });

  const imageSrcLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="image_src"]');
  imageSrcLinks.forEach((link) => {
    const href = link.href;
    if (href && !href.startsWith('data:')) {
      assetUrls.push({ url: href, type: 'IMG' });
    }
  });

  const styleSheets = document.querySelectorAll<HTMLStyleElement>('style');
  styleSheets.forEach((style) => {
    const cssText = style.textContent || '';
    
    const fontFaceRegex = /@font-face\s*{[^}]*url\(['"]?([^'")\s]+)['"]?[^}]*}/gi;
    let fontMatch;
    while ((fontMatch = fontFaceRegex.exec(cssText)) !== null) {
      const fontUrl = fontMatch[1];
      if (fontUrl && !fontUrl.startsWith('data:')) {
        try {
          const absoluteUrl = new URL(fontUrl, window.location.href).href;
          assetUrls.push({ url: absoluteUrl, type: 'FONT' });
        } catch {
          assetUrls.push({ url: fontUrl, type: 'FONT' });
        }
      }
    }

    const bgImageRegex = /background(?:-image)?:\s*url\(['"]?([^'")\s]+)['"]?[^;]*;/gi;
    let bgMatch;
    while ((bgMatch = bgImageRegex.exec(cssText)) !== null) {
      const bgUrl = bgMatch[1];
      if (bgUrl && !bgUrl.startsWith('data:')) {
        try {
          const absoluteUrl = new URL(bgUrl, window.location.href).href;
          assetUrls.push({ url: absoluteUrl, type: 'IMG' });
        } catch {
          assetUrls.push({ url: bgUrl, type: 'IMG' });
        }
      }
    }
  });

  return assetUrls;
}

export class PlaywrightBrowser implements IBrowser {
  private browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  async launch(): Promise<void> {
    this.browser = await chromium.launch();
  }

  async scrapePage(url: string): Promise<IPageData> {
    if (!this.browser) {
      throw new Error('Browser not launched');
    }

    const page = await this.browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const assets = await page.evaluate(extractAssetsInBrowser);

    const typedAssets: IAsset[] = assets.map((asset) => ({
      url: asset.url,
      type: asset.type as AssetType
    }));

    const html = await page.content();
    await page.close();

    return {
      url,
      html,
      assets: typedAssets
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
