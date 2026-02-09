import { describe, it, expect } from 'vitest';
import { parseConfig, safeParseConfig } from './config.js';
import { ZodError } from 'zod';

describe('parseConfig', () => {
  describe('valid inputs', () => {
    it('should accept valid URL with all parameters', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: 3,
        outputDir: './output',
        verbose: true
      };
      const result = parseConfig(input);
      expect(result).toEqual({
        targetUrl: 'https://example.com',
        depth: 3,
        outputDir: './output',
        verbose: true
      });
    });

    it('should accept valid URL with minimal parameters', () => {
      const input = {
        targetUrl: 'https://example.com'
      };
      const result = parseConfig(input);
      expect(result).toEqual({
        targetUrl: 'https://example.com',
        depth: 2,
        outputDir: './scraped',
        verbose: false
      });
    });

    it('should apply default depth value', () => {
      const input = {
        targetUrl: 'https://example.com',
        outputDir: './custom'
      };
      const result = parseConfig(input);
      expect(result.depth).toBe(2);
    });

    it('should apply default outputDir value', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: 4
      };
      const result = parseConfig(input);
      expect(result.outputDir).toBe('./scraped');
    });

    it('should accept http URLs', () => {
      const input = {
        targetUrl: 'http://example.com'
      };
      const result = parseConfig(input);
      expect(result.targetUrl).toBe('http://example.com');
    });

    it('should accept HTTPS URLs', () => {
      const input = {
        targetUrl: 'https://example.com'
      };
      const result = parseConfig(input);
      expect(result.targetUrl).toBe('https://example.com');
    });

    it('should accept localhost URLs', () => {
      const input = {
        targetUrl: 'http://localhost:3000'
      };
      const result = parseConfig(input);
      expect(result.targetUrl).toBe('http://localhost:3000');
    });

    it('should accept IP addresses', () => {
      const input = {
        targetUrl: 'http://192.168.1.1'
      };
      const result = parseConfig(input);
      expect(result.targetUrl).toBe('http://192.168.1.1');
    });

    it('should accept minimum depth value', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: 1
      };
      const result = parseConfig(input);
      expect(result.depth).toBe(1);
    });

    it('should accept maximum depth value', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: 5
      };
      const result = parseConfig(input);
      expect(result.depth).toBe(5);
    });

    it('should accept verbose true', () => {
      const input = {
        targetUrl: 'https://example.com',
        verbose: true
      };
      const result = parseConfig(input);
      expect(result.verbose).toBe(true);
    });

    it('should apply default verbose value', () => {
      const input = {
        targetUrl: 'https://example.com'
      };
      const result = parseConfig(input);
      expect(result.verbose).toBe(false);
    });
  });

  describe('invalid URL validation', () => {
    it('should reject missing URL', () => {
      const input = {};
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should reject invalid URL without protocol', () => {
      const input = {
        targetUrl: 'example.com'
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should reject invalid URL string', () => {
      const input = {
        targetUrl: 'not-a-url'
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should reject empty string URL', () => {
      const input = {
        targetUrl: ''
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should reject null URL', () => {
      const input = {
        targetUrl: null
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should reject undefined URL', () => {
      const input = {
        targetUrl: undefined
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });
  });

  describe('depth validation', () => {
    it('should reject depth below minimum', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: 0
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should reject negative depth', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: -1
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should reject depth above maximum', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: 6
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should reject large depth value', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: 100
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should reject string depth', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: '2' as any
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should reject null depth', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: null
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });
  });

  describe('outputDir validation', () => {
    it('should reject null outputDir', () => {
      const input = {
        targetUrl: 'https://example.com',
        outputDir: null
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });



    it('should reject number outputDir', () => {
      const input = {
        targetUrl: 'https://example.com',
        outputDir: 123 as any
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });
  });

  describe('verbose validation', () => {
    it('should reject string verbose', () => {
      const input = {
        targetUrl: 'https://example.com',
        verbose: 'true' as any
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should reject null verbose', () => {
      const input = {
        targetUrl: 'https://example.com',
        verbose: null
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should reject number verbose', () => {
      const input = {
        targetUrl: 'https://example.com',
        verbose: 1 as any
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });
  });

  describe('ZodError details', () => {
    it('should provide detailed error message for invalid URL', () => {
      const input = {
        targetUrl: 'invalid-url'
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should provide detailed error message for invalid depth', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: 0
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });

    it('should provide detailed error messages for multiple invalid fields', () => {
      const input = {
        targetUrl: 'invalid',
        depth: 0,
        outputDir: null
      };
      expect(() => parseConfig(input)).toThrow(ZodError);
    });
  });

  describe('edge cases', () => {
    it('should accept valid complex URL', () => {
      const input = {
        targetUrl: 'https://example.com/path?query=value#fragment'
      };
      const result = parseConfig(input);
      expect(result.targetUrl).toBe('https://example.com/path?query=value#fragment');
    });

    it('should accept outputDir with nested path', () => {
      const input = {
        targetUrl: 'https://example.com',
        outputDir: './output/nested/path'
      };
      const result = parseConfig(input);
      expect(result.outputDir).toBe('./output/nested/path');
    });

    it('should accept outputDir with absolute path', () => {
      const input = {
        targetUrl: 'https://example.com',
        outputDir: '/tmp/scraped'
      };
      const result = parseConfig(input);
      expect(result.outputDir).toBe('/tmp/scraped');
    });
  });

  describe('safeParseConfig', () => {
    it('should return success for valid input', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: 3,
        outputDir: './output',
        verbose: true
      };
      const result = safeParseConfig(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetUrl).toBe('https://example.com');
        expect(result.data.depth).toBe(3);
        expect(result.data.outputDir).toBe('./output');
        expect(result.data.verbose).toBe(true);
      }
    });

    it('should return error for invalid URL', () => {
      const input = {
        targetUrl: 'invalid-url'
      };
      const result = safeParseConfig(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should return error for invalid depth', () => {
      const input = {
        targetUrl: 'https://example.com',
        depth: 0
      };
      const result = safeParseConfig(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should return error for multiple invalid fields', () => {
      const input = {
        targetUrl: 'invalid',
        depth: 0,
        outputDir: null
      };
      const result = safeParseConfig(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(1);
      }
    });

    it('should apply default values in safe mode', () => {
      const input = {
        targetUrl: 'https://example.com'
      };
      const result = safeParseConfig(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.depth).toBe(2);
        expect(result.data.outputDir).toBe('./scraped');
        expect(result.data.verbose).toBe(false);
      }
    });
  });
});
