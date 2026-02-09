import { describe, it, expect } from 'vitest';
import { extractAssetsFromCSS } from './css-parser';

describe('extractAssetsFromCSS', () => {
  describe('font extraction', () => {
    it('should extract font URL from @font-face rule', () => {
      const css = `
        @font-face {
          font-family: 'CustomFont';
          src: url('https://example.com/fonts/custom.woff2') format('woff2');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0]).toEqual({
        url: 'https://example.com/fonts/custom.woff2',
        type: 'FONT'
      });
    });

    it('should extract font URL without quotes', () => {
      const css = `
        @font-face {
          font-family: 'TestFont';
          src: url(https://example.com/test.woff) format('woff');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/test.woff');
      expect(assets[0].type).toBe('FONT');
    });

    it('should extract font URL with double quotes', () => {
      const css = `
        @font-face {
          font-family: 'Font';
          src: url("https://example.com/font.ttf");
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/font.ttf');
    });

    it('should extract multiple fonts', () => {
      const css = `
        @font-face {
          font-family: 'Font1';
          src: url('https://example.com/font1.woff');
        }
        @font-face {
          font-family: 'Font2';
          src: url('https://example.com/font2.woff');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(2);
      expect(assets[0].type).toBe('FONT');
      expect(assets[1].type).toBe('FONT');
    });

    it('should ignore data: URLs in fonts', () => {
      const css = `
        @font-face {
          font-family: 'InlineFont';
          src: url('data:font/woff2;base64,d09GMgABAAAAAA');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(0);
    });

    it('should handle relative font URLs', () => {
      const css = `
        @font-face {
          font-family: 'RelFont';
          src: url('../fonts/rel.woff');
        }
      `;
      const baseUrl = 'https://example.com/css/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/fonts/rel.woff');
    });
  });

  describe('background image extraction', () => {
    it('should extract background-image URL', () => {
      const css = `
        .bg {
          background-image: url('https://example.com/images/bg.jpg');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0]).toEqual({
        url: 'https://example.com/images/bg.jpg',
        type: 'IMG'
      });
    });

    it('should extract background URL (shorthand)', () => {
      const css = `
        .header {
          background: url('https://example.com/header.png') no-repeat center;
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/header.png');
      expect(assets[0].type).toBe('IMG');
    });

    it('should extract background URL without quotes', () => {
      const css = `
        .icon {
          background-image: url(https://example.com/icon.svg);
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/icon.svg');
    });

    it('should extract background URL with double quotes', () => {
      const css = `
        .box {
          background-image: url("https://example.com/box.png");
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/box.png');
    });

    it('should extract multiple background images', () => {
      const css = `
        .bg1 { background-image: url('https://example.com/bg1.jpg'); }
        .bg2 { background-image: url('https://example.com/bg2.jpg'); }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(2);
      expect(assets[0].type).toBe('IMG');
      expect(assets[1].type).toBe('IMG');
    });

    it('should ignore data: URLs in backgrounds', () => {
      const css = `
        .inline-bg {
          background-image: url('data:image/png;base64,iVBORw0KGgoAAAANS');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(0);
    });

    it('should handle relative background URLs', () => {
      const css = `
        .bg {
          background-image: url('../images/bg.jpg');
        }
      `;
      const baseUrl = 'https://example.com/css/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/images/bg.jpg');
    });
  });

  describe('mixed content', () => {
    it('should extract both fonts and background images', () => {
      const css = `
        @font-face {
          font-family: 'TestFont';
          src: url('https://example.com/font.woff');
        }
        .bg {
          background-image: url('https://example.com/bg.jpg');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(2);
      expect(assets[0].type).toBe('FONT');
      expect(assets[1].type).toBe('IMG');
    });

    it('should handle complex CSS with multiple selectors', () => {
      const css = `
        .class1 { background-image: url('https://example.com/bg1.jpg'); }
        .class2 { background-image: url('https://example.com/bg2.jpg'); }
        @font-face { src: url('https://example.com/font1.woff'); }
        @font-face { src: url('https://example.com/font2.woff'); }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(4);
      expect(assets.filter(a => a.type === 'IMG')).toHaveLength(2);
      expect(assets.filter(a => a.type === 'FONT')).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty CSS', () => {
      const css = '';
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(0);
    });

    it('should handle CSS without URLs', () => {
      const css = `
        .class {
          color: red;
          font-size: 16px;
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(0);
    });

    it('should handle relative URLs by resolving against baseUrl', () => {
      const css = `
        @font-face {
          font-family: 'BadFont';
          src: url('not-a-valid-url');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/not-a-valid-url');
    });

    it('should handle URLs with query parameters', () => {
      const css = `
        .bg {
          background-image: url('https://example.com/bg.jpg?v=1.0');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/bg.jpg?v=1.0');
    });

    it('should handle URLs with fragments', () => {
      const css = `
        .bg {
          background-image: url('https://example.com/bg.jpg#section');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/bg.jpg#section');
    });

    it('should handle CSS comments', () => {
      const css = `
        /* Comment */
        @font-face {
          font-family: 'Font';
          src: url('https://example.com/font.woff');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
    });

    it('should handle CSS with whitespace variations', () => {
      const css = `
        @font-face{font-family:'Font';src:url('https://example.com/font.woff')}
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
    });

    it('should handle single url() in background property', () => {
      const css = `
        .bg {
          background-image: url('https://example.com/bg1.jpg');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/bg1.jpg');
    });

    it('should handle @font-face with single src declaration', () => {
      const css = `
        @font-face {
          font-family: 'Font';
          src: url('https://example.com/font.woff2') format('woff2');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/font.woff2');
    });
  });

  describe('base URL handling', () => {
    it('should resolve relative URLs correctly with trailing slash', () => {
      const css = `
        .bg {
          background-image: url('bg.jpg');
        }
      `;
      const baseUrl = 'https://example.com/css/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/css/bg.jpg');
    });

    it('should resolve relative URLs correctly without trailing slash', () => {
      const css = `
        .bg {
          background-image: url('bg.jpg');
        }
      `;
      const baseUrl = 'https://example.com/css';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/bg.jpg');
    });

    it('should resolve absolute paths correctly', () => {
      const css = `
        .bg {
          background-image: url('/images/bg.jpg');
        }
      `;
      const baseUrl = 'https://example.com/css/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://example.com/images/bg.jpg');
    });

    it('should resolve protocol-relative URLs correctly', () => {
      const css = `
        .bg {
          background-image: url('//cdn.example.com/bg.jpg');
        }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(1);
      expect(assets[0].url).toBe('https://cdn.example.com/bg.jpg');
    });
  });

  describe('type detection', () => {
    it('should correctly identify font types', () => {
      const css = `
        @font-face { src: url('font.woff'); }
        @font-face { src: url('font.ttf'); }
        @font-face { src: url('font.otf'); }
        @font-face { src: url('font.woff2'); }
        @font-face { src: url('font.eot'); }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(5);
      assets.forEach(asset => {
        expect(asset.type).toBe('FONT');
      });
    });

    it('should correctly identify image types from backgrounds', () => {
      const css = `
        .bg1 { background-image: url('bg.jpg'); }
        .bg2 { background-image: url('bg.png'); }
        .bg3 { background-image: url('bg.gif'); }
        .bg4 { background-image: url('bg.svg'); }
        .bg5 { background-image: url('bg.webp'); }
      `;
      const baseUrl = 'https://example.com/';
      const assets = extractAssetsFromCSS(css, baseUrl);
      
      expect(assets).toHaveLength(5);
      assets.forEach(asset => {
        expect(asset.type).toBe('IMG');
      });
    });
  });
});
