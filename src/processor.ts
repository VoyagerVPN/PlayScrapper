import * as cheerio from 'cheerio';
import { IProcessor } from './types';
import { relative } from 'path';

const ANALYTICS_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'mc.yandex.ru',
  'yandex.ru/metrika',
  'facebook.com/tr',
  'doubleclick.net',
  'statcounter.com',
  'hotjar.com',
  'segment.io'
] as const;

export class HtmlProcessor implements IProcessor {
  private readonly analyticsDomains: readonly string[];

  constructor(analyticsDomains?: readonly string[]) {
    this.analyticsDomains = analyticsDomains || ANALYTICS_DOMAINS;
  }

  rewriteUrls(html: string, assetMap: Map<string, string>, _outputDir: string, pagePath: string, targetUrl: string): string {
    const $ = cheerio.load(html);
    const pagePathRelative = relative(_outputDir, pagePath).replace(/\\/g, '/');
    let pageDir = pagePathRelative.substring(0, pagePathRelative.lastIndexOf('/') + 1);
    if (pageDir === '' && !pagePathRelative.includes('/')) {
      pageDir = './';
    }
    const targetOrigin = new URL(targetUrl).origin;

    const getRelativePath = (assetRelativePath: string): string => {
      const assetPathNormalized = assetRelativePath.replace(/\\/g, '/');
      const pageDirNormalized = pageDir.replace(/\\/g, '/');
      const relPath = relative(pageDirNormalized, assetPathNormalized).replace(/\\/g, '/');
      if (relPath.startsWith('.') || relPath.startsWith('..')) {
        return relPath;
      }
      return relPath.startsWith('/') ? relPath : `./${relPath}`;
    };

    const isSameOrigin = (url: string): boolean => {
      try {
        const urlObj = new URL(url);
        return urlObj.origin === targetOrigin;
      } catch {
        return false;
      }
    };

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      if (this.isAbsoluteUrl(href) && isSameOrigin(href)) {
        const hrefUrl = new URL(href);
        const relativePath = hrefUrl.pathname;
        $(element).attr('href', relativePath.startsWith('/') ? relativePath : `/${relativePath}`);
      }
    });

    $('link[href]').each((_, element) => {
      const rel = $(element).attr('rel');
      if (rel === 'canonical' || rel === 'alternate') {
        $(element).remove();
        return;
      }

      const href = $(element).attr('href');
      if (!href) return;

      const localPath = assetMap.get(href);
      if (localPath) {
        $(element).attr('href', getRelativePath(localPath));
      } else if (this.isAbsoluteUrl(href) && isSameOrigin(href)) {
        try {
          const url = new URL(href);
          const relativePath = url.pathname;
          $(element).attr('href', relativePath.startsWith('/') ? relativePath : `/${relativePath}`);
        } catch {
          // Ignore invalid URLs
        }
      }
    });

    $('meta[name="msapplication-config"]').each((_, element) => {
      const content = $(element).attr('content');
      if (!content) return;

      const localPath = assetMap.get(content);
      if (localPath) {
        $(element).attr('content', getRelativePath(localPath));
      } else if (this.isAbsoluteUrl(content) && isSameOrigin(content)) {
        try {
          const url = new URL(content);
          const relativePath = url.pathname;
          $(element).attr('content', relativePath.startsWith('/') ? relativePath : `/${relativePath}`);
        } catch {
          // Ignore invalid URLs
        }
      }
    });

    $('meta[property="og:image"], meta[property="og:image:url"], meta[property="og:image:secure_url"]').each((_, element) => {
      const content = $(element).attr('content');
      if (!content) return;

      const localPath = assetMap.get(content);
      if (localPath) {
        $(element).attr('content', getRelativePath(localPath));
      } else {
        $(element).remove();
      }
    });

    $('link[rel="image_src"]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      const localPath = assetMap.get(href);
      if (localPath) {
        $(element).attr('href', getRelativePath(localPath));
      } else if (this.isAbsoluteUrl(href) && isSameOrigin(href)) {
        try {
          const url = new URL(href);
          const relativePath = url.pathname;
          $(element).attr('href', relativePath.startsWith('/') ? relativePath : `/${relativePath}`);
        } catch {
          // Ignore invalid URLs
        }
      }
    });

    $('script[src]').each((_, element) => {
      const src = $(element).attr('src');
      if (!src) return;

      const localPath = assetMap.get(src);
      if (localPath) {
        $(element).attr('src', getRelativePath(localPath));
      } else if (this.isAbsoluteUrl(src)) {
        const srcUrl = new URL(src);
        const relativePath = srcUrl.pathname;
        $(element).attr('src', relativePath.startsWith('/') ? relativePath : `/${relativePath}`);
      }
    });

    $('img[src]').each((_, element) => {
      const src = $(element).attr('src');
      if (!src) return;

      const localPath = assetMap.get(src);
      if (localPath) {
        $(element).attr('src', getRelativePath(localPath));
      } else if (this.isAbsoluteUrl(src)) {
        const srcUrl = new URL(src);
        const relativePath = srcUrl.pathname;
        $(element).attr('src', relativePath.startsWith('/') ? relativePath : `/${relativePath}`);
      }
    });

    $('img[data-src], img[data-original]').each((_, element) => {
      const dataSrc = $(element).attr('data-src') || $(element).attr('data-original');
      if (!dataSrc) return;

      const localPath = assetMap.get(dataSrc);
      if (localPath) {
        $(element).attr('src', getRelativePath(localPath));
        $(element).removeAttr('data-src');
        $(element).removeAttr('data-original');
      } else if (this.isAbsoluteUrl(dataSrc) && isSameOrigin(dataSrc)) {
        try {
          const url = new URL(dataSrc);
          const relativePath = url.pathname;
          $(element).attr('src', relativePath.startsWith('/') ? relativePath : `/${relativePath}`);
          $(element).removeAttr('data-src');
          $(element).removeAttr('data-original');
        } catch {
          // Ignore invalid URLs
        }
      }
    });

    $('video[poster]').each((_, element) => {
      const poster = $(element).attr('poster');
      if (!poster) return;

      const localPath = assetMap.get(poster);
      if (localPath) {
        $(element).attr('poster', getRelativePath(localPath));
      } else if (this.isAbsoluteUrl(poster) && isSameOrigin(poster)) {
        try {
          const url = new URL(poster);
          const relativePath = url.pathname;
          $(element).attr('poster', relativePath.startsWith('/') ? relativePath : `/${relativePath}`);
        } catch {
          // Ignore invalid URLs
        }
      }
    });

    $('svg image').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      const localPath = assetMap.get(href);
      if (localPath) {
        $(element).attr('href', getRelativePath(localPath));
      } else if (this.isAbsoluteUrl(href) && isSameOrigin(href)) {
        try {
          const url = new URL(href);
          const relativePath = url.pathname;
          $(element).attr('href', relativePath.startsWith('/') ? relativePath : `/${relativePath}`);
        } catch {
          // Ignore invalid URLs
        }
      }
    });

    $('[data-bg], [data-background]').each((_, element) => {
      const bg = $(element).attr('data-bg') || $(element).attr('data-background');
      if (!bg) return;

      const localPath = assetMap.get(bg);
      if (localPath) {
        const relativePath = getRelativePath(localPath);
        $(element).attr('data-bg', relativePath);
        $(element).attr('data-background', relativePath);
        $(element).attr('style', `background-image: url('${relativePath}');`);
      } else if (this.isAbsoluteUrl(bg) && isSameOrigin(bg)) {
        try {
          const url = new URL(bg);
          const relativePath = url.pathname;
          const finalPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
          $(element).attr('style', `background-image: url('${finalPath}');`);
        } catch {
          // Ignore invalid URLs
        }
      }
    });

    $('source[srcset]').each((_, element) => {
      const srcset = $(element).attr('srcset');
      if (!srcset) return;

      const newSrcset = srcset
        .split(',')
        .map(part => {
          const [urlPart, ...descriptor] = part.trim().split(' ');
          const localPath = assetMap.get(urlPart);
          if (localPath) {
            return `${getRelativePath(localPath)} ${descriptor.join(' ')}`.trim();
          } else if (this.isAbsoluteUrl(urlPart) && isSameOrigin(urlPart)) {
            try {
              const url = new URL(urlPart);
              return `${url.pathname} ${descriptor.join(' ')}`.trim();
            } catch {
              return part.trim();
            }
          }
          return part.trim();
        })
        .join(', ');

      $(element).attr('srcset', newSrcset);
    });

    return $.html();
  }

  removeAnalytics(html: string): string {
    const $ = cheerio.load(html);

    $('script').each((_, element) => {
      const src = $(element).attr('src');
      const content = $(element).html();

      if (src && this.analyticsDomains.some(domain => src.includes(domain))) {
        $(element).remove();
        return;
      }

      if (content && this.analyticsDomains.some(domain => content.includes(domain))) {
        $(element).remove();
        return;
      }

      if (content && this.containsAnalyticsPattern(content)) {
        $(element).remove();
      }
    });

    $('iframe').each((_, element) => {
      const src = $(element).attr('src');
      if (src && this.analyticsDomains.some(domain => src.includes(domain))) {
        $(element).remove();
      }
    });

    return $.html();
  }

  mockForms(html: string): string {
    const $ = cheerio.load(html);

    $('form').each((_, element) => {
      $(element).attr('onsubmit', 'return false');
      const hasAction = $(element).attr('action');
      if (!hasAction) {
        $(element).attr('action', '#');
      }
    });

    return $.html();
  }

  private isAbsoluteUrl(urlString: string): boolean {
    try {
      const parsed = new URL(urlString);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private containsAnalyticsPattern(content: string): boolean {
    const patterns = [
      /ga\(['"]create['"]/,
      /_?gaq\./,
      /_?gat\./,
      /_?gtag\(/,
      /_?trackPageview/,
      /yaCounter\d+/,
      /ym\(/,
      /fbq\(/,
      /_fbq/,
      /beacon\(/,
      /analytics\.js/,
      /gtag\.js/,
      /analytics\.js/
    ];

    return patterns.some(pattern => pattern.test(content));
  }
}
