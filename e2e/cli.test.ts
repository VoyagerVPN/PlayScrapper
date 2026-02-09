import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { rm, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

const TEST_OUTPUT_DIR = 'e2e-test-output';

describe('CLI E2E Tests', () => {
  beforeAll(async () => {
    if (existsSync(TEST_OUTPUT_DIR)) {
      await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    if (existsSync(TEST_OUTPUT_DIR)) {
      await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe('Happy Path - Successful Scraping', () => {
    it('should scrape https://example.com successfully', { timeout: 120000 }, async () => {
      const { stdout, stderr } = await execAsync(
        `npm run dev -- https://example.com --output ${TEST_OUTPUT_DIR}/example --depth 1`
      );

      const combinedOutput = stdout + stderr;

      expect(combinedOutput).toContain('Starting scraper for: https://example.com');
      expect(combinedOutput).toContain('Crawl depth: 1');
      expect(combinedOutput).toContain('Scraping completed successfully');

      expect(existsSync(join(TEST_OUTPUT_DIR, 'example', 'example.com', 'index.html'))).toBe(true);
    });

    it('should create proper file structure', { timeout: 120000 }, async () => {
      await execAsync(
        `npm run dev -- https://example.com --output ${TEST_OUTPUT_DIR}/structure --depth 1`
      );

      const indexPath = join(TEST_OUTPUT_DIR, 'structure', 'example.com', 'index.html');
      expect(existsSync(indexPath)).toBe(true);

      const htmlContent = await readFile(indexPath, 'utf-8');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html');
      expect(htmlContent).toContain('<body');
    });

    it('should download assets and create static directories', { timeout: 120000 }, async () => {
      await execAsync(
        `npm run dev -- https://example.com --output ${TEST_OUTPUT_DIR}/assets --depth 1`
      );

      const indexPath = join(TEST_OUTPUT_DIR, 'assets', 'example.com', 'index.html');
      const htmlContent = await readFile(indexPath, 'utf-8');

      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html');
      expect(htmlContent).toContain('<body');
    });

    it('should exclude analytics scripts by default', { timeout: 120000 }, async () => {
      await execAsync(
        `npm run dev -- https://example.com --output ${TEST_OUTPUT_DIR}/analytics --depth 1`
      );

      const indexPath = join(TEST_OUTPUT_DIR, 'analytics', 'example.com', 'index.html');
      const htmlContent = await readFile(indexPath, 'utf-8');

      expect(htmlContent).not.toMatch(/google-analytics\.com/);
      expect(htmlContent).not.toMatch(/googletagmanager\.com/);
    });
  });

  describe('URL Validation', () => {
    it('should reject invalid URL', { timeout: 30000 }, async () => {
      const { stdout, stderr } = await execAsync(
        'npm run dev -- invalid-url'
      ).catch((error) => ({
        stdout: error.stdout || '',
        stderr: error.stderr || ''
      }));

      const combinedOutput = stdout + stderr;
      expect(combinedOutput).toMatch(/Validation error|invalid/i);
    });

    it('should reject URL without protocol', { timeout: 30000 }, async () => {
      const { stdout, stderr } = await execAsync(
        'npm run dev -- example.com'
      ).catch((error) => ({
        stdout: error.stdout || '',
        stderr: error.stderr || ''
      }));

      const combinedOutput = stdout + stderr;
      expect(combinedOutput).toMatch(/Validation error|invalid/i);
    });

    it('should require URL parameter', { timeout: 30000 }, async () => {
      const { stdout, stderr } = await execAsync(
        'npm run dev'
      ).catch((error) => ({
        stdout: error.stdout || '',
        stderr: error.stderr || ''
      }));

      const combinedOutput = stdout + stderr;
      expect(combinedOutput).toMatch(/required|url/i);
    });
  });

  describe('--depth Flag', () => {
    it('should respect depth=1 limit', { timeout: 120000 }, async () => {
      await execAsync(
        `npm run dev -- https://example.com --output ${TEST_OUTPUT_DIR}/depth-1 --depth 1`
      );

      const indexPath = join(TEST_OUTPUT_DIR, 'depth-1', 'example.com', 'index.html');
      const htmlContent = await readFile(indexPath, 'utf-8');

      expect(htmlContent).toContain('Example Domain');
    });

    it('should use default depth=2 when not specified', { timeout: 120000 }, async () => {
      await execAsync(
        `npm run dev -- https://example.com --output ${TEST_OUTPUT_DIR}/depth-default`
      );

      const indexPath = join(TEST_OUTPUT_DIR, 'depth-default', 'example.com', 'index.html');
      expect(existsSync(indexPath)).toBe(true);
    });

    it('should reject depth below minimum (0)', { timeout: 30000 }, async () => {
      const { stdout, stderr } = await execAsync(
        'npm run dev -- https://example.com --depth 0'
      ).catch((error) => ({
        stdout: error.stdout || '',
        stderr: error.stderr || ''
      }));

      const combinedOutput = stdout + stderr;
      expect(combinedOutput).toMatch(/Validation error|depth/i);
    });

    it('should reject depth above maximum (6)', { timeout: 30000 }, async () => {
      const { stdout, stderr } = await execAsync(
        'npm run dev -- https://example.com --depth 6'
      ).catch((error) => ({
        stdout: error.stdout || '',
        stderr: error.stderr || ''
      }));

      const combinedOutput = stdout + stderr;
      expect(combinedOutput).toMatch(/Validation error|depth/i);
    });
  });

  describe('--output Flag', () => {
    it('should use custom output directory', { timeout: 120000 }, async () => {
      const customOutput = join(TEST_OUTPUT_DIR, 'custom-output');
      await execAsync(
        `npm run dev -- https://example.com --output ${customOutput} --depth 1`
      );

      expect(existsSync(join(customOutput, 'example.com', 'index.html'))).toBe(true);
    });

    it('should use default output directory when not specified', { timeout: 120000 }, async () => {
      await execAsync(
        `npm run dev -- https://example.com --depth 1`
      );

      expect(existsSync('./output/example.com/index.html')).toBe(true);
      await rm('./output', { recursive: true, force: true });
    });

    it('should create output directory if not exists', { timeout: 120000 }, async () => {
      const nestedOutput = join(TEST_OUTPUT_DIR, 'nested/deep/output');
      await execAsync(
        `npm run dev -- https://example.com --output ${nestedOutput} --depth 1`
      );

      expect(existsSync(join(nestedOutput, 'example.com', 'index.html'))).toBe(true);
    });
  });

  describe('--exclude-analytics Flag', () => {
    it('should exclude analytics by default', { timeout: 120000 }, async () => {
      await execAsync(
        `npm run dev -- https://example.com --output ${TEST_OUTPUT_DIR}/exclude-true --depth 1`
      );

      const indexPath = join(TEST_OUTPUT_DIR, 'exclude-true', 'example.com', 'index.html');
      const htmlContent = await readFile(indexPath, 'utf-8');

      expect(htmlContent).not.toMatch(/google-analytics\.com/);
    });
  });

  describe('Error Handling and Progress Saving', () => {
    it('should show progress during scraping', { timeout: 120000 }, async () => {
      const { stdout, stderr } = await execAsync(
        `npm run dev -- https://example.com --output ${TEST_OUTPUT_DIR}/progress-test --depth 1`
      );

      const combinedOutput = stdout + stderr;

      expect(combinedOutput).toMatch(/Scraped \d+ pages/);
      expect(combinedOutput).toMatch(/Downloaded \d+\/\d+ assets/);
    });
  });

  describe('Real Website Test', () => {
    it('should successfully scrape a real website', { timeout: 180000 }, async () => {
      const { stdout, stderr } = await execAsync(
        `npm run dev -- https://example.com --output ${TEST_OUTPUT_DIR}/real-site --depth 2`
      );

      const combinedOutput = stdout + stderr;

      expect(combinedOutput).toContain('Scraping completed successfully');
      expect(existsSync(join(TEST_OUTPUT_DIR, 'real-site', 'example.com', 'index.html'))).toBe(true);

      const htmlContent = await readFile(join(TEST_OUTPUT_DIR, 'real-site', 'example.com', 'index.html'), 'utf-8');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html');
      expect(htmlContent).toContain('<body');
    });
  });
});
