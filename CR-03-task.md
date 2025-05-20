# Task ID: CR-03

## Title: Fix: Refactor tests to use mock Logger instead of console

## Original Ticket Text
**CR-03 · Fix · P0: Refactor tests to use mock Logger instead of console**
- **Context:** Tests in `src/service-worker/index.test.ts` mock the global `console` object instead of the project's `Logger` interface, violating the project's logging strategy.
- **Action:**
    1. Review and potentially refactor `src/shared/logger.ts` to support dependency injection or mock replacement in tests
    2. Update `src/service-worker/index.test.ts` to mock the `Logger` interface instead of `console`
    3. Ensure all tested code receives/uses instances of the mocked logger
    4. Replace all `vi.spyOn(console, ...)` calls with spies on the mock logger methods
- **Done‑when:**
    1. `console` is no longer mocked directly for logging tests
    2. Tests utilize a proper mock of the `Logger` interface
    3. Tests can access and assert the structured objects passed to the logger
- **Depends‑on:** none

## Implementation Approach Analysis Prompt
The task involves refactoring tests to properly mock the Logger interface instead of directly mocking console methods. This is a critical issue as it violates the project's logging strategy and may lead to ineffective log assertions.

I need to analyze:
1. How the Logger class is currently implemented in `src/shared/logger.ts`
2. How tests in `src/service-worker/index.test.ts` currently mock and assert console output
3. What changes are needed to properly mock the Logger interface
4. How this affects the existing test assertions and validation

The key challenges include:
- Ensuring the Logger class can be properly mocked in tests
- Modifying tests to use the mocked Logger instead of console
- Updating assertions to validate structured log objects instead of raw console output
- Maintaining test coverage while making these changes

I'll need to consider the testing framework being used (Vitest) and its mocking capabilities, as well as the impact on all existing tests.

Please analyze the specific approach to take, considering the existing code structure, logging patterns, and testing practices in the project.