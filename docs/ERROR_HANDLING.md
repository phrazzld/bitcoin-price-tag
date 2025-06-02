# Error Handling Strategy

This document defines the comprehensive error handling strategy for the Bitcoin Price Tag Chrome extension. It establishes patterns, conventions, and best practices to ensure robust, maintainable, and debuggable error handling across all components.

## Table of Contents

- [Principles](#principles)
- [Error Classification](#error-classification)
- [Error Handling Patterns](#error-handling-patterns)
- [Chrome Extension Specific](#chrome-extension-specific)
- [Logging Requirements](#logging-requirements)
- [Standard Error Shapes](#standard-error-shapes)
- [Error Recovery Strategies](#error-recovery-strategies)
- [Testing Error Scenarios](#testing-error-scenarios)
- [Implementation Guidelines](#implementation-guidelines)

---

## Principles

### 1. Fail Fast, Fail Safe
- **Detect errors early** at system boundaries (API responses, user input, Chrome API calls)
- **Fail safely** without breaking core functionality - the extension should degrade gracefully
- **Provide clear error context** for debugging while protecting user experience

### 2. Error Boundaries and Isolation
- **Isolate failures**: One component's error should not break others
- **Define clear error boundaries** between modules and contexts
- **Use defensive programming** with comprehensive input validation

### 3. Observable and Debuggable
- **Structured error logging** with correlation IDs and sufficient context
- **Preserve error chains** to maintain root cause traceability
- **Log actionable information** that helps with debugging and monitoring

### 4. Consistency and Predictability
- **Standardized error types** with consistent shapes and error codes
- **Predictable error handling patterns** across similar operations
- **Uniform logging formats** for error analysis and aggregation

---

## Error Classification

### By Severity

#### **CRITICAL**
- Extension core functionality completely broken
- Security vulnerabilities or data corruption
- Chrome API failures preventing extension operation
- **Response**: Log at ERROR level, attempt recovery, notify user if needed

#### **HIGH** 
- Major feature unavailable (price annotation stopped)
- Service worker crashes or persistent failures
- Storage corruption or loss
- **Response**: Log at ERROR level, implement fallback, retry with backoff

#### **MEDIUM**
- Individual operation failures (single price annotation)
- Temporary API outages with retry potential
- Configuration or preference issues
- **Response**: Log at WARN level, implement graceful degradation

#### **LOW**
- Performance degradation or timeouts
- Non-critical feature limitations
- Cosmetic or UX issues
- **Response**: Log at INFO/DEBUG level, continue operation

### By Category

#### **Network/API Errors**
- Connection failures, timeouts, HTTP errors
- Invalid API responses or rate limiting
- Service unavailability or maintenance

#### **Data/Validation Errors**
- Malformed JSON or unexpected data structures
- Type validation failures
- Cache corruption or version mismatches

#### **Chrome Extension Errors**
- Chrome API failures or permission issues
- Storage quota exceeded or access denied
- Content script injection or communication failures

#### **DOM/UI Errors**
- Element not found or DOM manipulation failures
- Content Security Policy violations
- Cross-origin or iframe access restrictions

#### **Configuration/Environment Errors**
- Missing or invalid environment variables
- Unsupported browser versions
- Extension installation or update issues

---

## Error Handling Patterns

### Synchronous Error Handling

#### **Basic Try-Catch Pattern**
```typescript
function processUserInput(input: unknown): ProcessedData {
  try {
    const validatedInput = validateInput(input);
    return processValidatedData(validatedInput);
  } catch (error) {
    logger.error('Input processing failed', {
      inputType: typeof input,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new ValidationError('INVALID_INPUT', 'Failed to process user input', error);
  }
}
```

#### **Type Guard Validation Pattern**
```typescript
function isValidPriceData(data: unknown): data is PriceData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'satoshiRate' in data &&
    typeof data.satoshiRate === 'number' &&
    data.satoshiRate > 0
  );
}

function processPriceData(data: unknown): PriceData {
  if (!isValidPriceData(data)) {
    throw new ValidationError('INVALID_PRICE_DATA', 'Price data validation failed', {
      receivedType: typeof data,
      data: data
    });
  }
  return data;
}
```

### Asynchronous Error Handling

#### **Async/Await with Error Context**
```typescript
async function fetchPriceData(correlationId: string): Promise<PriceData> {
  try {
    logger.debug('Fetching price data', { correlationId });
    
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      timeout: API_TIMEOUT_MS
    });
    
    if (!response.ok) {
      throw new ApiError('HTTP_ERROR', `HTTP ${response.status}`, {
        statusCode: response.status,
        statusText: response.statusText,
        correlationId
      });
    }
    
    const data = await response.json();
    return processPriceData(data);
    
  } catch (error) {
    logger.error('Price data fetch failed', {
      correlationId,
      endpoint: API_ENDPOINT,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof ApiError) {
      throw error; // Re-throw with original context
    }
    
    throw new ApiError('NETWORK_ERROR', 'Failed to fetch price data', error);
  }
}
```

#### **Promise Chain Error Handling**
```typescript
function updatePriceDisplay(request: PriceRequest): Promise<void> {
  return validateRequest(request)
    .then(validRequest => fetchPriceData(validRequest.correlationId))
    .then(priceData => updateDOMWithPrice(priceData))
    .catch(error => {
      // Error context preserved through chain
      logger.error('Price display update failed', {
        correlationId: request.correlationId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Graceful degradation - don't break page
      return Promise.resolve();
    });
}
```

### Error Boundary Patterns

#### **Operation-Level Boundaries**
```typescript
function processNodeSafely(node: Node, priceData: PriceData): void {
  try {
    // Individual node processing - failure should not break batch
    walkNodes(node, priceData, processedNodes);
  } catch (error) {
    logger.warn('Individual node processing failed', {
      nodeName: node.nodeName,
      nodeType: node.nodeType,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Continue processing other nodes - don't propagate error
  }
}
```

#### **Module-Level Boundaries**
```typescript
async function initializeContentScript(): Promise<void> {
  try {
    const priceData = await requestPriceData();
    startDOMObserver(priceData);
    logger.info('Content script initialized successfully');
  } catch (error) {
    logger.error('Content script initialization failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Don't throw - graceful degradation allows page to function normally
    // Extension features unavailable but user experience preserved
  }
}
```

---

## Chrome Extension Specific

### Chrome API Error Handling

#### **Runtime Message Errors**
```typescript
function sendMessage<T>(
  message: ChromeMessage, 
  correlationId: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: unknown) => {
      // Always check chrome.runtime.lastError first
      if (chrome.runtime.lastError) {
        const error = new ChromeApiError(
          'RUNTIME_ERROR',
          chrome.runtime.lastError.message,
          { correlationId, message }
        );
        logger.error('Chrome runtime message error', {
          error: error.message,
          correlationId,
          messageType: message.type
        });
        reject(error);
        return;
      }
      
      // Validate response structure
      if (!isValidResponse(response)) {
        const error = new ValidationError(
          'INVALID_RESPONSE',
          'Invalid message response format',
          { correlationId, response }
        );
        reject(error);
        return;
      }
      
      resolve(response);
    });
  });
}
```

#### **Storage API Error Handling**
```typescript
async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const result = await chrome.storage.local.get(key);
    
    if (!(key in result)) {
      return null; // Not an error - cache miss
    }
    
    // Validate cached data integrity
    const cachedData = result[key];
    if (!isValidCacheEntry(cachedData)) {
      logger.warn('Invalid cache data found', {
        key,
        dataType: typeof cachedData
      });
      
      // Remove corrupted cache entry
      await chrome.storage.local.remove(key);
      return null;
    }
    
    return cachedData.data;
    
  } catch (error) {
    // Handle quota exceeded, permission denied, etc.
    const storageError = new StorageError('READ_ERROR', 'Cache read failed', {
      key,
      error: error instanceof Error ? error.message : String(error)
    });
    
    logger.error('Storage read error', {
      key,
      error: storageError.message,
      stack: storageError.stack
    });
    
    throw storageError;
  }
}
```

### Cross-Context Error Handling

#### **Service Worker ↔ Content Script Communication**
```typescript
// In service worker - handle content script errors
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    const correlationId = generateCorrelationId();
    
    if (!isValidMessage(message)) {
      const error = new ValidationError('INVALID_MESSAGE', 'Invalid message format');
      logger.warn('Invalid message received', {
        correlationId,
        messageType: typeof message,
        senderId: sender.tab?.id
      });
      
      sendResponse({
        success: false,
        error: {
          code: error.code,
          message: error.message
        },
        correlationId
      });
      return;
    }
    
    // Process message asynchronously
    handleMessage(message, correlationId)
      .then(result => {
        sendResponse({
          success: true,
          data: result,
          correlationId
        });
      })
      .catch(error => {
        logger.error('Message handling failed', {
          correlationId,
          messageType: message.type,
          error: error instanceof Error ? error.message : String(error)
        });
        
        sendResponse({
          success: false,
          error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message || 'Unknown error occurred'
          },
          correlationId
        });
      });
    
    return true; // Keep channel open for async response
    
  } catch (error) {
    logger.error('Message listener error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    sendResponse({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});
```

---

## Logging Requirements

### Error Log Structure

Every error log entry MUST include:

```typescript
interface ErrorLogEntry {
  readonly timestamp: string;           // ISO 8601 UTC timestamp
  readonly level: 'ERROR' | 'WARN';    // Log level
  readonly message: string;             // Human-readable error description
  readonly module: string;              // Module identifier (e.g., 'service-worker:api')
  readonly correlationId?: string;      // Request/operation correlation ID
  readonly errorDetails: {
    readonly type: string;              // Error constructor name
    readonly code?: string;             // Error code if available
    readonly message: string;           // Error message
    readonly stack?: string;            // Stack trace for debugging
  };
  readonly context?: {                  // Operation-specific context
    readonly operation?: string;        // Operation being performed
    readonly input?: any;               // Relevant input data (sanitized)
    readonly state?: any;               // Relevant state information
    readonly [key: string]: any;       // Additional context fields
  };
}
```

### Error Context Requirements

#### **Required Context for All Errors**
- **Operation name**: What was being attempted
- **Error type and message**: Error constructor and message
- **Correlation ID**: For request tracing (when available)
- **Module identifier**: Where the error occurred

#### **API Error Context**
```typescript
{
  operation: 'fetchPriceData',
  endpoint: 'https://api.coingecko.com/api/v3/simple/price',
  method: 'GET',
  statusCode: 429,
  responseHeaders: { 'retry-after': '60' },
  retryAttempt: 2,
  correlationId: 'req_abc123'
}
```

#### **DOM Error Context**
```typescript
{
  operation: 'processTextNode',
  nodeName: 'SPAN',
  nodeType: 3,
  parentElement: 'DIV.price-container',
  textContent: '$1,234.56 (truncated)',
  pageUrl: 'https://example-store.com/product/123'
}
```

#### **Storage Error Context**
```typescript
{
  operation: 'setCachedPrice',
  storageKey: 'btc_price_data',
  dataSize: 1024,
  quotaUsed: '85%',
  storageType: 'local'
}
```

### Sensitive Information Handling

#### **Never Log**
- User's browsing history or personal data
- Authentication tokens or API keys
- Complete DOM content or large data structures
- Chrome extension internal IDs

#### **Sanitize Before Logging**
```typescript
function sanitizeForLogging(data: any): any {
  if (typeof data === 'string' && data.length > 200) {
    return data.substring(0, 200) + '... (truncated)';
  }
  
  if (Array.isArray(data) && data.length > 5) {
    return [...data.slice(0, 5), `... (${data.length - 5} more items)`];
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    Object.keys(data).slice(0, 10).forEach(key => {
      sanitized[key] = sanitizeForLogging(data[key]);
    });
    return sanitized;
  }
  
  return data;
}
```

---

## Standard Error Shapes

### Base Error Interface

```typescript
/**
 * Base interface for all application errors
 * Provides consistent structure and required metadata
 */
interface BaseError extends Error {
  readonly name: string;                // Error constructor name
  readonly code: string;                // Unique error code for categorization
  readonly message: string;             // Human-readable error message
  readonly context?: Record<string, any>; // Additional error context
  readonly cause?: Error;               // Original error that caused this one
  readonly timestamp: string;           // ISO 8601 UTC timestamp when error occurred
  readonly correlationId?: string;      // Request correlation ID
}
```

### Specific Error Types

#### **API Errors**
```typescript
class ApiError extends Error implements BaseError {
  readonly name = 'ApiError';
  readonly code: ApiErrorCode;
  readonly statusCode?: number;
  readonly responseHeaders?: Record<string, string>;
  readonly context?: {
    readonly endpoint: string;
    readonly method: string;
    readonly retryAttempt?: number;
    readonly timeout?: number;
  };
  readonly cause?: Error;
  readonly timestamp: string;
  readonly correlationId?: string;

  constructor(
    code: ApiErrorCode,
    message: string,
    context?: ApiError['context'],
    cause?: Error
  ) {
    super(message);
    this.code = code;
    this.context = context;
    this.cause = cause;
    this.timestamp = new Date().toISOString();
  }
}

type ApiErrorCode = 
  | 'NETWORK_ERROR'     // Connection failures, DNS issues
  | 'TIMEOUT_ERROR'     // Request timeout exceeded  
  | 'HTTP_ERROR'        // 4xx/5xx HTTP status codes
  | 'INVALID_RESPONSE'  // Malformed or unexpected response
  | 'RATE_LIMITED'      // API rate limiting
  | 'UNAUTHORIZED'      // Authentication/authorization failures
  | 'SERVICE_UNAVAILABLE'; // API maintenance or outages
```

#### **Validation Errors**
```typescript
class ValidationError extends Error implements BaseError {
  readonly name = 'ValidationError';
  readonly code: ValidationErrorCode;
  readonly context?: {
    readonly field?: string;
    readonly expectedType?: string;
    readonly receivedType?: string;
    readonly value?: any;
    readonly constraints?: string[];
  };
  readonly cause?: Error;
  readonly timestamp: string;
  readonly correlationId?: string;

  constructor(
    code: ValidationErrorCode,
    message: string,
    context?: ValidationError['context'],
    cause?: Error
  ) {
    super(message);
    this.code = code;
    this.context = context;
    this.cause = cause;
    this.timestamp = new Date().toISOString();
  }
}

type ValidationErrorCode =
  | 'INVALID_TYPE'      // Type mismatch
  | 'MISSING_FIELD'     // Required field missing
  | 'INVALID_FORMAT'    // Format validation failed
  | 'OUT_OF_RANGE'      // Value outside acceptable range
  | 'INVALID_ENUM'      // Invalid enumeration value
  | 'CONSTRAINT_VIOLATION'; // Business rule violation
```

#### **Chrome Extension Errors**
```typescript
class ChromeApiError extends Error implements BaseError {
  readonly name = 'ChromeApiError';
  readonly code: ChromeErrorCode;
  readonly context?: {
    readonly api?: string;
    readonly method?: string;
    readonly permissions?: string[];
    readonly manifestVersion?: number;
  };
  readonly cause?: Error;
  readonly timestamp: string;
  readonly correlationId?: string;

  constructor(
    code: ChromeErrorCode,
    message: string,
    context?: ChromeApiError['context'],
    cause?: Error
  ) {
    super(message);
    this.code = code;
    this.context = context;
    this.cause = cause;
    this.timestamp = new Date().toISOString();
  }
}

type ChromeErrorCode =
  | 'RUNTIME_ERROR'     // chrome.runtime errors
  | 'STORAGE_ERROR'     // chrome.storage failures
  | 'PERMISSION_DENIED' // Missing permissions
  | 'CONTEXT_INVALID'   // Invalid execution context
  | 'API_UNAVAILABLE'   // Chrome API not available
  | 'QUOTA_EXCEEDED';   // Storage or other quota limits
```

### Error Serialization

```typescript
/**
 * Serializes error objects for logging and message passing
 * Handles circular references and preserves error chains
 */
function serializeError(error: Error): SerializedError {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: (error as any).code,
    timestamp: (error as any).timestamp || new Date().toISOString(),
    correlationId: (error as any).correlationId,
    context: sanitizeForLogging((error as any).context),
    cause: (error as any).cause ? serializeError((error as any).cause) : undefined
  };
}

interface SerializedError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly code?: string;
  readonly timestamp: string;
  readonly correlationId?: string;
  readonly context?: any;
  readonly cause?: SerializedError;
}
```

---

## Error Recovery Strategies

### Retry Mechanisms

#### **Exponential Backoff for API Calls**
```typescript
async function apiCallWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain error types
      if (error instanceof ValidationError || 
          (error instanceof ApiError && error.code === 'UNAUTHORIZED')) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        logger.error('Max retries exceeded', {
          operation: operation.name,
          attempts: attempt + 1,
          finalError: lastError.message
        });
        throw lastError;
      }
      
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      logger.warn('Operation failed, retrying', {
        operation: operation.name,
        attempt: attempt + 1,
        maxRetries,
        delayMs,
        error: lastError.message
      });
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError!;
}
```

#### **Circuit Breaker Pattern**
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly timeoutMs: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker transitioning to half-open');
      } else {
        throw new CircuitBreakerError('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn('Circuit breaker opened', {
        failures: this.failures,
        threshold: this.failureThreshold
      });
    }
  }
}
```

### Graceful Degradation

#### **Fallback Data Sources**
```typescript
async function getPriceData(correlationId: string): Promise<PriceData> {
  try {
    // Primary: Live API data
    return await fetchLivePriceData(correlationId);
  } catch (error) {
    logger.warn('Live price data unavailable, trying cache', {
      correlationId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    try {
      // Secondary: Cached data (may be stale)
      const cachedData = await getCachedPriceData();
      if (cachedData && isRecentEnough(cachedData.timestamp)) {
        return cachedData;
      }
    } catch (cacheError) {
      logger.warn('Cache fallback failed', {
        correlationId,
        error: cacheError instanceof Error ? cacheError.message : String(cacheError)
      });
    }
    
    // Tertiary: Default/static data
    logger.info('Using default price data', { correlationId });
    return getDefaultPriceData();
  }
}
```

#### **Feature Degradation**
```typescript
function initializePriceAnnotation(): void {
  try {
    // Full feature: Real-time price updates
    startRealtimePriceUpdates();
    logger.info('Real-time price updates enabled');
  } catch (error) {
    logger.warn('Real-time updates unavailable, using static prices', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    try {
      // Degraded: Static price annotation only
      startStaticPriceAnnotation();
    } catch (staticError) {
      logger.error('Price annotation completely unavailable', {
        error: staticError instanceof Error ? staticError.message : String(staticError)
      });
      
      // Graceful: No price annotation, extension still functional for other features
    }
  }
}
```

---

## Testing Error Scenarios

### Unit Test Error Patterns

```typescript
describe('API Error Handling', () => {
  it('should handle network timeout with proper error type', async () => {
    // Arrange
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network timeout'));
    
    // Act & Assert
    await expect(fetchPriceData('test-id')).rejects.toThrow(ApiError);
    await expect(fetchPriceData('test-id')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      correlationId: 'test-id'
    });
  });
  
  it('should preserve error chain through multiple layers', async () => {
    // Arrange
    const originalError = new Error('Connection refused');
    const mockFetch = vi.fn().mockRejectedValue(originalError);
    
    // Act
    let caughtError: Error;
    try {
      await fetchPriceData('test-id');
    } catch (error) {
      caughtError = error as Error;
    }
    
    // Assert
    expect(caughtError).toBeInstanceOf(ApiError);
    expect((caughtError as ApiError).cause).toBe(originalError);
  });
});
```

### Integration Test Error Scenarios

```typescript
describe('Cross-Context Error Handling', () => {
  it('should handle service worker errors in content script', async () => {
    // Arrange
    const harness = new ChromeRuntimeHarness();
    harness.mockServiceWorkerError('INTERNAL_ERROR', 'Service worker crashed');
    
    // Act
    const result = await harness.sendMessage({
      type: 'REQUEST_PRICE_DATA',
      correlationId: 'test-123'
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INTERNAL_ERROR');
    expect(result.correlationId).toBe('test-123');
  });
});
```

---

## Implementation Guidelines

### Migration Strategy

1. **Phase 1**: Implement standard error types in `src/shared/errors/`
2. **Phase 2**: Update existing modules to use new error types
3. **Phase 3**: Add missing error boundaries in DOM processing
4. **Phase 4**: Implement circuit breaker for API calls
5. **Phase 5**: Enhance error context and logging

### Code Review Checklist

- [ ] **Error types**: Uses appropriate custom error classes with error codes
- [ ] **Error context**: Includes sufficient debugging information
- [ ] **Error boundaries**: Failures are isolated and don't propagate inappropriately
- [ ] **Logging**: Errors are logged with proper level and context
- [ ] **Recovery**: Implements appropriate retry/fallback strategies
- [ ] **Testing**: Error scenarios are covered by tests
- [ ] **Documentation**: Complex error handling logic is documented

### Performance Considerations

- **Minimize error object creation** in hot paths
- **Use lazy evaluation** for expensive error context
- **Avoid synchronous operations** in error handlers
- **Limit error log verbosity** in production

### Security Considerations

- **Never log sensitive data** in error messages or context
- **Sanitize user input** before including in error logs
- **Avoid information leakage** in error messages shown to users
- **Rate limit error logging** to prevent log spam attacks

---

This error handling strategy provides the foundation for robust, maintainable error handling across the Bitcoin Price Tag extension. It should be reviewed and updated as the codebase evolves and new error patterns emerge.