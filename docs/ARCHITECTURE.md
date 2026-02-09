# Архитектурная документация

## Принципы SOLID

### S — Single Responsibility Principle
Каждый модуль отвечает за одну задачу:

- `browser.ts`: Только управление Playwright (launch/scrape/close)
- `crawler.ts`: Только логика обхода (BFS, same-origin check)
- `downloader.ts`: Только скачивание бинарных файлов
- `processor.ts`: Только манипуляции с HTML (Cheerio)
- `config.ts`: Только валидация и парсинг аргументов

**Нарушение**: Не смешивать логику обхода с сохранением файлов.

### O — Open/Closed Principle
Модули открыты для расширения, закрыты для модификации:

```typescript
// Плохо: if-else для каждого нового типа аналитики
function removeAnalytics($: CheerioAPI) {
  if (script.src.includes('google')) remove();
  if (script.src.includes('yandex')) remove(); // Добавляем сюда каждый раз
}

// Хорошо: массив паттернов, легко расширить
const ANALYTICS_PATTERNS = [/google-analytics/, /ym\.js/];
function removeAnalytics($: CheerioAPI, patterns = ANALYTICS_PATTERNS) {
  // Реализация
}
```

### L — Liskov Substitution Principle
Все стратегии обработки ресурсов взаимозаменяемы:

```typescript
interface AssetHandler {
  canHandle(url: string): boolean;
  process(content: Buffer): Promise<Buffer>;
}

class ImageHandler implements AssetHandler { ... }
class CssHandler implements AssetHandler { ... }
// Можно заменить одну реализацию другой без изменения Downloader
```

### I — Interface Segregation Principle
Разделение интерфейсов:

```typescript
// Плохо: один большой интерфейс
interface Scraper {
  scrape(url): Promise<void>;
  downloadAsset(url): Promise<void>;
  processHtml(html): string;
  saveToDisk(path): Promise<void>;
}

// Хорошо: разделенные интерфейсы
interface PageScraper {
  scrape(url): Promise<PageData>;
}

interface AssetDownloader {
  download(url): Promise<AssetData>;
}

interface FileWriter {
  write(path, content): Promise<void>;
}
```

### D — Dependency Inversion Principle
Зависимость от абстракций:

```typescript
// Плохо: прямая зависимость
class Crawler {
  private browser = new PlaywrightBrowser(); // Конкретная реализация
}

// Хорошо: инъекция зависимости
interface IBrowser {
  scrape(url: string): Promise<PageData>;
}

class Crawler {
  constructor(private browser: IBrowser) {}
}
// Можно заменить на PuppeteerBrowser или MockBrowser для тестов
```

## Принципы DRY

### 1. Утилиты для URL
```typescript
// src/utils/url.ts
export function normalizeUrl(url: string, base: string): string {
  return new URL(url, base).href;
}

export function isSameDomain(url: string, baseDomain: string): boolean {
  const hostname = new URL(url).hostname;
  return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`);
}

export function urlToFilePath(url: string): string {
  const parsed = new URL(url);
  const path = parsed.pathname === '/' ? '/index' : parsed.pathname;
  return path.endsWith('.html') ? path : `${path}.html`;
}
```

### 2. Централизованная обработка ошибок
```typescript
// src/utils/error-handler.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await sleep(delay);
    return withRetry(fn, retries - 1, delay * 2);
  }
}
```

### 3. Константы
```typescript
// src/constants.ts
export const DEFAULT_CONFIG = {
  depth: 2,
  outputDir: './scraped',
  concurrency: 1, // Последовательно для MVP
  timeout: 30000,
} as const;

export const ANALYTICS_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'mc.yandex.ru',
  'yandex.ru/metrika',
  'facebook.com/tr',
] as const;
```

## Паттерны проектирования

### Strategy Pattern (Обработка ресурсов)
Разные типы ресурсов обрабатываются по-разному, но через единый интерфейс.

### Factory Method (Создание Browser)
```typescript
async function createBrowser(options?: LaunchOptions): Promise<IBrowser> {
  return new PlaywrightBrowser(await chromium.launch(options));
}
```

### Template Method (Pipeline обработки)
```typescript
abstract class ScrapingPipeline {
  async execute(url: string): Promise<void> {
    const page = await this.scrape(url);
    const assets = await this.extractAssets(page);
    await this.downloadAssets(assets);
    await this.processAndSave(page);
  }
  
  protected abstract scrape(url: string): Promise<PageData>;
  protected abstract extractAssets(page: PageData): Promise<Asset[]>;
  // ...
}
```

## Структура зависимостей
```
cli.ts → config.ts (validation)
  ↓
index.ts (orchestrator)
  ↓
crawler.ts → browser.ts (IBrowser)
  ↓
downloader.ts → file-writer.ts
  ↓
processor.ts (Cheerio)
```

## Anti-patterns (Запрещено)
1. **God Object**: Не создавать класс Scraper со всеми методами
2. **Copy-Paste**: Любое дублирование кода >2 раз выносить в utils
3. **Hardcoded paths**: Все пути конфигурируются
4. **Implicit dependencies**: Все зависимости явно передаются через конструктор