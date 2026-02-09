import { appendFile } from 'node:fs/promises';
import { ILogger } from './types';

enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export class Logger implements ILogger {
  private logFilePath: string;
  private enableConsole: boolean;

  constructor(logFilePath: string = 'scraping-errors.log', enableConsole: boolean = true) {
    this.logFilePath = logFilePath;
    this.enableConsole = enableConsole;
  }

  private formatMessage(level: LogLevel, message: string, error?: Error): string {
    const timestamp = new Date().toISOString();
    const errorInfo = error ? ` | ${error.name}: ${error.message}` : '';
    return `[${timestamp}] [${level}] ${message}${errorInfo}\n`;
  }

  private async writeLog(formattedMessage: string): Promise<void> {
    try {
      await appendFile(this.logFilePath, formattedMessage, 'utf-8');
    } catch (writeError) {
      if (this.enableConsole && writeError instanceof Error) {
        console.error(`Failed to write to log file: ${writeError.message}`);
      }
    }
  }

  private outputToConsole(formattedMessage: string): void {
    if (this.enableConsole) {
      console.log(formattedMessage.trim());
    }
  }

  async info(message: string): Promise<void> {
    const formattedMessage = this.formatMessage(LogLevel.INFO, message);
    this.outputToConsole(formattedMessage);
    await this.writeLog(formattedMessage);
  }

  async error(message: string, error?: Error): Promise<void> {
    const formattedMessage = this.formatMessage(LogLevel.ERROR, message, error);
    this.outputToConsole(formattedMessage);
    await this.writeLog(formattedMessage);
  }

  async warn(message: string): Promise<void> {
    const formattedMessage = this.formatMessage(LogLevel.WARN, message);
    this.outputToConsole(formattedMessage);
    await this.writeLog(formattedMessage);
  }
}
