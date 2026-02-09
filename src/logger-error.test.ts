import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

describe('Logger error handling', () => {
  const testLogFile = 'test-logger-error.log';

  beforeEach(async () => {
    vi.resetModules();
    if (existsSync(testLogFile)) {
      await unlink(testLogFile);
    }
  });

  afterEach(async () => {
    if (existsSync(testLogFile)) {
      await unlink(testLogFile);
    }
  });

  it('should handle appendFile error when enableConsole is true', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual('node:fs/promises');
      return {
        ...actual,
        appendFile: vi.fn().mockRejectedValue(new Error('Disk full'))
      };
    });

    const { Logger } = await import('./logger');
    const consoleLogger = new Logger(testLogFile, true);
    await consoleLogger.info('Test message');

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to write to log file: Disk full');
    consoleErrorSpy.mockRestore();
  });

  it('should handle appendFile error when enableConsole is false', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual('node:fs/promises');
      return {
        ...actual,
        appendFile: vi.fn().mockRejectedValue(new Error('Permission denied'))
      };
    });

    const { Logger } = await import('./logger');
    const noConsoleLogger = new Logger(testLogFile, false);
    await noConsoleLogger.info('Test message');

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should handle non-Error objects in catch block', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual('node:fs/promises');
      return {
        ...actual,
        appendFile: vi.fn().mockRejectedValue('String error')
      };
    });

    const { Logger } = await import('./logger');
    const consoleLogger = new Logger(testLogFile, true);
    await consoleLogger.info('Test message');

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
