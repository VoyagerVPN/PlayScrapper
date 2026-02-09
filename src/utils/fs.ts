import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';

export async function ensureDir(path: string): Promise<void> {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}
