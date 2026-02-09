import { IAssetExtractor, PageContext, Asset } from './types';

class ExtractorManager {
  private extractors: IAssetExtractor[] = [];

  register(extractor: IAssetExtractor): void {
    this.extractors.push(extractor);
    this.extractors.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return 0;
    });
  }

  unregister(extractorName: string): void {
    this.extractors = this.extractors.filter(e => e.name !== extractorName);
  }

  async* extract(context: PageContext): AsyncIterable<Asset> {
    const seen = new Set<string>();

    for (const extractor of this.extractors) {
      const canHandle = await extractor.canHandle(context);
      
      if (!canHandle) {
        continue;
      }

      try {
        for await (const asset of extractor.extract(context)) {
          const key = `${asset.type}:${asset.url}`;
          
          if (seen.has(key)) {
            continue;
          }

          seen.add(key);
          yield asset;
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Extractor ${extractor.name} failed: ${error.message}`);
        }
      }
    }
  }

  getRegisteredExtractors(): string[] {
    return this.extractors.map(e => e.name);
  }

  clear(): void {
    this.extractors = [];
  }
}

export { ExtractorManager };
export const extractorManager = new ExtractorManager();
