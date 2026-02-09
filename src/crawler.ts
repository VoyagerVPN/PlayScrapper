import type { IBrowser, IPageData, IErrorHandler, ILogger } from './types.js';
import { normalizeUrl, isSameOrigin } from './utils/index.js';

export class Crawler {
  private visited = new Set<string>();
  private queue: Array<{ url: string; depth: number }> = [];

  constructor(
    private readonly browser: IBrowser,
    private readonly maxDepth: number
  ) {}

  async crawl(
    startUrl: string,
    visitedUrls?: Set<string>,
    errorHandler?: IErrorHandler,
    logger?: ILogger
  ): Promise<IPageData[]> {
    const baseUrl = new URL(startUrl);
    const baseHostname = baseUrl.hostname;
    const normalizedStartUrl = normalizeUrl(startUrl);

    if (visitedUrls) {
      this.visited = visitedUrls;
    }

    this.queue.push({ url: normalizedStartUrl, depth: 0 });
    const results: IPageData[] = [];

    while (this.queue.length > 0) {
      const { url, depth } = this.queue.shift()!;

      if (this.visited.has(url) || depth > this.maxDepth) {
        continue;
      }

      this.visited.add(url);
      
      let pageData: IPageData;
      if (errorHandler && logger) {
        pageData = await errorHandler.withRetry(url, () => this.browser.scrapePage(url));
      } else {
        pageData = await this.browser.scrapePage(url);
      }
      
      results.push(pageData);

      const links = this.extractLinks(pageData.html, url);
      for (const link of links) {
        const normalizedLink = normalizeUrl(link);
        const linkUrl = new URL(normalizedLink);

        if (isSameOrigin(linkUrl, baseHostname) && !this.visited.has(normalizedLink)) {
          this.queue.push({ url: normalizedLink, depth: depth + 1 });
        }
      }
    }

    return results;
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[2];
      if (href && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('://')) {
        try {
          const absoluteUrl = new URL(href, baseUrl);
          if (absoluteUrl.protocol && absoluteUrl.hostname) {
            links.push(absoluteUrl.href);
          }
        } catch {
          continue;
        }
      }
    }

    return links;
  }
}
