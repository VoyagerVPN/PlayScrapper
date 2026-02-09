# Architecture Rules for TRAE Builder

## Границы модулей
1. Каждый файл в src/ должен экспортировать не более 3 публичных функций/классов
2. Запрещены циклические импорты (circular dependencies)
3. Утилиты должны быть чистыми функциями (no side effects)

## Naming Conventions
- Интерфейсы: `I` префикс (IBrowser, IConfig, IAssetExtractor)
- Типы: PascalCase (PageData, AssetType, Asset)
- Функции: camelCase (scrapePage, downloadAsset, normalize)
- Константы: UPPER_SNAKE_CASE в constants.ts

## Запрещенные практики
- Не использовать `any` (strict TypeScript)
- Не использовать `console.log` в модулях (только в cli.ts)
- Не использовать try-catch без обработки ошибок (не пустые catch)
- Не создавать классы без интерфейсов (Dependency Inversion)

## Обработка SPA:
- Использовать `waitUntil: 'networkidle'` для ожидания загрузки
- Для React/Vue ждать появления конкретного селектора, а не только события load
- Использовать `page.content()` для получения финального HTML после hydration

## V2 Architecture Principles (Universal Image Scraper)

### 1. Deduplication-First
Все экстракторы пишут в центральный `AssetRegistry` (singleton с Set нормализованных URL). Дедупликация происходит ДО валидации и скачивания.

```typescript
interface IAssetRegistry {
  normalize(url: string, base: string): string;
  add(url: string): boolean;
  has(url: string): boolean;
  size: number;
}
```

### 2. Fast-Path Priority
80% статических сайтов обрабатываются за <500ms без запуска браузера. Playwright — только при детекции SPA или недостатке ассетов.

**SPA Detection Heuristics**:
```typescript
const SPA_MARKERS = [
  '__NEXT_DATA__', '__NUXT__', 'data-reactroot',
  'id="__next"', 'id="app" data-server-rendered',
  'window.__INITIAL_STATE__', '_hydration', 'data-hydration',
];
```

### 3. Circuit Breaker Pattern
При массовых 429/403 от CDN автоматическое переключение на "тихий режим" (без HEAD-валидации).

```typescript
interface ICircuitBreaker {
  canProceed(): boolean;
  recordFailure(): void;
  recordSuccess(): void;
  reset(): void;
}
```

### 4. Streaming API
Результаты возвращаются через `AsyncIterable<Asset>` для поддержки страниц с 1000+ изображений без переполнения памяти.

```typescript
interface IAssetExtractor {
  readonly name: string;
  readonly priority: number;
  canHandle(context: PageContext): boolean | Promise<boolean>;
  extract(context: PageContext): AsyncIterable<Asset>;
}
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AssetRegistry (Singleton)                 │
│  • Нормализация URL (query whitelist, hash removal)         │
│  • Set<string> для O(1) дедупликации                        │
│  • Потокобезопасная запись (async mutex)                    │
└──────────────┬──────────────────────────────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
[Fast Path]      [Deep Path]
(Cheerio)        (Playwright)
       │               │
       ▼               ▼
[StaticExtractor] [DOMExtractor]
[HeuristicChecker][CSSExtractor] 
                  [DynamicExtractor]
                  [CSSInJSExtractor]
       │               │
       └───────┬───────┘
               ▼
      [ValidationPipeline]
      • Circuit Breaker
      • HEAD probing (rate limited)
      • Content-Type check
               │
               ▼
      [Output: AsyncIterable<Asset>]
```

## Extractor Interface Requirements

```typescript
interface PageContext {
  url: string;
  html?: string;
  page?: Page;
  registry: IAssetRegistry;
}

interface Asset {
  url: string;
  type: AssetType;
  source: string;
  validated?: boolean;
  size?: number;
  contentType?: string;
  error?: string;
  reason?: string;
}
```

## URL Normalization Rules

```typescript
function normalizeUrl(url: string, base: string): string {
  const parsed = new URL(url, base);
  parsed.hash = '';
  const whitelist = ['w', 'width', 'h', 'height', 'q', 'quality', 'format', 'fit'];
  const filtered = new URLSearchParams();
  for (const [key, val] of parsed.searchParams) {
    if (whitelist.includes(key)) filtered.set(key, val);
  }
  parsed.search = filtered.toString();
  return parsed.href;
}
```

## Tracking Domain Blacklist

```typescript
const TRACKING_DOMAINS = [
  'google-analytics.com', 'googletagmanager.com',
  'facebook.com/tr', 'mc.yandex.ru',
  'doubleclick.net', 'googleadservices.com',
  'statcounter.com', 'hotjar.com', 'segment.io'
];
```

## Selector Priority System

```typescript
const SELECTORS = [
  { sel: 'img[src]', attr: 'src', type: 'IMG', priority: 1 },
  { sel: 'img[srcset]', attr: 'srcset', type: 'IMG_SRCSET', priority: 1 },
  { sel: 'source[srcset]', attr: 'srcset', type: 'SOURCE', priority: 1 },
  { sel: 'img[data-src]', attr: 'data-src', type: 'IMG_LAZY', priority: 2 },
  { sel: 'img[data-original]', attr: 'data-original', type: 'IMG_LAZY', priority: 2 },
  { sel: '[style*="background-image"]', type: 'INLINE_CSS', priority: 3 },
  { sel: 'video[poster]', attr: 'poster', type: 'VIDEO_POSTER', priority: 2 },
  { sel: 'svg image', attr: 'href', type: 'SVG_IMAGE', priority: 2 },
];
```

## Data Attribute Whitelist

```typescript
const ALLOWED_DATA_ATTRS = [
  'data-src', 'data-lazy-src', 'data-original',
  'data-bg', 'data-background', 'data-url'
];
```

## Base64 Filtering Rules

- Сохранять `data:image/svg+xml` (иконки)
- Сохранять `data:image` если длина > 1000 chars (реальные изображения)
- Игнорировать `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7` (1x1 tracking pixel)

## Performance Budgets

| Тип сайта | Target Time | Path |
|-----------|-------------|------|
| **Статический блог** | <500ms | Fast (Cheerio) |
| **SSR E-commerce** | <2s | Fast → Deep |
| **SPA E-commerce** | <8s | Deep (Playwright) |
| **Landing Page** | <1s | Fast + CSS |

## Memory Requirements

- Скрапинг страницы с 1000+ изображений не должен вызывать OOM (streaming API)
- Максимальное использование памяти: <200MB при 500 изображениях

## Error Handling Strategy

1. **Graceful Degradation**: При ошибке экстрактора продолжать с другими
2. **Circuit Breaker**: Автоматическое переключение на "тихий режим" при массовых 429/403
3. **Logging**: Все ошибки логируются с URL и контекстом
4. **No Silent Failures**: Никаких пустых catch блоков
