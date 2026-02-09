import { z } from 'zod';

const ConfigSchema = z.object({
  targetUrl: z.string().url(),
  depth: z.number().min(1).max(5).default(2),
  outputDir: z.string().default('./scraped'),
  verbose: z.boolean().default(false)
});

export type IConfig = z.infer<typeof ConfigSchema>;

export function parseConfig(input: unknown): IConfig {
  return ConfigSchema.parse(input);
}

export function safeParseConfig(input: unknown): z.ZodSafeParseResult<IConfig> {
  return ConfigSchema.safeParse(input);
}
