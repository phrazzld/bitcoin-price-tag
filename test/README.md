# Bitcoin Price Tag Extension - Testing

## Test Runner Setup

This project uses [Vitest](https://vitest.dev/) as the test runner.

### Available Commands

- `pnpm test` - Run tests in watch mode
- `pnpm test:ui` - Run tests with interactive UI
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test -- --run` - Run tests once without watch mode

### Test Structure

- Tests are located alongside source files with `.test.ts` or `.spec.ts` extensions
- The `test/setup.ts` file provides Chrome API mocks for testing
- The `vitest.config.ts` file configures the test environment

### Writing Tests

Example test structure:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from './myModule';

describe('myModule', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expectedValue);
  });
});
```

### Mocking Chrome APIs

Chrome APIs are mocked globally in `test/setup.ts`. You can access them in tests:

```typescript
it('should call chrome.runtime.sendMessage', () => {
  myFunction();
  expect(chrome.runtime.sendMessage).toHaveBeenCalled();
});
```

### Test Environment

Tests run in a browser-like environment using `happy-dom`. This provides:
- DOM APIs
- Window object
- Document object
- Other browser globals

### Coverage Reports

Run `pnpm test:coverage` to generate coverage reports. Reports are generated in:
- Terminal (text format)
- `coverage/` directory (HTML format)

### Best Practices

1. Write tests alongside the code they test
2. Use descriptive test names
3. Follow the AAA pattern: Arrange, Act, Assert
4. Mock external dependencies (Chrome APIs, network calls)
5. Don't mock internal modules
6. Aim for high coverage but focus on meaningful tests