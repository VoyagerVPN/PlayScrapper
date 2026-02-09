import { Command } from 'commander';
import { join, relative } from 'path';
import { safeParseConfig } from './config.js';
import { PlaywrightBrowser } from './browser.js';
import { Crawler } from './crawler.js';
import { Downloader } from './downloader.js';
import { FileOrganizer } from './file-organizer.js';
import { HtmlProcessor } from './processor.js';
import { Logger } from './logger.js';
import { ErrorHandler } from './error-handler.js';
import { extractAssetsFromCSS } from './css-parser.js';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import type { IPageData } from './types.js';

const program = new Command();

program
  .name('play-scrapper')
  .description('Web scraper with Playwright')
  .version('1.0.0')
  .argument('<url>', 'Target URL to scrape')
  .option('-d, --depth <number>', 'Crawl depth', '1')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (url: string, options) => {
    const configResult = safeParseConfig({
      targetUrl: url,
      depth: parseInt(options.depth, 10),
      outputDir: options.output,
      verbose: options.verbose
    });

    if (!configResult.success) {
      console.error('Invalid configuration:');
      for (const issue of configResult.error.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
      process.exit(1);
    }

    const config = configResult.data;

    if (!existsSync(config.outputDir)) {
      mkdirSync(config.outputDir, { recursive: true });
    }

    const logger = new Logger('scraping-errors.log', config.verbose);
    const errorHandler = new ErrorHandler(logger);
    const browser = new PlaywrightBrowser();
    const staticDir = join(config.outputDir, 'static');
    const downloader = new Downloader(staticDir);
    const fileOrganizer = new FileOrganizer();
    const htmlProcessor = new HtmlProcessor();

    await logger.info(`Starting scraper for: ${config.targetUrl}`);
    await logger.info(`Output directory: ${config.outputDir}`);
    await logger.info(`Crawl depth: ${config.depth}`);

    await browser.launch();

    const allPages = new Map<string, IPageData>();
    const visitedUrls = new Set<string>();

    const crawler = new Crawler(browser, config.depth);

    try {
      const pages = await crawler.crawl(config.targetUrl, visitedUrls, errorHandler, logger);
      
      for (const page of pages) {
        allPages.set(page.url, page);
        await logger.info(`Scraped page: ${page.url}`);
      }

      await logger.info(`Scraped ${allPages.size} pages`);

      const assetUrls = new Set<string>();
      for (const [, pageData] of allPages) {
        for (const asset of pageData.assets) {
          assetUrls.add(asset.url);
        }
      }

      await logger.info(`Found ${assetUrls.size} assets`);

      let downloadedCount = 0;
      const allAssets = new Map<string, string>();

      for (const assetUrl of assetUrls) {
        try {
          const buffer = await downloader.download(assetUrl);
          const fullPath = await downloader.saveAsset(assetUrl, buffer);
          const relativePath = relative(config.outputDir, fullPath).replace(/\\/g, '/');
          allAssets.set(assetUrl, relativePath);
          downloadedCount++;
          
          if (downloadedCount % 10 === 0) {
            await logger.info(`Downloaded ${downloadedCount}/${assetUrls.size} assets`);
          }
        } catch (err) {
          await logger.error(`Failed to download asset: ${assetUrl}`, err instanceof Error ? err : new Error(String(err)));
        }
      }

      await logger.info(`Downloaded ${downloadedCount}/${assetUrls.size} assets`);

      const cssAssets = Array.from(allAssets.entries())
        .filter(([, path]) => path.endsWith('.css'))
        .map(([url, path]) => ({ url, path }));

      for (const { url, path } of cssAssets) {
        try {
          const cssPath = join(config.outputDir, path);
          const cssContent = await readFile(cssPath, 'utf-8');
          const extractedAssets = extractAssetsFromCSS(cssContent, url);

          for (const asset of extractedAssets) {
            if (!allAssets.has(asset.url)) {
              assetUrls.add(asset.url);
            }
          }
        } catch (err) {
          await logger.error(`Failed to parse CSS file: ${path}`, err instanceof Error ? err : new Error(String(err)));
        }
      }

      if (assetUrls.size > downloadedCount) {
        await logger.info(`Found ${assetUrls.size - downloadedCount} additional assets in CSS files`);
        for (const assetUrl of assetUrls) {
          if (!allAssets.has(assetUrl)) {
            try {
              const buffer = await downloader.download(assetUrl);
              const fullPath = await downloader.saveAsset(assetUrl, buffer);
              const relativePath = relative(config.outputDir, fullPath).replace(/\\/g, '/');
              allAssets.set(assetUrl, relativePath);
              downloadedCount++;
            } catch (err) {
              await logger.error(`Failed to download additional asset: ${assetUrl}`, err instanceof Error ? err : new Error(String(err)));
            }
          }
        }
        await logger.info(`Total downloaded: ${downloadedCount} assets`);
      }

      const pagesHtmlMap = new Map<string, string>();
      for (const [url, pageData] of allPages) {
        const outputPath = fileOrganizer.mapUrlToPath(url, config.targetUrl);
        const fullPath = join(config.outputDir, outputPath);
        
        let processedHtml = pageData.html;
        processedHtml = htmlProcessor.rewriteUrls(processedHtml, allAssets, config.outputDir, fullPath, config.targetUrl);
        processedHtml = htmlProcessor.removeAnalytics(processedHtml);
        processedHtml = htmlProcessor.mockForms(processedHtml);
        
        pagesHtmlMap.set(url, processedHtml);
      }
      
      await fileOrganizer.organize(pagesHtmlMap, config.outputDir, config.targetUrl);
      
      for (const [url] of allPages) {
        const outputPath = fileOrganizer.mapUrlToPath(url, config.targetUrl);
        await logger.info(`Saved page to: ${outputPath}`);
      }

      await logger.info('Scraping completed successfully');
    } catch (error) {
      await errorHandler.handleTimeout(config.targetUrl, error instanceof Error ? error : new Error(String(error)));
    } finally {
      await browser.close();
    }
  });

program.parse();
