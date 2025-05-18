```
## Chosen Approach
Integration tests verifying service worker ↔ content script messaging via Chrome API mocks, testing message flows and responses while maintaining strict boundary isolation.

## Rationale
- **Simplicity:** Directly tests the Chrome API boundary without complex internal mocks
- **Modularity:** Respects architectural separation between SW and CS components
- **Testability:** Focuses on observable behavior at the integration boundary
- **Coding Standards:** Uses only permitted Chrome API mocks, no internal module mocking
- **Docs Approach:** Tests serve as executable documentation of messaging protocol

## Build Steps
1. Create `tests/integration/messaging.test.ts` with Vitest setup
2. Implement Chrome API mocks for `runtime.sendMessage`/`onMessage`
3. Test bidirectional flows:
   - CS → SW price requests with mocked cache states
   - SW → CS push notifications
   - Error cases (timeouts, malformed messages)
4. Verify message formats against `src/common/types.ts`
5. Add coverage checks for message handlers (>80%)
6. Integrate with CI pipeline using test isolation flags
```