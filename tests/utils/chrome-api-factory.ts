/**
 * Centralized Chrome API Mock Factory
 * 
 * Provides standardized Chrome API mocks for different testing scenarios:
 * - Unit tests: Simple mocks with vi.fn()
 * - Integration tests: ChromeRuntimeHarness for realistic message passing
 * - Service worker tests: Comprehensive mocks with event simulation
 */

import { vi } from 'vitest';
import { ChromeRuntimeHarness } from '../harness/ChromeRuntimeHarness';
import { createStorageMock, createStorageWithCache } from '../mocks/storage';
import type { PriceData } from '../../src/common/types';

/** Chrome API mock strategy types */
export type ChromeMockStrategy = 'unit' | 'integration' | 'service-worker';

/** Configuration options for Chrome API mocks */
export interface ChromeMockConfig {
  /** Mock strategy to use */
  strategy: ChromeMockStrategy;
  /** Initial storage data */
  initialStorage?: Record<string, any>;
  /** Initial cached price data */
  initialCache?: PriceData;
  /** Cache age in milliseconds */
  cacheAge?: number;
  /** Enable/disable specific APIs */
  apis?: {
    runtime?: boolean;
    storage?: boolean;
    alarms?: boolean;
    tabs?: boolean;
  };
}

/** Result of Chrome API mock setup */
export interface ChromeMockResult {
  /** The mock Chrome API object */
  chromeApi: any;
  /** Storage mock instance (if enabled) */
  storageMock?: ReturnType<typeof createStorageMock>;
  /** Runtime harness instance (for integration tests) */
  harness?: ChromeRuntimeHarness;
  /** Cleanup function to restore mocks */
  cleanup: () => void;
}

/**
 * Create Chrome API mocks based on strategy
 */
export function createChromeMocks(config: ChromeMockConfig): ChromeMockResult {
  const { strategy, initialStorage, initialCache, cacheAge, apis } = config;
  
  // Default API enablement
  const enabledApis = {
    runtime: true,
    storage: true,
    alarms: true,
    tabs: false,
    ...apis
  };

  let chromeApi: any = {};
  let storageMock: ReturnType<typeof createStorageMock> | undefined;
  let harness: ChromeRuntimeHarness | undefined;
  const cleanupFunctions: (() => void)[] = [];

  // Setup storage mock if enabled
  if (enabledApis.storage) {
    if (initialCache && cacheAge !== undefined) {
      storageMock = createStorageWithCache(initialCache, cacheAge);
    } else {
      storageMock = createStorageMock({ initialData: initialStorage });
    }
    
    chromeApi.storage = {
      local: storageMock
    };
  }

  // Setup runtime mock based on strategy
  if (enabledApis.runtime) {
    if (strategy === 'integration') {
      // Use ChromeRuntimeHarness for realistic message passing
      harness = new ChromeRuntimeHarness();
      const harnessApi = harness.getMockChromeApi();
      chromeApi = { ...chromeApi, ...harnessApi };
      
      cleanupFunctions.push(() => {
        harness?.reset();
      });
    } else {
      // Simple mocks for unit and service worker tests
      chromeApi.runtime = createRuntimeMock(strategy);
    }
  }

  // Setup alarms mock if enabled
  if (enabledApis.alarms) {
    chromeApi.alarms = createAlarmsMock(strategy);
  }

  // Setup tabs mock if enabled
  if (enabledApis.tabs) {
    chromeApi.tabs = createTabsMock(strategy);
  }

  // Add lastError property
  chromeApi.runtime = chromeApi.runtime || {};
  chromeApi.runtime.lastError = null;
  chromeApi.runtime.id = 'test-extension-id';

  // Global setup
  if (strategy === 'integration') {
    vi.stubGlobal('chrome', chromeApi);
    cleanupFunctions.push(() => {
      vi.unstubAllGlobals();
    });
  } else {
    (global as any).chrome = chromeApi;
    cleanupFunctions.push(() => {
      delete (global as any).chrome;
    });
  }

  return {
    chromeApi,
    storageMock,
    harness,
    cleanup: () => {
      cleanupFunctions.forEach(fn => fn());
    }
  };
}

/**
 * Create runtime API mock based on strategy
 */
function createRuntimeMock(strategy: ChromeMockStrategy) {
  const runtime = {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    lastError: null,
    id: 'test-extension-id',
  };

  // Enhanced mocks for service worker strategy
  if (strategy === 'service-worker') {
    // Add more realistic behavior for service worker events
    runtime.sendMessage = vi.fn().mockImplementation((_message, callback) => {
      if (callback) {
        // Simulate async response
        setTimeout(() => callback({ status: 'success' }), 0);
      }
      return Promise.resolve({ status: 'success' });
    });
  }

  return runtime;
}

/**
 * Create alarms API mock based on strategy
 */
function createAlarmsMock(strategy: ChromeMockStrategy) {
  const alarms = {
    create: vi.fn(),
    clear: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  };

  // Enhanced mocks for service worker strategy
  if (strategy === 'service-worker') {
    alarms.create = vi.fn().mockResolvedValue(undefined);
    alarms.clear = vi.fn().mockResolvedValue(true);
    alarms.get = vi.fn().mockResolvedValue(null);
    alarms.getAll = vi.fn().mockResolvedValue([]);
  }

  return alarms;
}

/**
 * Create tabs API mock based on strategy
 */
function createTabsMock(_strategy: ChromeMockStrategy) {
  return {
    query: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Preset configurations for common testing scenarios
 */
export const ChromeMockPresets = {
  /** Simple unit test mocks */
  unit: (): ChromeMockConfig => ({
    strategy: 'unit',
    apis: { runtime: true, storage: true, alarms: false, tabs: false }
  }),

  /** Integration test mocks with message passing */
  integration: (initialStorage?: Record<string, any>): ChromeMockConfig => ({
    strategy: 'integration',
    initialStorage,
    apis: { runtime: true, storage: true, alarms: true, tabs: false }
  }),

  /** Service worker test mocks with comprehensive API coverage */
  serviceWorker: (initialCache?: PriceData, cacheAge?: number): ChromeMockConfig => ({
    strategy: 'service-worker',
    initialCache,
    cacheAge,
    apis: { runtime: true, storage: true, alarms: true, tabs: false }
  }),

  /** Content script test mocks */
  contentScript: (): ChromeMockConfig => ({
    strategy: 'unit',
    apis: { runtime: true, storage: false, alarms: false, tabs: false }
  }),
};

/**
 * Utility function to setup Chrome mocks with cleanup
 * Returns a function that can be called in afterEach to cleanup
 */
export function setupChromeMocks(config: ChromeMockConfig): () => void {
  const mockResult = createChromeMocks(config);
  return mockResult.cleanup;
}

/**
 * Helper to create Chrome mocks for a specific test context
 * This is the recommended way to use Chrome mocks in tests
 */
export function withChromeMocks<T>(
  config: ChromeMockConfig,
  testFn: (mockResult: ChromeMockResult) => T
): T {
  const mockResult = createChromeMocks(config);
  
  try {
    return testFn(mockResult);
  } finally {
    mockResult.cleanup();
  }
}