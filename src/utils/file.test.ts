import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { ensureDir } from './index.js';

vi.mock('fs');
vi.mock('fs/promises');

describe('ensureDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create directory if not exists', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(mkdir).mockResolvedValue(undefined);

    await ensureDir('./test-output/css/style.css');
    expect(mkdir).toHaveBeenCalledWith('./test-output/css', { recursive: true });
  });

  it('should skip directory creation if exists', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    await ensureDir('./test-output/css/style.css');
    expect(mkdir).not.toHaveBeenCalled();
  });

  it('should handle nested paths', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(mkdir).mockResolvedValue(undefined);

    await ensureDir('./test-output/images/avatars/large/photo.png');
    expect(mkdir).toHaveBeenCalledWith('./test-output/images/avatars/large', { recursive: true });
  });
});

describe('ensureDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create directory if not exists', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(mkdir).mockResolvedValue(undefined);

    await ensureDir('./test-output/css/style.css');
    expect(mkdir).toHaveBeenCalledWith('./test-output/css', { recursive: true });
  });

  it('should skip directory creation if exists', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    await ensureDir('./test-output/css/style.css');
    expect(mkdir).not.toHaveBeenCalled();
  });

  it('should handle nested paths', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(mkdir).mockResolvedValue(undefined);

    await ensureDir('./test-output/images/avatars/large/photo.png');
    expect(mkdir).toHaveBeenCalledWith('./test-output/images/avatars/large', { recursive: true });
  });
});
