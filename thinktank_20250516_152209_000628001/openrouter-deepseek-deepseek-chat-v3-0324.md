```
## Chosen Approach
Mock only Chrome APIs while testing service worker handlers with real internal modules (cache.ts, api.ts) to respect testing philosophy and achieve >80% coverage.

## Rationale
- Aligns with strict mocking policy by only mocking external Chrome APIs (runtime, alarms)
- Tests internal modules' real interactions, increasing confidence in integration
- Achieves required coverage by testing all event handlers and their error scenarios
- Maintains simplicity by focusing on public API (event handlers) without complex mocks
- Follows FIRST principles with fast, isolated, repeatable tests that verify behavior

## Build Steps
1. Create test file structure mirroring source with dedicated handler test suites
2. Set up Chrome API mocks using jest.mock for chrome.runtime and chrome.alarms
3. Write test cases for each handler (install, fetch, message, alarm):
   - Happy paths verifying correct cache/api calls
   - Error scenarios testing recovery behavior
   - Edge cases (empty messages, failed requests)
4. Add coverage tracking with thresholds in jest config
5. Refactor handlers if needed to improve testability:
   - Extract pure logic from side effects
   - Explicitly pass dependencies
6. Verify coverage meets >80% target with detailed report
```