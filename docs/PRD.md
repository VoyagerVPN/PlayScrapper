# Website Cloner & Scraper — PRD for AI Implementation

## 1. Executive Summary
CLI-утилита для полного клонирования frontend сайтов (HTML/CSS/JS/Assets) с сохранением визуальной и функциональной идентичности. 
Использует Playwright для рендера SPA, поддерживает глубину обхода 5 уровней, удаляет аналитику.

## 2. Core Requirements

### 2.1 Functional Requirements
- [ ] CLI-интерфейс с валидацией через Zod
- [ ] Playwright-based скрапинг с ожиданием гидратации
- [ ] BFS-обход с глубиной до 5 уровней
- [ ] Same-origin политика (включая поддомены)
- [ ] Дедупликация ресурсов (URL → хеш)
- [ ] Нормализация путей в HTML/CSS
- [ ] Удаление аналитики (Google Analytics, Yandex, etc)
- [ ] Сохранение структуры папок как на скриншоте (Next.js-like)

### 2.2 Non-Functional Requirements
- TypeScript strict mode
- Knip для zero dead-code policy
- Последовательная обработка (без параллелизма для MVP)
- Node.js 18+ native FS API (без fs-extra)

## 3. Acceptance Criteria (Given/When/Then)

### Feature: Basic Scraping
**Given** пользователь запускает `scraper --url https://example.com`  
**When** сайт является SPA на React  
**Then** сохраненная страница содержит отрендеренный DOM после hydration  
**And** все ссылки работают локально

### Feature: Asset Downloading
**Given** страница содержит изображения в srcset  
**When** scraper обрабатывает страницу  
**Then** скачиваются все версии изображений  
**And** пути в HTML переписываются на локальные

### Feature: Analytics Removal
**Given** сайт содержит Google Analytics скрипт  
**When** scraper завершает работу  
**Then** GA скрипт отсутствует в итоговом HTML  
**And** cookie-баннеры сохраняются (UI элемент)

## 4. Constraints & Rules
- НЕ использовать p-queue (последовательная обработка)
- НЕ использовать fs-extra (native fs/promises)
- НЕ разворачивать Webpack/Vite bundles (сохранять как есть)
- Игнорировать robots.txt для полноценного фронтенда
- Minification сохранять как есть (не форматировать)