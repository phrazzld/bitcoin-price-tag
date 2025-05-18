```
## Chosen Approach
Refactor handlers for dependency injection and test with real internal modules against mocked Chrome APIs, ensuring strict boundary isolation.

## Rationale
- **Adheres to Testing Philosophy**: Mocks only Chrome APIs (external), uses real `cache.ts`/`api.ts` per "no internal mocking" rule.
- **Improves Testability**: Dependency injection allows validation of correct collaborator calls without violating encapsulation.
- **Ensures Coverage**: Focused tests on handler routing logic and error cases hit >80% coverage via scenario verification.

## Build Steps
1. **Refactor Handlers for DI**
   - Export handler functions that accept `deps: { cache, api, chrome }`
   - Convert top-level event listeners to use injected dependencies

2. **Setup Chrome API Mocks**
   - Use `sinon-chrome` to mock `chrome.runtime.onMessage`, `chrome.alarms.onAlarm`
   - Stub `chrome.storage` APIs used by cache

3. **Write Test Suite**
   ```typescript
   describe('Service Worker Handlers', () => {
     let mockChrome: typeof chrome;
     let cache: Cache;
     let api: API;

     beforeEach(() => {
       mockChrome = sinon.chrome;
       cache = new Cache(mockChrome.storage);
       api = new API(mockChrome.runtime);
     });

     test('CACHE_REQUEST message triggers cache.update()', async () => {
       const handler = createMessageHandler({ cache, api, chrome: mockChrome });
       await handler({ type: 'CACHE_REQUEST' });

       assert(cache.update.calledWith(mockChrome.storage));
     });

     test('SYNC_ALARM triggers api.sync()', async () => {
       const handler = createAlarmHandler({ api, chrome: mockChrome });
       await handler({ name: 'SYNC_ALARM' });

       assert(api.sync.calledOnce);
     });
   });
   ```

4. **Add Error Case Coverage**
   - Test unhandled message types throw errors
   - Verify alarm failures log via chrome.apis

5. **Integrate Coverage Checks**
   - Configure Jest/Istanbul to enforce >80%
   - Add CI step with `--coverage --threshold` flags
```