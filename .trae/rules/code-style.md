# Code Style Rules

## TypeScript Strict
- Всегда явно указывать возвращаемые типы функций
- Использовать `const` вместо `let` где возможно
- Избегать `as` type assertions (использовать guard functions)

## Error Handling
```typescript
// Правильно:
try {
  await operation();
} catch (error) {
  if (error instanceof Error) {
    logger.error(`Failed to scrape: ${error.message}`);
    throw new ScraperError(error.message, { url });
  }
  throw error;
}

// Неправильно:
try {
  await operation();
} catch (e) {
  console.log(e);
}
```

## Documentation
- JSDoc для всех public API
- Параметры функций документировать inline
- Комментарии "Why", не "What"