# ROADMAP2: Универсальный Image Scraper v2.0
**Статус**: Production Ready  
**Архитектура**: Hybrid (Cheerio Fast Path → Playwright Deep Path)  
**Целевое покрытие**: ≥95% видимых изображений на e-commerce/лендингах  
**API**: AsyncIterable (Streaming) + Promise (Batch)

## Архитектурные принципы

### 1. Deduplication-First
Все экстракторы пишут в центральный `AssetRegistry` (singleton с Set нормализованных URL). Дедупликация происходит ДО валидации и скачивания.

### 2. Fast-Path Priority
80% статических сайтов обрабатываются за <500ms без запуска браузера. Playwright — только при детекции SPA или недостатке ассетов.

### 3. Circuit Breaker Pattern
При массовых 429/403 от CDN автоматическое переключение на "тихий режим" (без HEAD-валидации).

### 4. Streaming API
Результаты возвращаются через `AsyncIterable<Asset>` для поддержки страниц с 1000+ изображениями без переполнения памяти.

## Компонентная архитектура

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

## Фазы реализации

### Фаза 0: Core Infrastructure (4–5 часов) — CRITICAL

**Цель**: Базовая инфраструктура, определяющая все последующие архитектурные решения.

#### Задачи:
1. **AssetRegistry** — центральный реестр ассетов:
   ```typescript
   class AssetRegistry {
     private seen = new Set<string>();
     
     normalize(url: string, base: string): string {
       const parsed = new URL(url, base);
       parsed.hash = '';
       // Whitelist значимых query-параметров
       const whitelist = ['w', 'width', 'h', 'height', 'q', 'quality', 'format', 'fit'];
       const filtered = new URLSearchParams();
       for (const [key, val] of parsed.searchParams) {
         if (whitelist.includes(key)) filtered.set(key, val);
       }
       parsed.search = filtered.toString();
       return parsed.href;
     }
     
     add(url: string): boolean {
       if (this.seen.has(url)) return false;
       this.seen.add(url);
       return true;
     }
   }
   ```

2. **Streaming Interface** — базовый контракт:
   ```typescript
   interface IAssetExtractor {
     readonly name: string;
     readonly priority: number; // 0 = highest
     canHandle(context: PageContext): boolean | Promise<boolean>;
     extract(context: PageContext): AsyncIterable<Asset>;
   }
   ```

3. **Smart Router** — логика выбора Fast vs Deep path:
   ```typescript
   async function* scrape(url: string): AsyncIterable<Asset> {
     const html = await fetchHtml(url);
     const registry = new AssetRegistry();
     
     // Быстрая эвристика (без полного парсинга)
     const isSPA = detectSPAHeuristics(html); // см. ниже
     const hasLazyLoading = html.includes('loading="lazy"') || 
                           html.includes('data-src=');
     
     if (!isSPA && !hasLazyLoading) {
       // Fast Path: Cheerio
       yield* staticExtraction(html, url, registry);
       
       // Проверка достаточности результата
       if (registry.size >= 5) {
         return; // Успешно, браузер не нужен
       }
     }
     
     // Deep Path: Playwright Pipeline
     yield* playwrightExtraction(url, registry);
   }
   ```

4. **SPA Detection** (критично для эффективности):
   ```typescript
   function detectSPAHeuristics(html: string): boolean {
     const markers = [
       '__NEXT_DATA__',           // Next.js
       '__NUXT__',                // Nuxt
       'data-reactroot',          // React 16
       'id="__next"',             // Next.js App Router
       'id="app" data-server-rendered', // Vue SSR
       'window.__INITIAL_STATE__', // Redux/Vuex
       '_hydration',              // Remix
       'data-hydration',          // Generic marker
     ];
     return markers.some(m => html.includes(m));
   }
   ```

#### Приемка (Definition of Done):
```typescript
// Тест 1: Статический сайт — нет запуска Playwright
const spy = vi.spyOn(chromium, 'launch');
const assets = await collectAll(scrape('https://static-blog.com'));
expect(spy).not.toHaveBeenCalled();
expect(assets.length).toBeGreaterThan(3);

// Тест 2: Next.js сайт — запуск Playwright
const assets = await collectAll(scrape('https://next-shop.com'));
expect(spy).toHaveBeenCalledOnce();

// Тест 3: Дедупликация работает
const assets = await collectAll(scrape('https://duplicate-images.com'));
const urls = assets.map(a => a.url);
expect(new Set(urls).size).toBe(urls.length);
```

---

### Фаза 1: Fast Path — Static Extraction (3 часа) — MUST HAVE

**Цель**: Максимальное покрытие статических/SSR сайтов за <500ms.

#### Задачи:
1. **StaticCheerioExtractor**:
   - Селекторы с приоритетом:
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
   - Парсинг `srcset`: разбиение по запятым, извлечение URL (без density descriptors).
   - Inline styles: regex `/url\(["']?([^"')]+)["']?\)/g`.

2. **Data Attribute Whitelist** (только проверенные паттерны):
   ```typescript
   const ALLOWED_DATA_ATTRS = [
     'data-src', 'data-lazy-src', 'data-original', 
     'data-bg', 'data-background', 'data-url'
   ];
   // Всё остальное data-* игнорируется (безопасность + производительность)
   ```

3. **Base64 Filtering**:
   - Сохранять `data:image/svg+xml` (иконки).
   - Сохранять `data:image` если длина > 1000 chars (реальные изображения).
   - Игнорировать `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7` (1x1 tracking pixel).

#### Приемка:
```typescript
const start = performance.now();
const assets = await collectAll(scrape('https://mdn-blog.com'));
const duration = performance.now() - start;

expect(duration).toBeLessThan(500); // <500ms
expect(assets.some(a => a.type === 'IMG_SRCSET')).toBe(true);
expect(assets.filter(a => a.url.startsWith('data:')).length).toBeLessThan(3);
```

---

### Фаза 2: Deep Path — Playwright Core (4 часа) — MUST HAVE

**Цель**: Надежный scraping динамических сайтов.

#### Задачи:
1. **PlaywrightDOMExtractor**:
   - Ожидание стабилизации: `waitUntil: 'networkidle'` + `settleTime: 1000ms`.
   - Execution в контексте браузера:
     ```typescript
     const assets = await page.evaluate((selectors) => {
       const results = [];
       // Тот же набор селекторов, что и в Cheerio, 
       // но с computed styles для background-image
       document.querySelectorAll('*').forEach(el => {
         const style = window.getComputedStyle(el);
         const bg = style.backgroundImage;
         if (bg && bg !== 'none') {
           const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
           if (match) results.push({ url: match[1], type: 'COMPUTED_CSS' });
         }
       });
       return results;
     }, SELECTORS);
     ```

2. **Hydration Detection**:
   ```typescript
   // Ждем, пока не исчезнет SSR-marker или появится hydration-marker
   await page.waitForFunction(() => {
     return !document.querySelector('[data-server-rendered="true"]') ||
            window.__NEXT_DATA__ || 
            window.__NUXT__;
   }, { timeout: 10000 });
   ```

3. **Iframe Piercing** (опционально, если встречаются виджеты):
   ```typescript
   for (const frame of page.frames()) {
     try {
       const frameAssets = await frame.evaluate(extractFromDOM);
       // добавить в registry
     } catch (e) {
       // CORS iframe — skip
     }
   }
   ```

#### Приемка:
```typescript
const assets = await collectAll(scrape('https://react-ecommerce.com'));
expect(assets.filter(a => a.type === 'COMPUTED_CSS').length).toBeGreaterThan(0);
expect(assets.length).toBeGreaterThan(15); // React sites usually have many images
```

---

### Фаза 3: CSS Deep Extraction (3 часа) — SHOULD HAVE

**Цель**: Извлечь background-images из внешних CSS и CSS-in-JS.

#### Задачи:
1. **ExternalCSSExtractor**:
   - Получение списка CSS файлов: `document.querySelectorAll('link[rel="stylesheet"]')`.
   - Только same-origin (избегаем CORS ошибок).
   - Fetch через `page.evaluate(fetch)` или Axios с теми же cookies.
   - Парсинг `url()` через regex (не CSSOM из-за CORS).

2. **CSSInJSExtractor** (Next.js, Styled-components, Emotion):
   ```typescript
   const styleTags = await page.evaluate(() => {
     return Array.from(document.querySelectorAll('style[data-styled], style[data-emotion], style[data-linaria]'))
       .map(s => s.textContent);
   });
   
   // Парсинг в Node контексте (быстрее)
   for (const css of styleTags) {
     const matches = css.matchAll(/url\(["']?([^"')]+)["']?\)/g);
     // добавить в registry
   }
   ```

3. **CSS Variables Resolution** (1 уровень вложенности):
   ```typescript
   // Сбор :root переменных
   const vars = await page.evaluate(() => {
     const styles = getComputedStyle(document.documentElement);
     return {
       '--bg-image': styles.getPropertyValue('--bg-image'),
       // ... другие vars с url()
     };
   });
   
   // Замена var(--bg-image) в найденных правилах
   ```

#### Условие запуска:
```typescript
async canHandle(page: Page): Promise<boolean> {
  const hasCSSBackgrounds = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .some(el => {
        const bg = getComputedStyle(el).backgroundImage;
        return bg && bg !== 'none' && !bg.includes('data:');
      });
  });
  return hasCSSBackgrounds;
}
```

#### Приемка:
```typescript
const assets = await collectAll(scrape('https://landing-with-css-bg.com'));
const cssAssets = assets.filter(a => a.source.includes('css'));
expect(cssAssets.length).toBeGreaterThan(0);
```

---

### Фаза 4: Dynamic & Lazy Loading (3 часа) — SHOULD HAVE

**Цель**: Обработка lazy loading и infinite scroll.

#### Задачи:
1. **SmartScroll Trigger**:
   ```typescript
   async function triggerLazyLoading(page: Page): Promise<void> {
     let lastHeight = 0;
     let unchangedCount = 0;
     
     while (unchangedCount < 3) {
       await page.evaluate(() => window.scrollBy(0, window.innerHeight));
       await page.waitForTimeout(300);
       
       const currentHeight = await page.evaluate(() => document.body.scrollHeight);
       if (currentHeight === lastHeight) {
         unchangedCount++;
       } else {
         unchangedCount = 0;
         lastHeight = currentHeight;
       }
     }
     
     // Возврат наверх
     await page.evaluate(() => window.scrollTo(0, 0));
   }
   ```

2. **Lazy Attribute Forcer**:
   ```typescript
   await page.evaluate(() => {
     document.querySelectorAll('img[loading="lazy"]').forEach(img => {
       img.loading = 'eager';
       const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
       if (src) img.src = src;
     });
   });
   ```

3. **Mutation Polling** (вместо Observer):
   ```typescript
   // До и после scroll
   const before = await countImages(page);
   await triggerLazyLoading(page);
   await page.waitForTimeout(1000); // Debounce
   const after = await countImages(page);
   
   if (after > before) {
     // Повторная экстракция
     yield* domExtractor.extract(page);
   }
   ```

#### Приемка:
```typescript
const before = await countImagesInViewport(page);
await triggerLazyLoading(page);
const assets = await collectAll(scraper.extract(url));
expect(assets.length).toBeGreaterThan(before * 1.2); // +20% минимум
```

---

### Фаза 5: Validation & Circuit Breaker (2 часа) — MUST HAVE

**Цель**: Очистка результатов и защита от банов.

#### Задачи:
1. **Smart Validation Pipeline**:
   ```typescript
   async function* validateAssets(
     assets: AsyncIterable<Asset>, 
     options: { concurrency?: number; enableHead?: boolean } = {}
   ): AsyncIterable<Asset> {
     const limit = pLimit(options.concurrency || 5);
     let failCount = 0;
     let totalCount = 0;
     
     for await (const asset of assets) {
       totalCount++;
       
       // Circuit breaker: если >10 ошибок подряд — отключаем HEAD
       if (failCount > 10 && totalCount < failCount * 1.2) {
         yield { ...asset, validated: false, reason: 'circuit_open' };
         continue;
       }
       
       if (!options.enableHead) {
         yield { ...asset, validated: true, type: guessTypeFromUrl(asset.url) };
         continue;
       }
       
       try {
         const info = await limit(() => probeAsset(asset.url));
         if (info.size < 100) continue; // Skip tracking pixels
         yield { ...asset, ...info, validated: true };
       } catch (e) {
         failCount++;
         yield { ...asset, validated: false, error: e.message };
       }
     }
   }
   ```

2. **Type Guessing** (fallback):
   ```typescript
   function guessTypeFromUrl(url: string): string {
     const ext = path.extname(new URL(url).pathname).toLowerCase();
     const map: Record<string, string> = {
       '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
       '.png': 'image/png', '.webp': 'image/webp',
       '.gif': 'image/gif', '.svg': 'image/svg+xml',
       '.avif': 'image/avif'
     };
     return map[ext] || 'application/octet-stream';
   }
   ```

3. **Domain Blacklist** (аналитика/трекинг):
   ```typescript
   const TRACKING_DOMAINS = [
     'google-analytics.com', 'googletagmanager.com',
     'facebook.com/tr', 'mc.yandex.ru',
     'doubleclick.net', 'googleadservices.com'
   ];
   
   if (TRACKING_DOMAINS.some(d => asset.url.includes(d))) {
     return null; // Skip
   }
   ```

#### Приемка:
```typescript
// Тест Circuit Breaker
const assets = await collectAll(scrape('https://rate-limited-cdn.com'));
const circuitOpen = assets.filter(a => a.reason === 'circuit_open');
expect(circuitOpen.length).toBeGreaterThan(0);

// Тест фильтрации
const trackingAssets = assets.filter(a => a.url.includes('google-analytics'));
expect(trackingAssets.length).toBe(0);
```

---

### Фаза 6: Advanced SPA Handling (4 часа) — NICE TO HAVE

**Цель**: Поддержка сложных React/Vue приложений с client-side routing.

#### Задачи:
1. **Shadow DOM Piercing**:
   ```typescript
   const pierceShadowDOM = (element: Element): string[] => {
     const assets: string[] = [];
     // Рекурсивный обход shadow roots
     if (element.shadowRoot) {
       element.shadowRoot.querySelectorAll('img').forEach(img => {
         if (img.src) assets.push(img.src);
       });
     }
     element.querySelectorAll('*').forEach(child => {
       assets.push(...pierceShadowDOM(child));
     });
     return assets;
   };
   ```

2. **Route Preloading** (если нужно многостраничное сканирование):
   ```typescript
   // Находим все <Link> или <a> с client-side navigation
   const links = await page.evaluate(() => {
     return Array.from(document.querySelectorAll('a[href^="/"]'))
       .map(a => a.href)
       .filter((v, i, a) => a.indexOf(v) === i) // unique
       .slice(0, 10); // limit
   });
   ```

3. **Web Component Ready Detection**:
   ```typescript
   await page.waitForFunction(() => {
     return customElements.whenDefined('product-card');
   });
   ```

---

## Профили ресурсов (Reference)

| Тип сайта | Примеры | Путь | Среднее время | Покрытие |
|-----------|---------|------|---------------|----------|
| **Статический блог** | Medium, Ghost | Fast (Cheerio) | 200-400ms | 98% |
| **SSR E-commerce** | Shopify (темы), WooCommerce | Fast → Deep | 500ms-2s | 95% |
| **SPA E-commerce** | Next.js Commerce, Nuxt | Deep (Playwright) | 3-8s | 92% |
| **Landing Page** | Webflow, Tilda | Fast + CSS | 400ms-1s | 96% |
| **Web App** | Figma, Notion | Deep + Advanced | 5-10s | 85% |

---

## Checklist перед релизом

- [ ] **Memory Test**: Скрапинг страницы с 1000+ изображений не вызывает OOM (streaming работает)
- [ ] **Rate Limit Test**: При 429 от CDN включается Circuit Breaker (<1s простоя)
- [ ] **CORS Test**: Cross-origin CSS файлы не ломают процесс (skip gracefully)
- [ ] **Duplicate Test**: На странице с логотипом в header и footer URL дедуплицируется
- [ ] **SPA Test**: Next.js сайт отдает больше изображений через Deep Path чем через Fast Path
- [ ] **Static Test**: Статический сайт НЕ запускает Playwright (performance budget)

---

## Метрики успеха

| Метрика | Целевое значение | Как измерить |
|---------|------------------|--------------|
| **Fast Path Hit Rate** | >70% | Логирование выбора пути |
| **Average Time (Static)** | <500ms | Benchmark на 10 сайтах |
| **Coverage (E-commerce)** | >95% | Сравнение с ручным подсчетом в DevTools |
| **False Positives** | <2% | Ручная проверка 100 случайных URL |
| **Memory Usage** | <200MB | Профилирование на странице с 500 img |

---

## Примечания для AI-реализации (TRAE/GLM)

1. **Начинайте с Фазы 0**: Без Registry и Streaming API последующие фазы придется переписывать.
2. **SPA Detection критичен**: Это главный фильтр производительности. Не упрощайте до `html.includes('react')`.
3. **Cheerio и Playwright должны использовать одинаковые селекторы**: Вынесите `SELECTORS` в константы.
4. **Circuit Breaker обязателен**: Без него при массовом скрапинге вы получите IP-бан за 10 минут.
5. **AsyncIterable**: Используйте `yield*` для композиции экстракторов, это позволит обрабатывать 10k+ изображений.