# PlayScrapper

CLI utility for cloning and scraping websites with Playwright. A powerful, modular web scraping tool with intelligent asset extraction, deduplication, and streaming support.

## Описание

PlayScrapper — это мощный инструмент для клонирования веб-сайтов с сохранением структуры, ресурсов и контента. Проект использует Playwright для браузерной автоматизации, BFS алгоритм для обхода страниц, и поддерживает многоуровневое сканирование с configurable глубины.

## Возможности

- **Multi-level scraping**: Обход сайта с configurable глубиной (1-5 уровней)
- **Asset downloading**: Автоматическое скачивание CSS, JS, изображений и шрифтов
- **HTML processing**: Переписывание ссылок на относительные, удаление аналитики
- **Form mocking**: Отключение форм для безопасного просмотра
- **Progress tracking**: Сохранение прогресса и логирование ошибок
- **Same-origin constraint**: Обход только в рамках одного домена
- **V2 Architecture**: Deduplication-first, fast-path priority, streaming API

## Установка

```bash
# Клонирование репозитория
git clone https://github.com/VoyagerVPN/PlayScrapper.git
cd PlayScrapper

# Установка зависимостей
npm install

# Сборка проекта
npm run build
```

## Требования

- Node.js 25.6.0+
- npm (comes with Node.js)

## Использование

### Базовое использование

```bash
# Сканирование сайта с дефолтными настройками (depth: 1, output: ./output)
npx tsx src/cli.ts https://example.com

# Или после сборки
npx playscrapper https://example.com
```

### CLI флаги

| Флаг | Короткая форма | Описание | По умолчанию |
|------|----------------|----------|--------------|
| `<url>` | — | Целевой URL для сканирования (positional) | *required* |
| `--depth <number>` | `-d` | Максимальная глубина сканирования (1-5) | 1 |
| `--output <string>` | `-o` | Директория для сохранения результатов | ./output |
| `--verbose` | `-v` | Включить детальное логирование | false |

### Примеры

```bash
# Глубокое сканирование (5 уровней)
npx tsx src/cli.ts https://example.com --depth 5

# Кастомная директория вывода
npx tsx src/cli.ts https://example.com --output ./my-site

# С детальным логированием
npx tsx src/cli.ts https://example.com --verbose

# После сборки проекта
npm run build
npx playscrapper https://example.com --depth 2 --verbose
```

## Структура проекта

```
PlayScrapper/
├── src/                          # Исходный код
│   ├── browser.ts                # Playwright браузерная автоматизация
│   ├── crawler.ts                # BFS обход сайта
│   ├── downloader.ts             # Скачивание ресурсов
│   ├── processor.ts              # HTML пост-процессинг
│   ├── file-organizer.ts         # Организация файлов
│   ├── config.ts                 # Zod валидация конфигурации
│   ├── types.ts                  # TypeScript интерфейсы
│   ├── constants.ts              # Константы проекта
│   ├── logger.ts                 # Логирование
│   ├── error-handler.ts          # Обработка ошибок
│   ├── cli.ts                    # CLI интерфейс
│   ├── css-parser.ts             # Парсер CSS для извлечения URL
│   ├── circuit-breaker.ts        # Circuit Breaker для rate limiting
│   ├── registry.ts               # AssetRegistry для дедупликации
│   ├── extractor-manager.ts      # Менеджер экстракторов (V2)
│   ├── utils/
│   │   ├── url.ts                # URL утилиты
│   │   └── fs.ts                 # Файловые утилиты
│   └── *.test.ts                 # Unit тесты для каждого модуля
├── e2e/                          # E2E тесты
│   └── cli.test.ts               # E2E тесты CLI
├── test-pages/                   # Тестовые страницы
│   └── edge-cases.html           # Страница для edge case тестов
├── docs/                         # Документация
│   ├── ARCHITECTURE.md           # Детальное описание архитектуры
│   ├── PRD.md                    # Product Requirements Document
│   ├── ROADMAP.md                # Roadmap развития проекта
│   ├── ROADMAP2.md               # V2 Architecture Roadmap
│   ├── architecture-uml.md       # UML диаграммы архитектуры
│   ├── test-coverage-uml.md      # UML диаграммы покрытия тестов
│   └── knip.config.md            # Конфигурация knip
├── .trae/                        # Trae IDE правила
│   └── rules/
│       ├── architecture.md       # Правила архитектуры
│       ├── code-style.md         # Правила стиля кода
│       ├── documentation.md      # Правила документации
│       └── testing.md            # Правила тестирования
├── dist/                         # Скомпилированные файлы (gitignored)
├── node_modules/                 # Зависимости (gitignored)
├── package.json                  # Конфигурация проекта
├── tsconfig.json                 # TypeScript конфигурация
├── vitest.config.ts              # Vitest конфигурация
├── .eslintrc.json                # ESLint конфигурация
├── knip.json                     # Knip конфигурация
├── .gitignore                    # Git ignore правила
└── README.md                     # Этот файл
```

## За что отвечает каждый модуль

### Core Modules

| Модуль | Ответственность | Зависимости |
|--------|----------------|-------------|
| **browser.ts** | Запуск Playwright браузера, скрапинг HTML | Playwright |
| **crawler.ts** | BFS обход сайта, сбор URL для обработки | browser.ts, types.ts |
| **downloader.ts** | Скачивание ресурсов с retry логикой | logger.ts, error-handler.ts |
| **processor.ts** | Пост-процессинг HTML (rewrite URLs, remove analytics) | Cheerio, types.ts |
| **file-organizer.ts** | Организация файлов, mapping URLs to paths | fs.ts, url.ts |
| **config.ts** | Валидация конфигурации CLI | Zod, types.ts |
| **logger.ts** | Логирование (info, error, warn) | types.ts |
| **error-handler.ts** | Обработка ошибок с retry и progress saving | logger.ts, fs.ts |
| **cli.ts** | CLI интерфейс, парсинг аргументов | Commander, все core модули |

### V2 Architecture Modules

| Модуль | Ответственность | Зависимости |
|--------|----------------|-------------|
| **css-parser.ts** | Парсинг CSS и извлечение URL из @import, url() | Cheerio, types.ts |
| **circuit-breaker.ts** | Circuit Breaker для rate limiting при массовых 429/403 | types.ts |
| **registry.ts** | AssetRegistry - дедупликация URL (Set нормализованных URL) | async-mutex, types.ts |
| **extractor-manager.ts** | Менеджер экстракторов с priority sorting | types.ts |

### Utils

| Модуль | Ответственность |
|--------|----------------|
| **url.ts** | URL нормализация, валидация, разрешение |
| **fs.ts** | Файловые операции (создание директорий, запись) |

## Стек технологий

### Основные зависимости
- **Playwright 1.58.2**: Браузерная автоматизация для сканирования страниц
- **Commander 14.0.3**: CLI интерфейс с парсингом аргументов
- **Zod 4.3.6**: Валидация конфигурации и типов
- **Cheerio 1.2.0**: HTML пост-процессинг и манипуляции с DOM
- **async-mutex 0.5.0**: Мьютексы для thread-safe операций

### Инструменты разработки
- **TypeScript 5.9.3**: Строгая типизация (strict mode)
- **Vitest 4.0.18**: Unit и integration тесты
- **ESLint 8.57.1**: Линтинг кода
- **Knip 5.83.1**: Детекция мертвого кода
- **tsx 4.21.0**: TypeScript execution

## V2 Architecture Principles

### 1. Deduplication-First
Все экстракторы пишут в центральный `AssetRegistry` (singleton с Set нормализованных URL). Дедупликация происходит ДО валидации и скачивания.

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

### 4. Streaming API
Результаты возвращаются через `AsyncIterable<Asset>` для поддержки страниц с 1000+ изображений без переполнения памяти.

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

## Performance Budgets

| Тип сайта | Target Time | Path |
|-----------|-------------|------|
| **Статический блог** | <500ms | Fast (Cheerio) |
| **SSR E-commerce** | <2s | Fast → Deep |
| **SPA E-commerce** | <8s | Deep (Playwright) |
| **Landing Page** | <1s | Fast + CSS |

## Тестирование

### Запуск тестов

```bash
# Все тесты
npm test

# Тесты с UI
npm run test:ui

# Покрытие кода
npm run test:coverage
```

### Метрики тестирования

- **Unit тесты**: Config, Logger, ErrorHandler, File Organizer, Crawler, Circuit Breaker, Registry, Extractor Manager
- **Integration тесты**: Browser, Downloader, HTML Processor
- **E2E тесты**: CLI интерфейс
- **Общее покрытие**: 90.72%
- **Всего тестов**: 333+

## Команды разработки

```bash
# Сборка
npm run build

# Linting
npm run lint

# Type checking
npm run typecheck

# Dead code detection
npm run knip

# Запуск CLI в режиме разработки
npm run dev
```

## Roadmap

### Выполненные фазы (8/8)

- ✅ **Фаза 0**: Setup & Validation
- ✅ **Фаза 1**: Core Types & Validation
- ✅ **Фаза 2**: Playwright Integration
- ✅ **Фаза 3**: BFS Crawler
- ✅ **Фаза 4**: Asset Downloader
- ✅ **Фаза 5**: HTML Post-Processor
- ✅ **Фаза 6**: File Organization
- ✅ **Фаза 7**: Error Handling & Logging
- ✅ **Фаза 8**: Integration & CLI Polish

Подробная информация о каждой фазе доступна в [docs/ROADMAP.md](docs/ROADMAP.md)

### V2 Architecture (In Progress)

- ⏳ **V2 Phase 1**: Circuit Breaker & Registry
- ⏳ **V2 Phase 2**: Extractor Manager
- ⏳ **V2 Phase 3**: CSS Parser
- ⏳ **V2 Phase 4**: Deep Path Integration

Подробная информация в [docs/ROADMAP2.md](docs/ROADMAP2.md)

## Архитектурные принципы

### SOLID Principles

- **Single Responsibility**: Каждый модуль имеет одну четкую ответственность
- **Open/Closed**: Интерфейсы позволяют расширение без изменения
- **Liskov Substitution**: Все реализации интерфейсов взаимозаменяемы
- **Interface Segregation**: Интерфейсы минимальны и сфокусированы
- **Dependency Inversion**: Модули зависят от абстракций (интерфейсов)

### DRY Principle

- Централизованные утилиты (URL нормализация, файловые операции)
- Reuse логики через интерфейсы
- Eliminated duplicate code patterns

### Code Style

- Strict TypeScript (без any типов)
- JSDoc для public API
- Комментарии "Why", не "What"
- Ошибка handling с retry логикой

## Ограничения

- Максимальная глубина сканирования: 5 уровней
- Same-origin constraint (обход только в рамках одного домена)
- Поддержка только статических ресурсов (CSS, JS, изображения, шрифты)

## Лицензия

MIT License

## Автор

VoyagerVPN

## Contributing

Для разработки и тестирования следуйте правилам в `.trae/rules/`:
- Architecture rules: границы модулей, naming conventions
- Code style rules: TypeScript strict, error handling
- Testing rules: тестируемость, проверка перед коммитом

## Repository

https://github.com/VoyagerVPN/PlayScrapper
