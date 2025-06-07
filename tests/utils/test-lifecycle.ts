/**
 * Test Lifecycle Management Utilities
 * 
 * Provides standardized setup and cleanup patterns for consistent test isolation
 * and proper mock management across all test files.
 */

import { vi } from 'vitest';
import type { ChromeMockResult } from './chrome-api-factory';

/** Configuration for test lifecycle management */
export interface TestLifecycleConfig {
  /** Whether to use fake timers */
  useFakeTimers?: boolean;
  /** Whether to reset modules between tests */
  resetModules?: boolean;
  /** Whether to clear all mocks */
  clearMocks?: boolean;
  /** Whether to restore all mocks */
  restoreMocks?: boolean;
  /** Chrome mock configuration */
  chromeMocks?: ChromeMockResult;
  /** Custom cleanup functions */
  customCleanup?: (() => void)[];
  /** Whether to perform comprehensive global cleanup */
  comprehensiveCleanup?: boolean;
  /** Whether to isolate timer state */
  isolateTimers?: boolean;
  /** Whether to clean up DOM modifications */
  cleanupDOM?: boolean;
  /** Custom global properties to clean up */
  globalPropertiesToClean?: string[];
}

/** Test lifecycle manager for consistent setup and teardown */
export class TestLifecycleManager {
  private config: TestLifecycleConfig;
  private cleanupFunctions: (() => void | Promise<void>)[] = [];
  private globalBackups: Map<string, any> = new Map();
  private timerBackups: Map<string, any> = new Map();
  private activeTimerIds: Set<number> = new Set();
  private spyBackups: any[] = [];

  constructor(config: TestLifecycleConfig = {}) {
    this.config = {
      useFakeTimers: false,
      resetModules: false,
      clearMocks: true,
      restoreMocks: true,
      comprehensiveCleanup: true,
      isolateTimers: true,
      cleanupDOM: false,
      globalPropertiesToClean: [],
      ...config
    };
  }

  /**
   * Setup function to be called in beforeEach
   */
  async setup(): Promise<void> {
    // Clear all mocks from previous tests
    if (this.config.clearMocks) {
      vi.clearAllMocks();
    }

    // Reset modules if requested
    if (this.config.resetModules) {
      vi.resetModules();
    }

    // Backup global state before modifications
    if (this.config.comprehensiveCleanup) {
      this.backupGlobalState();
    }

    // Setup timer isolation
    if (this.config.isolateTimers) {
      this.setupTimerIsolation();
    }

    // Setup fake timers if requested
    if (this.config.useFakeTimers) {
      vi.useFakeTimers();
      this.cleanupFunctions.push(() => {
        vi.useRealTimers();
      });
    }

    // Clean up any stray timers from previous tests
    this.cleanupStrayTimers();

    // Apply custom setup if provided
    if (this.config.customCleanup) {
      this.cleanupFunctions.push(...this.config.customCleanup);
    }

    // CI-specific setup for better test stability
    if (process.env.CI) {
      // Clear any lingering timers
      vi.clearAllTimers();
      // Advance any pending async operations
      if (vi.isFakeTimers()) {
        await vi.runAllTimersAsync();
      }
      // Small delay to allow any pending async operations to complete
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  /**
   * Cleanup function to be called in afterEach
   */
  async cleanup(): Promise<void> {
    // Run all registered cleanup functions
    for (const cleanupFn of this.cleanupFunctions) {
      try {
        await cleanupFn();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    }
    this.cleanupFunctions = [];

    // Clear all active timers before switching to real timers
    this.clearAllActiveTimers();

    // Comprehensive vitest cleanup
    if (this.config.restoreMocks) {
      vi.restoreAllMocks();
    }

    if (this.config.clearMocks) {
      vi.clearAllMocks();
    }

    // Clean up global state
    vi.unstubAllGlobals();

    // Reset timers to real timers
    vi.useRealTimers();

    // Restore timer state isolation
    if (this.config.isolateTimers) {
      this.restoreTimerState();
    }

    // Restore global state
    if (this.config.comprehensiveCleanup) {
      this.restoreGlobalState();
    }

    // Clean up DOM if requested
    if (this.config.cleanupDOM) {
      this.cleanupDOMState();
    }

    // Reset modules to ensure clean state
    if (this.config.resetModules) {
      vi.resetModules();
    }

    // Chrome mock cleanup
    if (this.config.chromeMocks) {
      this.config.chromeMocks.cleanup();
    }

    // CI-specific comprehensive cleanup
    if (process.env.CI) {
      // Clear any remaining timers
      vi.clearAllTimers();
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      // Allow microtasks to complete
      await new Promise(resolve => setImmediate(resolve));
    }

    // Clear internal state
    this.globalBackups.clear();
    this.timerBackups.clear();
    this.activeTimerIds.clear();
    this.spyBackups = [];
  }

  /**
   * Add a custom cleanup function
   */
  addCleanup(cleanupFn: () => void | Promise<void>): void {
    this.cleanupFunctions.push(cleanupFn);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TestLifecycleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Backup global state before test modifications
   */
  private backupGlobalState(): void {
    // Common global properties that might be modified in tests
    const defaultGlobalsToBackup = [
      'chrome', 'fetch', 'localStorage', 'sessionStorage', 
      'XMLHttpRequest', 'performance', 'navigator', 'location'
    ];

    const customGlobals = this.config.globalPropertiesToClean || [];
    const globalsToBackup = [...defaultGlobalsToBackup, ...customGlobals];

    for (const prop of globalsToBackup) {
      if (prop in global) {
        this.globalBackups.set(prop, (global as any)[prop]);
      } else {
        // Mark properties that don't exist so we can remove them if added
        this.globalBackups.set(prop, undefined);
      }
    }
  }

  /**
   * Restore global state after test cleanup
   */
  private restoreGlobalState(): void {
    // Restore backed up globals
    for (const [prop, value] of this.globalBackups) {
      if (value === undefined && prop in global) {
        // Property didn't exist originally and was added during test - remove it
        delete (global as any)[prop];
      } else if (value !== undefined) {
        // Property existed originally - restore original value
        (global as any)[prop] = value;
      }
    }
  }

  /**
   * Setup timer isolation to track timer IDs
   */
  private setupTimerIsolation(): void {
    // Backup original timer functions
    this.timerBackups.set('setTimeout', global.setTimeout);
    this.timerBackups.set('setInterval', global.setInterval);
    this.timerBackups.set('clearTimeout', global.clearTimeout);
    this.timerBackups.set('clearInterval', global.clearInterval);

    // Track timer IDs for cleanup
    const originalSetTimeout = global.setTimeout;
    const originalSetInterval = global.setInterval;
    const originalClearTimeout = global.clearTimeout;
    const originalClearInterval = global.clearInterval;

    global.setTimeout = ((callback: any, delay?: number, ...args: any[]) => {
      const id = originalSetTimeout(callback, delay, ...args);
      this.activeTimerIds.add(id as number);
      return id;
    }) as typeof setTimeout;

    global.setInterval = ((callback: any, delay?: number, ...args: any[]) => {
      const id = originalSetInterval(callback, delay, ...args);
      this.activeTimerIds.add(id as number);
      return id;
    }) as typeof setInterval;

    global.clearTimeout = ((id?: number) => {
      if (id !== undefined) {
        this.activeTimerIds.delete(id);
        originalClearTimeout(id);
      }
    }) as typeof clearTimeout;

    global.clearInterval = ((id?: number) => {
      if (id !== undefined) {
        this.activeTimerIds.delete(id);
        originalClearInterval(id);
      }
    }) as typeof clearInterval;
  }

  /**
   * Restore timer state isolation
   */
  private restoreTimerState(): void {
    // Restore original timer functions
    for (const [name, originalFn] of this.timerBackups) {
      (global as any)[name] = originalFn;
    }
  }

  /**
   * Clear any stray timers from previous tests
   */
  private cleanupStrayTimers(): void {
    // Clear any lingering vitest timers
    if (vi.isFakeTimers()) {
      vi.clearAllTimers();
    }

    // In real timer mode, clear tracked timers
    if (this.activeTimerIds.size > 0) {
      const originalClearTimeout = this.timerBackups.get('clearTimeout') || clearTimeout;
      const originalClearInterval = this.timerBackups.get('clearInterval') || clearInterval;

      for (const id of this.activeTimerIds) {
        try {
          originalClearTimeout(id);
          originalClearInterval(id);
        } catch (_error) {
          // Timer might already be cleared
        }
      }
      this.activeTimerIds.clear();
    }
  }

  /**
   * Clear all active timers
   */
  private clearAllActiveTimers(): void {
    // Clear vitest timers
    vi.clearAllTimers();

    // Clear tracked real timers
    this.cleanupStrayTimers();
  }

  /**
   * Clean up DOM state modifications
   */
  private cleanupDOMState(): void {
    if (typeof document !== 'undefined') {
      // Clear any test-added elements
      const testElements = document.querySelectorAll('[data-test-element]');
      testElements.forEach(el => el.remove());

      // Reset document.body if it was modified
      if (document.body) {
        document.body.innerHTML = '';
        document.body.className = '';
        document.body.style.cssText = '';
      }

      // Clear any event listeners added during tests
      const newBody = document.body.cloneNode(false);
      if (document.body.parentNode) {
        document.body.parentNode.replaceChild(newBody, document.body);
      }
    }
  }
}

/**
 * Pre-configured lifecycle managers for common test scenarios
 */
export const TestLifecyclePresets = {
  /** Basic unit test lifecycle */
  unit: () => new TestLifecycleManager({
    useFakeTimers: false,
    resetModules: false,
    clearMocks: true,
    restoreMocks: true,
    comprehensiveCleanup: false,
    isolateTimers: false,
    cleanupDOM: false
  }),

  /** Integration test lifecycle with module resets */
  integration: () => new TestLifecycleManager({
    useFakeTimers: true,
    resetModules: true,
    clearMocks: true,
    restoreMocks: true,
    comprehensiveCleanup: true,
    isolateTimers: true,
    cleanupDOM: false
  }),

  /** Service worker test lifecycle with comprehensive cleanup */
  serviceWorker: () => new TestLifecycleManager({
    useFakeTimers: true,
    resetModules: true,
    clearMocks: true,
    restoreMocks: true,
    comprehensiveCleanup: true,
    isolateTimers: true,
    cleanupDOM: false,
    globalPropertiesToClean: ['Date']
  }),

  /** Content script test lifecycle */
  contentScript: () => new TestLifecycleManager({
    useFakeTimers: false,
    resetModules: true,
    clearMocks: true,
    restoreMocks: true,
    comprehensiveCleanup: true,
    isolateTimers: false,
    cleanupDOM: true
  }),

  /** Comprehensive cleanup for the most problematic tests */
  comprehensive: () => new TestLifecycleManager({
    useFakeTimers: true,
    resetModules: true,
    clearMocks: true,
    restoreMocks: true,
    comprehensiveCleanup: true,
    isolateTimers: true,
    cleanupDOM: true,
    globalPropertiesToClean: ['Date', 'console']
  }),
};

/**
 * Helper function to create standardized beforeEach/afterEach handlers
 */
export function createTestLifecycle(config?: TestLifecycleConfig): {
  beforeEach: () => Promise<void>;
  afterEach: () => Promise<void>;
  manager: TestLifecycleManager;
} {
  const manager = new TestLifecycleManager(config);

  return {
    beforeEach: () => manager.setup(),
    afterEach: () => manager.cleanup(),
    manager
  };
}

/**
 * Utility to ensure all async operations complete
 * Useful for tests with complex async flows
 */
export async function flushAllPromises(): Promise<void> {
  // Allow microtasks to complete
  await Promise.resolve();
  await Promise.resolve();
  
  // Allow timers to advance if using fake timers
  if (vi.isFakeTimers && vi.isFakeTimers()) {
    await vi.runAllTimersAsync();
  }
  
  // Final microtask flush
  await Promise.resolve();
}

/**
 * CI-aware timer advancement
 * Handles differences between local and CI environments
 */
export async function advanceTimersBy(ms: number): Promise<void> {
  if (vi.isFakeTimers && vi.isFakeTimers()) {
    await vi.advanceTimersByTimeAsync(ms);
  } else {
    // If not using fake timers, wait the actual time
    await new Promise(resolve => global.setTimeout(resolve, ms));
  }
  
  // Allow any resulting async operations to complete
  await flushAllPromises();
}

/**
 * Wait for condition with timeout
 * Useful for integration tests waiting for specific states
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 50
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Test isolation validator
 * Checks for common test pollution issues
 */
export class TestIsolationValidator {
  private initialGlobalKeys: Set<string>;
  private initialTimerCount: number;

  constructor() {
    this.initialGlobalKeys = new Set(Object.keys(global));
    this.initialTimerCount = this.getActiveTimerCount();
  }

  /**
   * Validate that test hasn't polluted global state
   */
  validateGlobalCleanup(): { isClean: boolean; issues: string[] } {
    const issues: string[] = [];
    const currentGlobalKeys = new Set(Object.keys(global));
    
    // Check for new global properties
    for (const key of currentGlobalKeys) {
      if (!this.initialGlobalKeys.has(key)) {
        issues.push(`New global property added: ${key}`);
      }
    }

    // Check for removed global properties
    for (const key of this.initialGlobalKeys) {
      if (!currentGlobalKeys.has(key)) {
        issues.push(`Global property removed: ${key}`);
      }
    }

    return {
      isClean: issues.length === 0,
      issues
    };
  }

  /**
   * Validate that timers were cleaned up
   */
  validateTimerCleanup(): { isClean: boolean; issues: string[] } {
    const currentTimerCount = this.getActiveTimerCount();
    const issues: string[] = [];

    if (currentTimerCount > this.initialTimerCount) {
      issues.push(`${currentTimerCount - this.initialTimerCount} timers not cleaned up`);
    }

    return {
      isClean: issues.length === 0,
      issues
    };
  }

  /**
   * Get approximate count of active timers
   */
  private getActiveTimerCount(): number {
    // This is approximate - in a real environment it's hard to get exact timer count
    return (process as any)._getActiveHandles ? (process as any)._getActiveHandles().length : 0;
  }

  /**
   * Run full validation
   */
  validate(): { isClean: boolean; issues: string[] } {
    const globalValidation = this.validateGlobalCleanup();
    const timerValidation = this.validateTimerCleanup();

    return {
      isClean: globalValidation.isClean && timerValidation.isClean,
      issues: [...globalValidation.issues, ...timerValidation.issues]
    };
  }
}

/**
 * Create a test isolation validator and automatically validate after each test
 */
export function createTestIsolationValidator(): {
  beforeEach: () => void;
  afterEach: () => void;
  validator: TestIsolationValidator | null;
} {
  let validator: TestIsolationValidator | null = null;

  return {
    beforeEach: () => {
      validator = new TestIsolationValidator();
    },
    afterEach: () => {
      if (validator) {
        const result = validator.validate();
        if (!result.isClean) {
          console.warn('Test isolation issues detected:', result.issues);
        }
        validator = null;
      }
    },
    get validator() {
      return validator;
    }
  };
}

/**
 * Utility to force a test execution order reset
 * Helps detect order-dependent test failures
 */
export function shuffleTestOrder<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}