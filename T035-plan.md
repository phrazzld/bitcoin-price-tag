# T035 Plan: Add Structured Logging to Service Worker Modules

## Overview
Implement comprehensive structured logging in the service worker modules (index.ts, cache.ts, api.ts) using the Logger utility created in T034.

## Approach
- Integrate the Logger utility from T034 into all service worker modules
- Use child loggers for context propagation (especially correlation IDs)
- Refactor functions to accept Logger instances for explicit dependency injection
- Add structured logging at all key operation points

## Implementation Details

### 1. Create Base Loggers
Each module will have its own base logger:
- `service-worker:index`
- `service-worker:cache`
- `service-worker:api`

### 2. Refactor Functions for Logger Injection
Modify function signatures to accept Logger as first parameter:

**api.ts:**
- `fetchBtcPrice(logger: Logger, retryAttempt = 0): Promise<PriceData>`

**cache.ts:**
- `rehydrateCache(logger: Logger): Promise<void>`
- `getCachedPrice(logger: Logger, ttlMs = DEFAULT_CACHE_TTL_MS): Promise<PriceData | null>`
- `setCachedPrice(logger: Logger, data: PriceData): Promise<void>`
- `clearCache(logger: Logger): Promise<void>`

### 3. Logging Points for index.ts

**handleInstalled:**
- Entry: "Extension installed/updated"
- Alarm creation attempt/success/failure
- Exit: "handleInstalled completed"

**handleStartup:**
- Entry: "Service worker starting up"
- Cache rehydration process
- Exit: "handleStartup completed"

**handleAlarm:**
- Entry: "Alarm fired"
- Price refresh processing
- Success/failure of fetch and cache operations
- Exit: "handleAlarm completed"

**handleMessage:**
- Entry: "Message received"
- Message type identification
- Price request processing delegation
- Unknown message warnings

**handlePriceRequest:**
- Entry: "Processing price request"
- Cache hit/miss
- API fetch when needed
- Response sent
- Error handling

### 4. Logging Points for cache.ts

For each function:
- Entry with parameters
- Cache operations (read/write)
- Cache hit/miss status
- Validation results
- Storage API interactions
- Success/failure outcomes
- Exit

### 5. Logging Points for api.ts

**fetchBtcPrice:**
- Entry with retry attempt count
- HTTP request initiation
- Response status
- JSON parsing
- Data validation
- Retry logic
- Network errors
- Exit with success or final failure

### 6. Log Levels
- **DEBUG**: Detailed diagnostic info, internal steps
- **INFO**: Routine operations, lifecycle events, successful operations
- **WARN**: Recoverable issues, unknown messages, retries
- **ERROR**: Unrecoverable failures, exceptions

### 7. Structured Context
All logs will include:
- `timestamp` (automatic)
- `level` (automatic)
- `module` (automatic)
- `correlationId` (via child logger)
- Operation-specific context (non-sensitive)

### 8. Correlation ID Strategy
- Use `requestId` from messages when available
- Generate new UUID for lifecycle events and alarms
- Propagate via child loggers

### 9. Security Considerations
- No API keys, tokens, or secrets
- No PII or sensitive business data
- Only log necessary fields from data objects
- Be careful with error stack traces

## Testing Strategy

### Manual Testing
1. Load extension in Chrome
2. Open service worker console
3. Trigger various events:
   - Extension installation
   - Browser startup
   - Alarm triggers
   - Message exchanges
   - API errors
4. Verify JSON structure and content

### Unit Testing
- Mock Logger instances in tests
- Assert correct log methods are called
- Verify message content and context
- Test error scenarios

## Implementation Order
1. Refactor function signatures to accept Logger
2. Add base logger creation in each module
3. Implement logging in index.ts (most complex)
4. Implement logging in cache.ts
5. Implement logging in api.ts
6. Update all unit tests
7. Manual testing and verification

## Success Criteria
- All key operations are logged
- Logs are structured JSON
- Correlation IDs track request flow
- No sensitive data exposed
- Tests pass with logger mocks
- Manual testing shows clear operation traces