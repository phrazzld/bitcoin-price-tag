# Chrome API Mock Patterns Guide

This guide establishes standardized patterns for Chrome API mocking across different test types in the Bitcoin Price Tag extension.

## Mock Strategy Selection

### Unit Tests
**Use when:** Testing individual functions or classes in isolation
**Strategy:** `'unit'`
**Chrome APIs:** Simple `vi.fn()` mocks
**Lifecycle:** Basic cleanup

```typescript
import { ChromeMockPresets, createChromeMocks } from '../utils/chrome-api-factory';
import { TestLifecyclePresets } from '../utils/test-lifecycle';

describe('MyComponent', () => {
  const lifecycle = TestLifecyclePresets.unit();
  
  beforeEach(async () => {
    await lifecycle.setup();
    
    // Setup Chrome mocks
    const mockResult = createChromeMocks(ChromeMockPresets.unit());
    lifecycle.addCleanup(mockResult.cleanup);
  });
  
  afterEach(async () => {
    await lifecycle.cleanup();
  });
  
  it('should work with simple Chrome mocks', () => {
    // Test code here
  });
});
```

### Integration Tests
**Use when:** Testing Service Worker ↔ Content Script communication
**Strategy:** `'integration'`
**Chrome APIs:** ChromeRuntimeHarness for realistic message passing
**Lifecycle:** Module resets, fake timers

```typescript
import { ChromeMockPresets, createChromeMocks } from '../utils/chrome-api-factory';
import { TestLifecyclePresets } from '../utils/test-lifecycle';

describe('Service Worker <-> Content Script Communication', () => {
  const lifecycle = TestLifecyclePresets.integration();
  let mockResult: ChromeMockResult;
  
  beforeEach(async () => {
    await lifecycle.setup();
    
    // Setup Chrome mocks with harness
    mockResult = createChromeMocks(ChromeMockPresets.integration());
    lifecycle.addCleanup(mockResult.cleanup);
    
    // Load modules after mock setup
    await import('../../src/service-worker/index');
    const messagingModule = await import('../../src/content-script/messaging');
  });
  
  afterEach(async () => {
    await lifecycle.cleanup();
  });
  
  it('should handle bi-directional message flow', async () => {
    // Test using mockResult.harness for message routing
  });
});
```

### Service Worker Tests
**Use when:** Testing service worker event handlers and lifecycle
**Strategy:** `'service-worker'`
**Chrome APIs:** Comprehensive mocks with event simulation
**Lifecycle:** Comprehensive cleanup, fake timers

```typescript
import { ChromeMockPresets, createChromeMocks } from '../utils/chrome-api-factory';
import { TestLifecyclePresets } from '../utils/test-lifecycle';

describe('Service Worker', () => {
  const lifecycle = TestLifecyclePresets.serviceWorker();
  let mockResult: ChromeMockResult;
  
  beforeEach(async () => {
    await lifecycle.setup();
    
    // Setup Chrome mocks with comprehensive APIs
    mockResult = createChromeMocks(ChromeMockPresets.serviceWorker());
    lifecycle.addCleanup(mockResult.cleanup);
  });
  
  afterEach(async () => {
    await lifecycle.cleanup();
  });
  
  it('should handle installation events', () => {
    // Test service worker installation
  });
});
```

### Content Script Tests
**Use when:** Testing content script functionality
**Strategy:** `'unit'`
**Chrome APIs:** Runtime-only mocks
**Lifecycle:** Basic cleanup

```typescript
import { ChromeMockPresets, createChromeMocks } from '../utils/chrome-api-factory';
import { TestLifecyclePresets } from '../utils/test-lifecycle';

describe('Content Script', () => {
  const lifecycle = TestLifecyclePresets.contentScript();
  
  beforeEach(async () => {
    await lifecycle.setup();
    
    // Setup minimal Chrome mocks
    const mockResult = createChromeMocks(ChromeMockPresets.contentScript());
    lifecycle.addCleanup(mockResult.cleanup);
  });
  
  afterEach(async () => {
    await lifecycle.cleanup();
  });
  
  it('should send messages to service worker', () => {
    // Test content script messaging
  });
});
```

## Advanced Patterns

### Custom Mock Configuration
```typescript
const customConfig: ChromeMockConfig = {
  strategy: 'integration',
  initialStorage: { 'my-key': 'my-value' },
  apis: {
    runtime: true,
    storage: true,
    alarms: false,
    tabs: true
  }
};

const mockResult = createChromeMocks(customConfig);
```

### With Cached Price Data
```typescript
const priceData: PriceData = {
  usdRate: 50000,
  satoshiRate: 0.0005,
  fetchedAt: Date.now() - 5000,
  source: 'CoinGecko'
};

const mockResult = createChromeMocks(
  ChromeMockPresets.serviceWorker(priceData, 5000)
);
```

### Using withChromeMocks Helper
```typescript
it('should work with scoped mocks', () => {
  withChromeMocks(ChromeMockPresets.unit(), (mockResult) => {
    // Test code with automatic cleanup
    expect(mockResult.chromeApi.runtime.sendMessage).toBeDefined();
  });
  // Mocks automatically cleaned up here
});
```

## Best Practices

### 1. Match Strategy to Test Type
- **Unit tests**: Use `'unit'` strategy for simple, fast mocks
- **Integration tests**: Use `'integration'` strategy with ChromeRuntimeHarness
- **Service worker tests**: Use `'service-worker'` strategy for comprehensive coverage

### 2. Use Consistent Lifecycle Management
- Always use `TestLifecyclePresets` for your test type
- Call `lifecycle.addCleanup()` for any custom cleanup needed
- Ensure `afterEach` calls `lifecycle.cleanup()`

### 3. Setup Order Matters
1. Setup lifecycle
2. Setup Chrome mocks
3. Import modules (for integration tests)
4. Run test
5. Cleanup automatically

### 4. Error Handling
```typescript
beforeEach(async () => {
  try {
    await lifecycle.setup();
    mockResult = createChromeMocks(config);
    lifecycle.addCleanup(mockResult.cleanup);
  } catch (error) {
    // Ensure cleanup even if setup fails
    await lifecycle.cleanup();
    throw error;
  }
});
```

### 5. Debugging Tips
- Use `mockResult.harness?.getLastError()` to check for Chrome API errors
- Check `mockResult.storageMock?.getStore()` to inspect storage state
- Use `console.log` to verify mock calls during development

## Migration from Legacy Patterns

### From Direct Global Assignment
```typescript
// OLD
global.chrome = { /* manual setup */ };

// NEW
const mockResult = createChromeMocks(ChromeMockPresets.unit());
```

### From Manual vi.stubGlobal
```typescript
// OLD
vi.stubGlobal('chrome', manualChromeApi);

// NEW
const mockResult = createChromeMocks(ChromeMockPresets.integration());
```

### From ChromeRuntimeHarness Only
```typescript
// OLD
const harness = new ChromeRuntimeHarness();
vi.stubGlobal('chrome', harness.getMockChromeApi());

// NEW
const mockResult = createChromeMocks(ChromeMockPresets.integration());
// mockResult.harness is the ChromeRuntimeHarness instance
```

## Testing the Mock System

The mock factory itself should be tested to ensure reliability:

```typescript
describe('Chrome Mock Factory', () => {
  it('should create unit test mocks', () => {
    const mockResult = createChromeMocks(ChromeMockPresets.unit());
    expect(mockResult.chromeApi.runtime.sendMessage).toBeDefined();
    mockResult.cleanup();
  });
  
  it('should create integration test mocks with harness', () => {
    const mockResult = createChromeMocks(ChromeMockPresets.integration());
    expect(mockResult.harness).toBeInstanceOf(ChromeRuntimeHarness);
    mockResult.cleanup();
  });
});
```

This standardized approach ensures consistent Chrome API mocking across all test files while maintaining flexibility for different testing scenarios.