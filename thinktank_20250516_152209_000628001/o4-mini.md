## Chosen Approach  
Refactor `service-worker/index.ts` to export pure handler functions parameterized by a Chrome‐API interface, then in Jest tests use the real `cache.ts`/`api.ts` implementations and only mock the Chrome APIs to verify handler behaviors.

## Rationale  
- Simplicity – no internal mocks: tests exercise the real cache and API modules end-to-end.  
- Modularity – handlers accept a single Chrome adapter object, enforcing clear separation of concerns.  
- Testability – pure functions are trivial to invoke and assert against, requiring only external dependency fakes.  
- Coding Standards – follows DI, uses Jest/ts-jest, respects strict typing and no-`any`.  
- Documentation Approach – tests serve as executable documentation of each message and alarm scenario.

## Build Steps  
1. Refactor `service-worker/index.ts` to export:
   - `handleMessage(message: SWMessage, chromeApi: ChromeApi): Promise<void>`
   - `handleAlarm(alarm: chrome.alarms.Alarm, chromeApi: ChromeApi): Promise<void>`
   - A `ChromeApi` interface encapsulating `runtime.sendMessage`, `alarms.getAll` etc.
2. In production bootstrap, import handlers and call:
   ```
   import { handleMessage, handleAlarm, DefaultChromeApi } from './index'
   chrome.runtime.onMessage.addListener(msg => handleMessage(msg, DefaultChromeApi))
   chrome.alarms.onAlarm.addListener(alarm => handleAlarm(alarm, DefaultChromeApi))
   ```
3. Configure Jest + ts-jest:
   - Set `"testEnvironment": "node"`, define `global.chrome` stub from a fake `ChromeApi` implementation.
   - Provide spies (`jest.fn()`) on `chrome.runtime.sendMessage`, `chrome.alarms.getAll`, etc.
4. Write test suites for `handleMessage`:
   - Happy path: message `{ type: 'CLEAR_CACHE' }` → cache.clear() called.
   - Data fetch: `{ type: 'PRELOAD_DATA', payload: {...} }` → api.fetchData invoked, results stored in cache.
   - Unknown message type → no-op.
   - Error paths: simulate `api.fetchData` throwing and assert error handling/logging.
5. Write tests for `handleAlarm`:
   - Named alarm: `'refresh-cache'` → cache.refreshAll() called.
   - Other alarms → no-op.
6. Achieve and enforce >80% coverage:
   - Cover all branches in message and alarm handlers, including error catch blocks.
   - Add tests for edge cases (missing payload, empty alarm name).
7. Integrate coverage check in CI:
   - Add Jest coverage threshold config to fail if coverage < 80%.
   - Ensure pre-commit and CI run tests and coverage gating.