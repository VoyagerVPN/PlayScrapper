import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Logger } from './logger';
import { ErrorHandler } from './error-handler';

describe('ErrorHandler', () => {
  const testLogFile = 'test-error-handler.log';
  const testProgressFile = 'test-progress.json';
  let logger: Logger;
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    logger = new Logger(testLogFile, false);
    errorHandler = new ErrorHandler(logger, 3, 100);
  });

  afterEach(async () => {
    if (existsSync(testLogFile)) {
      await unlink(testLogFile);
    }
    if (existsSync(testProgressFile)) {
      await unlink(testProgressFile);
    }
  });

  describe('constructor', () => {
    it('should create handler with default max retries', () => {
      const defaultHandler = new ErrorHandler(logger);
      expect(defaultHandler).toBeDefined();
    });

    it('should create handler with custom max retries', () => {
      const customHandler = new ErrorHandler(logger, 5, 500);
      expect(customHandler).toBeDefined();
    });

    it('should create handler with custom retry delay', () => {
      const customDelayHandler = new ErrorHandler(logger, 2, 2000);
      expect(customDelayHandler).toBeDefined();
    });
  });

  describe('handleTimeout', () => {
    it('should log timeout warnings for all retry attempts', async () => {
      const url = 'https://example.com/page';
      const error = new Error('TimeoutError');

      await errorHandler.handleTimeout(url, error);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('[WARN]');
      expect(logContent).toContain('Timeout attempt 1/3');
      expect(logContent).toContain('Timeout attempt 2/3');
      expect(logContent).toContain('Timeout attempt 3/3');
    });

    it('should log max retries exceeded error', async () => {
      const url = 'https://example.com/timeout';
      const error = new Error('RequestTimeout');

      await errorHandler.handleTimeout(url, error);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('[ERROR]');
      expect(logContent).toContain('Max retries (3) exceeded');
      expect(logContent).toContain(url);
    });

    it('should include error details in timeout log', async () => {
      const url = 'https://example.com/slow-page';
      const error = new Error('ConnectionTimeout');

      await errorHandler.handleTimeout(url, error);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('Error: ConnectionTimeout');
    });

    it('should handle timeout with TypeError', async () => {
      const url = 'https://example.com/typo';
      const error = new TypeError('Network error');

      await errorHandler.handleTimeout(url, error);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('TypeError: Network error');
    });

    it('should return false after max retries', async () => {
      const url = 'https://example.com/failed';
      const error = new Error('Timeout');

      const result = await errorHandler.handleTimeout(url, error);
      expect(result).toBe(false);
    });

    it('should handle empty URL', async () => {
      const url = '';
      const error = new Error('Timeout');

      await errorHandler.handleTimeout(url, error);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('Max retries (3) exceeded');
    });

    it('should handle URL with special characters', async () => {
      const url = 'https://example.com/page?param=value&other=test';
      const error = new Error('Timeout');

      await errorHandler.handleTimeout(url, error);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain(url);
    });

    it('should work with custom max retries', async () => {
      const customHandler = new ErrorHandler(logger, 2, 50);
      const url = 'https://example.com/custom';
      const error = new Error('Timeout');

      await customHandler.handleTimeout(url, error);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('Max retries (2) exceeded');
      expect(logContent).toContain('Timeout attempt 1/2');
      expect(logContent).toContain('Timeout attempt 2/2');
      expect(logContent).not.toContain('Timeout attempt 3/2');
    });
  });

  describe('handle404', () => {
    it('should log 404 warning with URL', async () => {
      const url = 'https://example.com/not-found';

      await errorHandler.handle404(url);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('[WARN]');
      expect(logContent).toContain('Skipping 404 URL');
      expect(logContent).toContain(url);
    });

    it('should handle URL with path', async () => {
      const url = 'https://example.com/path/to/page';

      await errorHandler.handle404(url);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain(url);
    });

    it('should handle URL with query parameters', async () => {
      const url = 'https://example.com/search?q=test';

      await errorHandler.handle404(url);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain(url);
    });

    it('should handle URL with hash fragment', async () => {
      const url = 'https://example.com/page#section';

      await errorHandler.handle404(url);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain(url);
    });

    it('should handle multiple 404 URLs', async () => {
      await errorHandler.handle404('https://example.com/404-1');
      await errorHandler.handle404('https://example.com/404-2');
      await errorHandler.handle404('https://example.com/404-3');

      const logContent = await readFile(testLogFile, 'utf-8');
      const lines = logContent.split('\n').filter(line => line.length > 0);
      expect(lines).toHaveLength(3);
    });

    it('should handle empty URL', async () => {
      const url = '';

      await errorHandler.handle404(url);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('[WARN]');
      expect(logContent).toContain('Skipping 404 URL');
    });
  });

  describe('handleNetworkError', () => {
    it('should log network error with URL', async () => {
      const url = 'https://example.com/network-error';
      const error = new Error('ECONNREFUSED');

      await errorHandler.handleNetworkError(url, error);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('[ERROR]');
      expect(logContent).toContain('Network error');
      expect(logContent).toContain(url);
    });

    it('should include error details in network error log', async () => {
      const url = 'https://example.com/failed';
      const error = new Error('ENOTFOUND');

      await errorHandler.handleNetworkError(url, error);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('Error: ENOTFOUND');
    });

    it('should handle different error types', async () => {
      const url = 'https://example.com/type-error';
      const error = new TypeError('Invalid URL format');

      await errorHandler.handleNetworkError(url, error);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('TypeError: Invalid URL format');
    });

    it('should handle error with custom message', async () => {
      const url = 'https://example.com/custom-error';
      const error = new Error('Custom network failure message');

      await errorHandler.handleNetworkError(url, error);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('Custom network failure message');
    });

    it('should handle multiple network errors', async () => {
      await errorHandler.handleNetworkError('https://example.com/error1', new Error('Error 1'));
      await errorHandler.handleNetworkError('https://example.com/error2', new Error('Error 2'));
      await errorHandler.handleNetworkError('https://example.com/error3', new Error('Error 3'));

      const logContent = await readFile(testLogFile, 'utf-8');
      const lines = logContent.split('\n').filter(line => line.length > 0);
      expect(lines).toHaveLength(3);
    });

    it('should handle network error with stack trace', async () => {
      const url = 'https://example.com/stack-error';
      const error = new Error('Stack trace error');
      error.stack = 'Error: Stack trace error\n    at test.js:10:15\n    at another.js:20:25';

      await errorHandler.handleNetworkError(url, error);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('Error: Stack trace error');
    });
  });

  describe('saveProgress', () => {
    it('should save progress to JSON file', async () => {
      const visitedUrls = new Set(['https://example.com/', 'https://example.com/about']);
      const currentPage = 'https://example.com/contact';

      await errorHandler.saveProgress(visitedUrls, currentPage, testProgressFile);

      expect(existsSync(testProgressFile)).toBe(true);

      const progressData = JSON.parse(await readFile(testProgressFile, 'utf-8'));
      expect(progressData.visitedUrls).toEqual(['https://example.com/', 'https://example.com/about']);
      expect(progressData.currentPage).toBe('https://example.com/contact');
      expect(progressData.timestamp).toBeDefined();
    });

    it('should log successful progress save', async () => {
      const visitedUrls = new Set(['https://example.com/']);
      const currentPage = 'https://example.com/home';

      await errorHandler.saveProgress(visitedUrls, currentPage, testProgressFile);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('[INFO]');
      expect(logContent).toContain('Progress saved');
      expect(logContent).toContain(testProgressFile);
    });

    it('should handle empty visited URLs set', async () => {
      const visitedUrls = new Set<string>();
      const currentPage = 'https://example.com/start';

      await errorHandler.saveProgress(visitedUrls, currentPage, testProgressFile);

      const progressData = JSON.parse(await readFile(testProgressFile, 'utf-8'));
      expect(progressData.visitedUrls).toEqual([]);
    });

    it('should handle large visited URLs set', async () => {
      const visitedUrls = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        visitedUrls.add(`https://example.com/page-${i}`);
      }
      const currentPage = 'https://example.com/current';

      await errorHandler.saveProgress(visitedUrls, currentPage, testProgressFile);

      const progressData = JSON.parse(await readFile(testProgressFile, 'utf-8'));
      expect(progressData.visitedUrls).toHaveLength(1000);
      expect(progressData.visitedUrls[0]).toBe('https://example.com/page-0');
      expect(progressData.visitedUrls[999]).toBe('https://example.com/page-999');
    });

    it('should handle URLs with special characters', async () => {
      const visitedUrls = new Set([
        'https://example.com/page?query=test&sort=asc',
        'https://example.com/path/with spaces'
      ]);
      const currentPage = 'https://example.com/special#section';

      await errorHandler.saveProgress(visitedUrls, currentPage, testProgressFile);

      const progressData = JSON.parse(await readFile(testProgressFile, 'utf-8'));
      expect(progressData.visitedUrls).toHaveLength(2);
      expect(progressData.visitedUrls[0]).toContain('query=test');
      expect(progressData.currentPage).toContain('#section');
    });

    it('should create timestamp in ISO format', async () => {
      const visitedUrls = new Set(['https://example.com/']);
      const currentPage = 'https://example.com/';

      await errorHandler.saveProgress(visitedUrls, currentPage, testProgressFile);

      const progressData = JSON.parse(await readFile(testProgressFile, 'utf-8'));
      expect(progressData.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should handle progress file creation', async () => {
      const visitedUrls = new Set(['https://example.com/']);
      const currentPage = 'https://example.com/';

      expect(existsSync(testProgressFile)).toBe(false);

      await errorHandler.saveProgress(visitedUrls, currentPage, testProgressFile);

      expect(existsSync(testProgressFile)).toBe(true);
    });

    it('should overwrite existing progress file', async () => {
      const visitedUrls1 = new Set(['https://example.com/1']);
      const currentPage1 = 'https://example.com/page1';

      await errorHandler.saveProgress(visitedUrls1, currentPage1, testProgressFile);

      const visitedUrls2 = new Set(['https://example.com/2']);
      const currentPage2 = 'https://example.com/page2';

      await errorHandler.saveProgress(visitedUrls2, currentPage2, testProgressFile);

      const progressData = JSON.parse(await readFile(testProgressFile, 'utf-8'));
      expect(progressData.visitedUrls).toEqual(['https://example.com/2']);
      expect(progressData.currentPage).toBe('https://example.com/page2');
    });

    it('should log error if progress save fails', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist/progress.json';
      const visitedUrls = new Set(['https://example.com/']);
      const currentPage = 'https://example.com/';

      await errorHandler.saveProgress(visitedUrls, currentPage, invalidPath);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('[ERROR]');
      expect(logContent).toContain('Failed to save progress');
    });
  });

  describe('integration', () => {
    it('should handle mixed error types', async () => {
      await errorHandler.handle404('https://example.com/not-found');
      await errorHandler.handleTimeout('https://example.com/timeout', new Error('Timeout'));
      await errorHandler.handleNetworkError('https://example.com/network', new Error('Network'));
      await errorHandler.handle404('https://example.com/another-404');

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('[WARN]');
      expect(logContent).toContain('[ERROR]');
      expect(logContent).toContain('Skipping 404 URL');
      expect(logContent).toContain('Timeout attempt');
      expect(logContent).toContain('Network error');
    });

    it('should save progress and handle errors', async () => {
      const visitedUrls = new Set(['https://example.com/', 'https://example.com/about']);
      const currentPage = 'https://example.com/contact';

      await errorHandler.handle404('https://example.com/missing');
      await errorHandler.saveProgress(visitedUrls, currentPage, testProgressFile);
      await errorHandler.handleNetworkError('https://example.com/error', new Error('Error'));

      expect(existsSync(testProgressFile)).toBe(true);

      const progressData = JSON.parse(await readFile(testProgressFile, 'utf-8'));
      expect(progressData.visitedUrls).toHaveLength(2);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('Progress saved');
      expect(logContent).toContain('Skipping 404 URL');
      expect(logContent).toContain('Network error');
    });
  });

  describe('withRetry', () => {
    it('should return result on first attempt', async () => {
      const url = 'https://example.com/success';
      const operation = vi.fn().mockResolvedValue('success');

      const result = await errorHandler.withRetry(url, operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const url = 'https://example.com/retry';
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await errorHandler.withRetry(url, operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const url = 'https://example.com/fail';
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(errorHandler.withRetry(url, operation)).rejects.toThrow('Persistent error');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should log warnings for failed attempts', async () => {
      const url = 'https://example.com/attempt-warning';
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt failed'))
        .mockResolvedValue('success');

      await errorHandler.withRetry(url, operation);

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('Attempt 1/3 failed');
      expect(logContent).toContain('Attempt failed');
    });

    it('should log error after all retries fail', async () => {
      const url = 'https://example.com/all-failed';
      const operation = vi.fn().mockRejectedValue(new Error('All failed'));

      await expect(errorHandler.withRetry(url, operation)).rejects.toThrow('All failed');

      const logContent = await readFile(testLogFile, 'utf-8');
      expect(logContent).toContain('All 3 attempts failed');
      expect(logContent).toContain('[ERROR]');
    });

    it('should handle non-Error objects', async () => {
      const url = 'https://example.com/non-error';
      const operation = vi.fn().mockRejectedValue('string error');

      await expect(errorHandler.withRetry(url, operation)).rejects.toThrow('string error');
    });

    it('should use custom max retries', async () => {
      const customHandler = new ErrorHandler(logger, 2, 100);
      const url = 'https://example.com/custom-retries';
      const operation = vi.fn().mockRejectedValue(new Error('Error'));

      await expect(customHandler.withRetry(url, operation)).rejects.toThrow('Error');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});
