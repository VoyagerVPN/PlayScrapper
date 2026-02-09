import { writeFile } from 'node:fs/promises';
import { ILogger, IErrorHandler } from './types';

export class ErrorHandler implements IErrorHandler {
  private logger: ILogger;
  private maxRetries: number;
  private retryDelay: number;

  constructor(logger: ILogger, maxRetries: number = 3, retryDelay: number = 1000) {
    this.logger = logger;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async handleTimeout(url: string, error: Error): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      await this.logger.warn(`Timeout attempt ${attempt}/${this.maxRetries} for ${url}`);
      
      if (attempt < this.maxRetries) {
        await this.sleep(this.retryDelay);
      }
    }
    
    await this.logger.error(`Max retries (${this.maxRetries}) exceeded for ${url}`, error);
    return false;
  }

  async handle404(url: string): Promise<void> {
    await this.logger.warn(`Skipping 404 URL: ${url}`);
  }

  async handleNetworkError(url: string, error: Error): Promise<void> {
    await this.logger.error(`Network error for ${url}`, error);
  }

  async saveProgress(visitedUrls: Set<string>, currentPage: string, outputPath: string): Promise<void> {
    try {
      const progressData = {
        visitedUrls: Array.from(visitedUrls),
        currentPage,
        timestamp: new Date().toISOString()
      };
      
      await writeFile(outputPath, JSON.stringify(progressData, null, 2), 'utf-8');
      await this.logger.info(`Progress saved to ${outputPath}`);
    } catch (writeError) {
      if (writeError instanceof Error) {
        await this.logger.error(`Failed to save progress to ${outputPath}`, writeError);
      }
    }
  }

  async withRetry<T>(url: string, operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.maxRetries) {
          await this.logger.warn(`Attempt ${attempt}/${this.maxRetries} failed for ${url}: ${lastError.message}`);
          await this.sleep(this.retryDelay);
        }
      }
    }
    
    await this.logger.error(`All ${this.maxRetries} attempts failed for ${url}`, lastError!);
    throw lastError;
  }
}
