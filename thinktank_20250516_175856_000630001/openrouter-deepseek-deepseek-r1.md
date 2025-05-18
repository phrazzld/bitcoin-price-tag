```
## Chosen Approach
Mock Chrome APIs at runtime boundary, test message flows between actual service worker and content script handlers with state-controlled mocks.

## Rationale
- **Simplicity:** Uses Vitest's native mocking for Chrome APIs without complex setups
- **Separation:** Tests only public message interfaces, honoring no-internal-mocking policy
- **Coverage:** Directly exercises real handler logic against mocked external dependencies

## Build Steps
1. **Create test/integration/messaging.test.ts**
   - Mock chrome.runtime.sendMessage/onMessage
   - Mock chrome.storage.local and fetch API
   - Import actual SW and CS message handlers

2. **Implement core test scenarios:**
```typescript
// Example test case
test('CS gets cached price from SW', async () => {
  // Arrange
  const mockCache = { btcPrice: 50000 }
  chrome.storage.local.get.mockResolvedValue(mockCache)
  
  // Act (Simulate CS message)
  const response = await contentScript.sendPriceRequest()
  
  // Assert
  expect(response).toEqual({ data: 50000, fromCache: true })
  expect(chrome.storage.local.get).toBeCalledWith('btcPrice')
})
```

3. **Add bidirectional tests:**
   - CS -> SW price requests with cache hits/misses
   - SW -> CS push updates on price changes
   - API failure scenarios with error propagation
   - Concurrent message handling

4. **Configure coverage thresholds:**
```javascript
// vitest.config.js
export default {
  test: {
    coverage: {
      lines: 85,
      branches: 80,
      include: ['src/{service-worker,content-script}/**/*.ts']
    }
  }
}
```

5. **Implement test utilities:**
   - Reset mocks between tests
   - Shared state builders for cache/API scenarios
   - Type-safe message generators from src/common/types

6. **Document message flows:**
   - Add JSDoc diagrams showing test coverage paths
   - Annotate edge cases in test descriptions
```