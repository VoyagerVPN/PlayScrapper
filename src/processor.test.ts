import { describe, it, expect } from 'vitest';
import { HtmlProcessor } from './processor';

describe('HtmlProcessor', () => {
  describe('constructor', () => {
    it('should initialize with default analytics domains', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://www.google-analytics.com/analytics.js"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('google-analytics.com');
    });

    it('should initialize with custom analytics domains', () => {
      const customDomains = ['custom-analytics.com'] as const;
      const processor = new HtmlProcessor(customDomains);
      const html = '<script src="https://custom-analytics.com/tracker.js"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('custom-analytics.com');
    });

    it('should handle empty analytics domains array', () => {
      const processor = new HtmlProcessor([]);
      const html = '<script src="https://www.google-analytics.com/analytics.js"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).toContain('google-analytics.com');
    });
  });

  describe('rewriteUrls', () => {
    it('should replace absolute URLs with relative for same origin links', () => {
      const processor = new HtmlProcessor();
      const html = '<a href="https://example.com/page1">Link</a>';
      const assetMap = new Map<string, string>();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('href="/page1"');
    });

    it('should keep external links unchanged', () => {
      const processor = new HtmlProcessor();
      const html = '<a href="https://external.com/page">External Link</a>';
      const assetMap = new Map<string, string>();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('href="https://external.com/page"');
    });

    it('should keep relative links unchanged', () => {
      const processor = new HtmlProcessor();
      const html = '<a href="/page1">Link</a>';
      const assetMap = new Map<string, string>();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('href="/page1"');
    });

    it('should replace script src with asset map entry', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://example.com/js/app.js"></script>';
      const assetMap = new Map([['https://example.com/js/app.js', './static/js/app.js']]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('src="./static/js/app.js"');
    });

    it('should replace link href with asset map entry', () => {
      const processor = new HtmlProcessor();
      const html = '<link rel="stylesheet" href="https://example.com/css/style.css">';
      const assetMap = new Map([['https://example.com/css/style.css', './static/css/style.css']]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('href="./static/css/style.css"');
    });

    it('should replace img src with asset map entry', () => {
      const processor = new HtmlProcessor();
      const html = '<img src="https://example.com/images/logo.png">';
      const assetMap = new Map([['https://example.com/images/logo.png', './static/images/logo.png']]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('src="./static/images/logo.png"');
    });

    it('should handle srcset attribute with multiple sources', () => {
      const processor = new HtmlProcessor();
      const html = '<source srcset="https://example.com/images/img1.jpg 1x, https://example.com/images/img2.jpg 2x">';
      const assetMap = new Map([
        ['https://example.com/images/img1.jpg', './static/images/img1.jpg'],
        ['https://example.com/images/img2.jpg', './static/images/img2.jpg']
      ]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('./static/images/img1.jpg 1x');
      expect(result).toContain('./static/images/img2.jpg 2x');
    });

    it('should remove canonical link elements', () => {
      const processor = new HtmlProcessor();
      const html = '<link rel="canonical" href="https://example.com/page">';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).not.toContain('canonical');
    });

    it('should remove alternate link elements', () => {
      const processor = new HtmlProcessor();
      const html = '<link rel="alternate" href="https://example.com/en/page">';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).not.toContain('alternate');
    });

    it('should handle scripts without src', () => {
      const processor = new HtmlProcessor();
      const html = '<script>console.log("inline script");</script>';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('console.log("inline script");');
    });

    it('should handle images without src', () => {
      const processor = new HtmlProcessor();
      const html = '<img alt="No src">';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('alt="No src"');
    });

    it('should handle anchors with javascript: href', () => {
      const processor = new HtmlProcessor();
      const html = '<a href="javascript:void(0)">Click</a>';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('href="javascript:void(0)"');
    });

    it('should handle anchors with mailto: href', () => {
      const processor = new HtmlProcessor();
      const html = '<a href="mailto:test@example.com">Email</a>';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('href="mailto:test@example.com"');
    });

    it('should handle complex HTML with multiple element types', () => {
      const processor = new HtmlProcessor();
      const html = `
        <html>
          <head>
            <link rel="stylesheet" href="https://example.com/css/style.css">
            <script src="https://example.com/js/app.js"></script>
          </head>
          <body>
            <img src="https://example.com/images/logo.png">
            <a href="https://example.com/page1">Link</a>
            <a href="https://external.com/page">External</a>
          </body>
        </html>
      `;
      const assetMap = new Map([
        ['https://example.com/css/style.css', './static/css/style.css'],
        ['https://example.com/js/app.js', './static/js/app.js'],
        ['https://example.com/images/logo.png', './static/images/logo.png']
      ]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('./static/css/style.css');
      expect(result).toContain('./static/js/app.js');
      expect(result).toContain('./static/images/logo.png');
      expect(result).toContain('href="/page1"');
      expect(result).toContain('href="https://external.com/page"');
    });

    it('should handle srcset with only URLs without descriptors', () => {
      const processor = new HtmlProcessor();
      const html = '<source srcset="https://example.com/images/img1.jpg, https://example.com/images/img2.jpg">';
      const assetMap = new Map([
        ['https://example.com/images/img1.jpg', './static/images/img1.jpg'],
        ['https://example.com/images/img2.jpg', './static/images/img2.jpg']
      ]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('./static/images/img1.jpg');
      expect(result).toContain('./static/images/img2.jpg');
    });

    it('should handle empty assetMap', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://example.com/js/app.js"></script>';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('src="/js/app.js"');
    });

    it('should preserve other link rel types', () => {
      const processor = new HtmlProcessor();
      const html = '<link rel="icon" href="https://example.com/favicon.ico">';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('rel="icon"');
    });
  });

  describe('removeAnalytics', () => {
    it('should remove Google Analytics scripts', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://www.google-analytics.com/analytics.js"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('google-analytics.com');
    });

    it('should remove Google Tag Manager scripts', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://www.googletagmanager.com/gtag/js?id=UA-123"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('googletagmanager.com');
    });

    it('should remove Yandex Metrica scripts', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://mc.yandex.ru/metrika/watch.js"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('yandex.ru');
    });

    it('should remove Facebook Pixel scripts', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://connect.facebook.net/en_US/fbevents.js"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('facebook.com');
    });

    it('should remove inline Google Analytics code', () => {
      const processor = new HtmlProcessor();
      const html = '<script>ga("create", "UA-123", "auto");</script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('ga(');
    });

    it('should remove Google Tag Manager inline code', () => {
      const processor = new HtmlProcessor();
      const html = '<script>dataLayer.push({"event": "gtm.init"});</script>';
      const result = processor.removeAnalytics(html);
      expect(result).toContain('dataLayer');
    });

    it('should remove Yandex Metrica inline code', () => {
      const processor = new HtmlProcessor();
      const html = '<script>yaCounter123.hit(url, options);</script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('yaCounter');
    });

    it('should remove Facebook Pixel inline code', () => {
      const processor = new HtmlProcessor();
      const html = '<script>fbq("track", "PageView");</script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('fbq(');
    });

    it('should remove analytics iframes', () => {
      const processor = new HtmlProcessor();
      const html = '<iframe src="https://www.google-analytics.com/analytics.html"></iframe>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('iframe');
    });

    it('should keep non-analytics scripts', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://example.com/js/app.js"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).toContain('example.com');
    });

    it('should keep inline non-analytics scripts', () => {
      const processor = new HtmlProcessor();
      const html = '<script>console.log("Hello World");</script>';
      const result = processor.removeAnalytics(html);
      expect(result).toContain('console.log');
    });

    it('should handle multiple analytics scripts', () => {
      const processor = new HtmlProcessor();
      const html = `
        <script src="https://www.google-analytics.com/analytics.js"></script>
        <script src="https://www.googletagmanager.com/gtag/js"></script>
        <script>ga("create", "UA-123");</script>
      `;
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('google-analytics.com');
      expect(result).not.toContain('googletagmanager.com');
      expect(result).not.toContain('ga(');
    });

    it('should remove DoubleClick scripts', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://doubleclick.net/ad.js"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('doubleclick.net');
    });

    it('should remove StatCounter scripts', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://statcounter.com/counter/counter.js"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('statcounter.com');
    });

    it('should remove Hotjar scripts', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://static.hotjar.com/c/hotjar-123.js"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('hotjar.com');
    });

    it('should remove Segment scripts', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://cdn.segment.io/analytics.js/v1/KEY.js"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('segment.io');
    });

    it('should handle empty HTML', () => {
      const processor = new HtmlProcessor();
      const html = '';
      const result = processor.removeAnalytics(html);
      expect(result).toContain('<html>');
    });

    it('should handle HTML without scripts', () => {
      const processor = new HtmlProcessor();
      const html = '<div><p>Hello World</p></div>';
      const result = processor.removeAnalytics(html);
      expect(result).toContain('Hello World');
    });

    it('should handle script with only analytics domain in content', () => {
      const processor = new HtmlProcessor();
      const html = '<script>var url = "https://www.google-analytics.com";</script>';
      const result = processor.removeAnalytics(html);
      expect(result).not.toContain('google-analytics.com');
    });

    it('should preserve script content with non-analytics text', () => {
      const processor = new HtmlProcessor();
      const html = '<script>console.log("This is safe");</script>';
      const result = processor.removeAnalytics(html);
      expect(result).toContain('This is safe');
    });
  });

  describe('mockForms', () => {
    it('should add onsubmit="return false" to forms', () => {
      const processor = new HtmlProcessor();
      const html = '<form action="/submit"><input type="submit"></form>';
      const result = processor.mockForms(html);
      expect(result).toContain('onsubmit="return false"');
    });

    it('should add action="#" to forms without action', () => {
      const processor = new HtmlProcessor();
      const html = '<form><input type="submit"></form>';
      const result = processor.mockForms(html);
      expect(result).toContain('action="#"');
    });

    it('should preserve existing form action', () => {
      const processor = new HtmlProcessor();
      const html = '<form action="/submit"><input type="submit"></form>';
      const result = processor.mockForms(html);
      expect(result).toContain('action="/submit"');
    });

    it('should handle multiple forms', () => {
      const processor = new HtmlProcessor();
      const html = `
        <form id="form1"><input type="submit"></form>
        <form id="form2" action="/submit2"><input type="submit"></form>
      `;
      const result = processor.mockForms(html);
      expect(result).toContain('id="form1"');
      expect(result).toContain('id="form2"');
      expect(result.match(/onsubmit="return false"/g)?.length).toBe(2);
    });

    it('should preserve other form attributes', () => {
      const processor = new HtmlProcessor();
      const html = '<form method="post" enctype="multipart/form-data"><input type="submit"></form>';
      const result = processor.mockForms(html);
      expect(result).toContain('method="post"');
      expect(result).toContain('enctype="multipart/form-data"');
    });

    it('should handle empty HTML', () => {
      const processor = new HtmlProcessor();
      const html = '';
      const result = processor.mockForms(html);
      expect(result).toContain('<html>');
    });

    it('should handle HTML without forms', () => {
      const processor = new HtmlProcessor();
      const html = '<div><p>No forms here</p></div>';
      const result = processor.mockForms(html);
      expect(result).toContain('No forms here');
    });

    it('should replace existing onsubmit attribute', () => {
      const processor = new HtmlProcessor();
      const html = '<form onsubmit="validate()"><input type="submit"></form>';
      const result = processor.mockForms(html);
      expect(result).toContain('onsubmit="return false"');
      expect(result).not.toContain('validate()');
    });

    it('should handle forms with GET method', () => {
      const processor = new HtmlProcessor();
      const html = '<form method="get" action="/search"><input type="submit"></form>';
      const result = processor.mockForms(html);
      expect(result).toContain('method="get"');
      expect(result).toContain('onsubmit="return false"');
    });

    it('should handle forms with POST method', () => {
      const processor = new HtmlProcessor();
      const html = '<form method="post" action="/submit"><input type="submit"></form>';
      const result = processor.mockForms(html);
      expect(result).toContain('method="post"');
      expect(result).toContain('onsubmit="return false"');
    });
  });

  describe('integration tests', () => {
    it('should process complete HTML with all transformations', () => {
      const processor = new HtmlProcessor();
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <link rel="canonical" href="https://example.com/page">
            <link rel="stylesheet" href="https://example.com/css/style.css">
            <script src="https://www.google-analytics.com/analytics.js"></script>
            <script src="https://example.com/js/app.js"></script>
          </head>
          <body>
            <form id="search"><input type="text"><input type="submit"></form>
            <img src="https://example.com/images/logo.png">
            <a href="https://example.com/page1">Link</a>
          </body>
        </html>
      `;
      const assetMap = new Map([
        ['https://example.com/css/style.css', './static/css/style.css'],
        ['https://example.com/js/app.js', './static/js/app.js'],
        ['https://example.com/images/logo.png', './static/images/logo.png']
      ]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      let result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      result = processor.removeAnalytics(result);
      result = processor.mockForms(result);
      
      expect(result).not.toContain('google-analytics.com');
      expect(result).not.toContain('canonical');
      expect(result).toContain('./static/css/style.css');
      expect(result).toContain('./static/js/app.js');
      expect(result).toContain('./static/images/logo.png');
      expect(result).toContain('onsubmit="return false"');
      expect(result).toContain('href="/page1"');
    });

    it('should handle malformed HTML gracefully', () => {
      const processor = new HtmlProcessor();
      const html = '<div><p>Unclosed<div>Another<div>Nested</p></div>';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toBeTruthy();
    });

    it('should handle HTML with special characters', () => {
      const processor = new HtmlProcessor();
      const html = '<form><input name="test&value" type="submit"></form>';
      const result = processor.mockForms(html);
      expect(result).toContain('onsubmit="return false"');
    });

    it('should handle HTML with comments', () => {
      const processor = new HtmlProcessor();
      const html = '<!-- Comment --><script src="https://www.google-analytics.com/analytics.js"></script>';
      const result = processor.removeAnalytics(html);
      expect(result).toContain('<!-- Comment -->');
      expect(result).not.toContain('google-analytics.com');
    });

    it('should handle script with both src and inline content', () => {
      const processor = new HtmlProcessor();
      const html = '<script src="https://example.com/js/app.js">console.log("inline");</script>';
      const result = processor.removeAnalytics(html);
      expect(result).toContain('console.log("inline")');
    });

    it('should handle script tags with type attribute', () => {
      const processor = new HtmlProcessor();
      const html = '<script type="application/ld+json">{"@context": "https://schema.org"}</script>';
      const result = processor.removeAnalytics(html);
      expect(result).toContain('application/ld+json');
    });

    it('should handle source element without srcset', () => {
      const processor = new HtmlProcessor();
      const html = '<source src="https://example.com/video.mp4">';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toBeTruthy();
    });

    it('should handle srcset with mixed URLs (some in assetMap, some not)', () => {
      const processor = new HtmlProcessor();
      const html = '<source srcset="https://example.com/images/img1.jpg 1x, https://external.com/img2.jpg 2x">';
      const assetMap = new Map([
        ['https://example.com/images/img1.jpg', './static/images/img1.jpg']
      ]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('./static/images/img1.jpg');
      expect(result).toContain('https://external.com/img2.jpg');
    });

    it('should convert same-origin absolute image URLs to relative', () => {
      const processor = new HtmlProcessor();
      const html = '<img src="https://example.com/images/photo.jpg">';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('src="/images/photo.jpg"');
    });

    it('should replace data-src lazy load attribute with src', () => {
      const processor = new HtmlProcessor();
      const html = '<img data-src="https://example.com/images/lazy.jpg" src="placeholder.jpg">';
      const assetMap = new Map([['https://example.com/images/lazy.jpg', './static/images/lazy.jpg']]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('src="./static/images/lazy.jpg"');
      expect(result).not.toContain('data-src=');
    });

    it('should replace data-original lazy load attribute with src', () => {
      const processor = new HtmlProcessor();
      const html = '<img data-original="https://example.com/images/original.jpg" class="lazy">';
      const assetMap = new Map([['https://example.com/images/original.jpg', './static/images/original.jpg']]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('src="./static/images/original.jpg"');
      expect(result).not.toContain('data-original=');
    });

    it('should replace video poster attribute with asset map entry', () => {
      const processor = new HtmlProcessor();
      const html = '<video poster="https://example.com/videos/poster.jpg"><source src="video.mp4"></video>';
      const assetMap = new Map([['https://example.com/videos/poster.jpg', './static/videos/poster.jpg']]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('poster="./static/videos/poster.jpg"');
    });

    it('should remove og:image meta tags', () => {
      const processor = new HtmlProcessor();
      const html = '<html><head><meta property="og:image" content="https://example.com/images/share.jpg"></head><body></body></html>';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).not.toContain('og:image');
    });

    it('should remove og:image:url meta tags', () => {
      const processor = new HtmlProcessor();
      const html = '<html><head><meta property="og:image:url" content="https://example.com/images/share.jpg"></head><body></body></html>';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).not.toContain('og:image:url');
    });

    it('should replace favicon link href with asset map entry', () => {
      const processor = new HtmlProcessor();
      const html = '<link rel="icon" href="https://example.com/favicon.ico">';
      const assetMap = new Map([['https://example.com/favicon.ico', './static/favicon.ico']]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('href="./static/favicon.ico"');
    });

    it('should replace apple-touch-icon link href with asset map entry', () => {
      const processor = new HtmlProcessor();
      const html = '<link rel="apple-touch-icon" href="https://example.com/apple-icon.png">';
      const assetMap = new Map([['https://example.com/apple-icon.png', './static/apple-icon.png']]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('href="./static/apple-icon.png"');
    });

    it('should replace mask-icon link href with asset map entry', () => {
      const processor = new HtmlProcessor();
      const html = '<link rel="mask-icon" href="https://example.com/mask-icon.svg" color="#5bbad5">';
      const assetMap = new Map([['https://example.com/mask-icon.svg', './static/mask-icon.svg']]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('href="./static/mask-icon.svg"');
      expect(result).toContain('color="#5bbad5"');
    });

    it('should replace manifest.json link href with asset map entry', () => {
      const processor = new HtmlProcessor();
      const html = '<link rel="manifest" href="https://example.com/manifest.json">';
      const assetMap = new Map([['https://example.com/manifest.json', './static/manifest.json']]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('href="./static/manifest.json"');
    });

    it('should replace browserconfig.xml link href with asset map entry', () => {
      const processor = new HtmlProcessor();
      const html = '<meta name="msapplication-config" content="https://example.com/browserconfig.xml">';
      const assetMap = new Map([['https://example.com/browserconfig.xml', './static/browserconfig.xml']]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('content="./static/browserconfig.xml"');
    });

    it('should handle multiple lazy load images', () => {
      const processor = new HtmlProcessor();
      const html = `
        <img data-src="https://example.com/img1.jpg" class="lazy">
        <img data-original="https://example.com/img2.jpg" class="lazy">
      `;
      const assetMap = new Map([
        ['https://example.com/img1.jpg', './static/img1.jpg'],
        ['https://example.com/img2.jpg', './static/img2.jpg']
      ]);
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('src="./static/img1.jpg"');
      expect(result).toContain('src="./static/img2.jpg"');
      expect(result).not.toContain('data-src=');
      expect(result).not.toContain('data-original=');
    });

    it('should handle missing asset map entry for lazy load image', () => {
      const processor = new HtmlProcessor();
      const html = '<img data-src="https://example.com/images/missing.jpg">';
      const assetMap = new Map();
      const outputDir = '/output';
      const pagePath = '/output/index.html';
      const targetUrl = 'https://example.com';
      
      const result = processor.rewriteUrls(html, assetMap, outputDir, pagePath, targetUrl);
      expect(result).toContain('src="/images/missing.jpg"');
      expect(result).not.toContain('data-src=');
    });
  });
});
