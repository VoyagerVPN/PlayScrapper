import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Logger } from './logger';

describe('Logger', () => {
  const testLogFile = 'test-logger.log';
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger(testLogFile, false);
  });

  afterEach(async () => {
    if (existsSync(testLogFile)) {
      await unlink(testLogFile);
    }
  });

  describe('constructor', () => {
    it('should create logger with default log file path', () => {
      const defaultLogger = new Logger();
      expect(defaultLogger).toBeDefined();
    });

    it('should create logger with custom log file path', () => {
      const customLogger = new Logger('custom.log', false);
      expect(customLogger).toBeDefined();
    });

    it('should create logger with console disabled', () => {
      const noConsoleLogger = new Logger(testLogFile, false);
      expect(noConsoleLogger).toBeDefined();
    });
  });

  describe('info', () => {
    it('should write info message to log file', async () => {
      const message = 'Test info message';
      await logger.info(message);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toContain('[INFO]');
      expect(content).toContain(message);
    });

    it('should include timestamp in info log', async () => {
      const message = 'Timestamp test';
      await logger.info(message);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('should append multiple info messages', async () => {
      await logger.info('First message');
      await logger.info('Second message');

      const content = await readFile(testLogFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.length > 0);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('First message');
      expect(lines[1]).toContain('Second message');
    });

    it('should handle special characters in message', async () => {
      const message = 'Test with "quotes" and \'apostrophes\' and <tags>';
      await logger.info(message);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toContain(message);
    });

    it('should handle unicode characters', async () => {
      const message = 'Test with emoji 🎉 and Cyrillic 中文';
      await logger.info(message);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toContain('🎉');
      expect(content).toContain('中文');
    });
  });

  describe('error', () => {
    it('should write error message to log file', async () => {
      const message = 'Test error message';
      await logger.error(message);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toContain('[ERROR]');
      expect(content).toContain(message);
    });

    it('should include error details when provided', async () => {
      const message = 'Operation failed';
      const error = new Error('Test error details');
      await logger.error(message, error);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toContain('[ERROR]');
      expect(content).toContain(message);
      expect(content).toContain('Error: Test error details');
    });

    it('should include error name in log', async () => {
      const message = 'Network error';
      const error = new TypeError('Invalid type');
      await logger.error(message, error);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toContain('TypeError: Invalid type');
    });

    it('should handle error without Error object', async () => {
      const message = 'Error without object';
      await logger.error(message);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toContain('[ERROR]');
      expect(content).toContain(message);
      expect(content).not.toContain('|');
    });

    it('should append multiple error messages', async () => {
      await logger.error('First error', new Error('Error 1'));
      await logger.error('Second error', new Error('Error 2'));

      const content = await readFile(testLogFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.length > 0);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('First error');
      expect(lines[1]).toContain('Second error');
    });

    it('should handle error with stack trace context', async () => {
      const message = 'Context error';
      const error = new Error('Context error details');
      error.stack = 'Error stack trace line 1\nError stack trace line 2';
      await logger.error(message, error);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toContain('[ERROR]');
      expect(content).toContain(message);
      expect(content).toContain('Error: Context error details');
    });
  });

  describe('warn', () => {
    it('should write warning message to log file', async () => {
      const message = 'Test warning message';
      await logger.warn(message);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toContain('[WARN]');
      expect(content).toContain(message);
    });

    it('should include timestamp in warning log', async () => {
      const message = 'Warning timestamp test';
      await logger.warn(message);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('should append multiple warning messages', async () => {
      await logger.warn('First warning');
      await logger.warn('Second warning');

      const content = await readFile(testLogFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.length > 0);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('First warning');
      expect(lines[1]).toContain('Second warning');
    });
  });

  describe('integration', () => {
    it('should handle mixed log levels', async () => {
      await logger.info('Info message');
      await logger.warn('Warning message');
      await logger.error('Error message', new Error('Test error'));
      await logger.info('Another info');

      const content = await readFile(testLogFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.length > 0);
      expect(lines).toHaveLength(4);
      expect(content).toContain('[INFO]');
      expect(content).toContain('[WARN]');
      expect(content).toContain('[ERROR]');
    });

    it('should preserve log order', async () => {
      await logger.info('Step 1');
      await logger.warn('Step 2');
      await logger.error('Step 3');
      await logger.info('Step 4');

      const content = await readFile(testLogFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.length > 0);
      expect(lines[0]).toContain('Step 1');
      expect(lines[1]).toContain('Step 2');
      expect(lines[2]).toContain('Step 3');
      expect(lines[3]).toContain('Step 4');
    });

    it('should handle concurrent writes', async () => {
      const promises = [
        logger.info('Concurrent 1'),
        logger.warn('Concurrent 2'),
        logger.error('Concurrent 3'),
        logger.info('Concurrent 4')
      ];

      await Promise.all(promises);

      const content = await readFile(testLogFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.length > 0);
      expect(lines).toHaveLength(4);
    });

    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000);
      await logger.info(longMessage);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toContain('[INFO]');
      expect(content.length).toBeGreaterThan(10000);
    });

    it('should handle empty messages', async () => {
      await logger.info('');
      await logger.warn('');
      await logger.error('');

      const content = await readFile(testLogFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.length > 0);
      expect(lines).toHaveLength(3);
    });

    it('should handle multiline messages', async () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';
      await logger.info(multilineMessage);

      const content = await readFile(testLogFile, 'utf-8');
      expect(content).toContain('Line 1');
      expect(content).toContain('Line 2');
      expect(content).toContain('Line 3');
    });

    it('should create log file if it does not exist', async () => {
      const newLogFile = 'new-test-logger.log';
      const newLogger = new Logger(newLogFile, false);

      expect(existsSync(newLogFile)).toBe(false);

      await newLogger.info('Initial message');

      expect(existsSync(newLogFile)).toBe(true);

      if (existsSync(newLogFile)) {
        await unlink(newLogFile);
      }
    });

    it('should output to console when enableConsole is true', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleLogger = new Logger(testLogFile, true);

      await consoleLogger.info('Console test message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Console test message'));
      consoleSpy.mockRestore();
    });

    it('should not output to console when enableConsole is false', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const noConsoleLogger = new Logger(testLogFile, false);

      await noConsoleLogger.info('No console test message');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
