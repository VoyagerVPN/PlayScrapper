## 4. knip.config.md — Конфигурация Knip

```json
{
  "$schema": "https://unpkg.com/knip@latest/schema.json",
  "entry": [
    "src/cli.ts",
    "src/index.ts"
  ],
  "project": [
    "src/**/*.ts"
  ],
  "ignore": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "src/types/**"
  ],
  "ignoreExportsUsedInFile": {
    "interface": true,
    "type": true
  },
  "includeEntryExports": false,
  "rules": {
    "unusedExports": "error",
    "unusedDependencies": "error",
    "unusedFiles": "error"
  }
}
```

**Правила использования:**
- Запускать `npx knip` после каждой фазы
- Не коммитить код с неиспользуемыми exports
- Использовать `@internal` JSDoc для тестовых экспортов:
  ```typescript
  /** @internal Exported for unit testing only */
  export function helper() { ... }
  ```