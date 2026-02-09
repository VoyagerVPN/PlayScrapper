export interface IPageData {
  url: string;
  html: string;
  assets: IAsset[];
}

export interface IAsset {
  url: string;
  type: AssetType;
}

export enum AssetType {
  CSS = 'CSS',
  JS = 'JS',
  IMG = 'IMG',
  FONT = 'FONT',
  FAVICON = 'FAVICON',
  MANIFEST = 'MANIFEST',
  CONFIG = 'CONFIG',
  MASK_ICON = 'MASK_ICON',
  OTHER = 'OTHER'
}

export interface IBrowser {
  launch(): Promise<void>;
  scrapePage(url: string): Promise<IPageData>;
  close(): Promise<void>;
}

export interface IDownloader {
  download(url: string): Promise<Buffer>;
  saveAsset(url: string, buffer: Buffer): Promise<string>;
  getLocalPath(url: string): string;
  getAssetMap(): ReadonlyMap<string, string>;
}

export interface IProcessor {
  rewriteUrls(html: string, assetMap: Map<string, string>, outputDir: string, pagePath: string, targetUrl: string): string;
  removeAnalytics(html: string): string;
  mockForms(html: string): string;
}

export interface IFileOrganizer {
  mapUrlToPath(url: string, baseUrl: string): string;
  organize(pages: Map<string, string>, outputDir: string, baseUrl: string): Promise<void>;
}

export interface ILogger {
  info(message: string): Promise<void>;
  error(message: string, error?: Error): Promise<void>;
  warn(message: string): Promise<void>;
}

export interface IErrorHandler {
  handleTimeout(url: string, error: Error): Promise<boolean>;
  handle404(url: string): Promise<void>;
  handleNetworkError(url: string, error: Error): Promise<void>;
  saveProgress(visitedUrls: Set<string>, currentPage: string, outputPath: string): Promise<void>;
  withRetry<T>(url: string, operation: () => Promise<T>): Promise<T>;
}

export interface IAssetRegistry {
  normalize(url: string, base: string): string;
  add(url: string): Promise<boolean>;
  has(url: string): Promise<boolean>;
  size(): Promise<number>;
}

export interface ICircuitBreaker {
  canProceed(): boolean;
  recordFailure(): void;
  recordSuccess(): void;
  reset(): void;
}

export interface PageContext {
  url: string;
  html?: string;
  registry: IAssetRegistry;
}

export interface Asset {
  url: string;
  type: AssetType;
  source: string;
  validated?: boolean;
  size?: number;
  contentType?: string;
  error?: string;
  reason?: string;
}

export interface IAssetExtractor {
  readonly name: string;
  readonly priority: number;
  canHandle(context: PageContext): boolean | Promise<boolean>;
  extract(context: PageContext): AsyncIterable<Asset>;
}
