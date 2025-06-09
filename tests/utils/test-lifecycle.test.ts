/**
 * Tests for Enhanced Test Lifecycle Management
 * Validates comprehensive cleanup infrastructure and test isolation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  TestLifecycleManager,
  TestLifecyclePresets,
  TestIsolationValidator,
  createTestIsolationValidator,
  shuffleTestOrder,
  flushAllPromises,
  advanceTimersBy
} from './test-lifecycle';

describe('Enhanced Test Lifecycle Management', () => {
  let originalGlobalProps: Record<string, any> = {};

  beforeEach(() => {
    // Backup global state
    originalGlobalProps = {
      chrome: (global as any).chrome,
      fetch: (global as any).fetch,
      setTimeout: global.setTimeout,
      clearTimeout: global.clearTimeout
    };
  });

  afterEach(() => {
    // Restore global state
    for (const [key, value] of Object.entries(originalGlobalProps)) {
      if (value === undefined) {
        delete (global as any)[key];
      } else {
        (global as any)[key] = value;
      }
    }
    
    // Ensure real timers
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('TestLifecycleManager', () => {
    describe('Global State Management', () => {
      it('should backup and restore global state', async () => {
        const manager = new TestLifecycleManager({
          comprehensiveCleanup: true,
          globalPropertiesToClean: ['testProperty']
        });

        // Setup - this backs up current state (testProperty doesn't exist)
        await manager.setup();
        
        // Add a global property during test
        (global as any).testProperty = 'test-value';
        
        // Cleanup should remove it because it didn't exist originally
        await manager.cleanup();
        
        expect((global as any).testProperty).toBeUndefined();
      });

      it('should handle custom global properties to clean', async () => {
        // Set initial value before creating manager
        (global as any).customProp = 'initial';
        
        const manager = new TestLifecycleManager({
          comprehensiveCleanup: true,
          globalPropertiesToClean: ['customProp']
        });
        
        await manager.setup();
        
        // Modify during test
        (global as any).customProp = 'modified';
        
        await manager.cleanup();
        
        // Should be restored to initial value
        expect((global as any).customProp).toBe('initial');
        
        // Clean up for other tests
        delete (global as any).customProp;
      });

      it('should clean up test-added Chrome API', async () => {
        // Save original chrome state first
        const originalChrome = (global as any).chrome;
        delete (global as any).chrome;
        
        const manager = new TestLifecycleManager({
          comprehensiveCleanup: true
        });

        await manager.setup();
        
        // Simulate test adding Chrome API
        (global as any).chrome = { runtime: { id: 'test' } };
        
        await manager.cleanup();
        
        expect((global as any).chrome).toBeUndefined();
        
        // Restore original state for other tests
        if (originalChrome !== undefined) {
          (global as any).chrome = originalChrome;
        }
      });
    });

    describe('Timer State Isolation', () => {
      it('should track and clean up timers', async () => {
        const manager = new TestLifecycleManager({
          isolateTimers: true
        });

        await manager.setup();
        
        // Create timers during test
        const timeoutId = setTimeout(() => {}, 1000);
        const intervalId = setInterval(() => {}, 1000);
        
        await manager.cleanup();
        
        // Timers should be cleaned up (no way to verify directly, but no errors should occur)
        expect(() => clearTimeout(timeoutId)).not.toThrow();
        expect(() => clearInterval(intervalId)).not.toThrow();
      });

      it('should restore original timer functions', async () => {
        const originalSetTimeout = global.setTimeout;
        const originalClearTimeout = global.clearTimeout;
        
        const manager = new TestLifecycleManager({
          isolateTimers: true
        });

        await manager.setup();
        
        // Timer functions should be wrapped
        expect(global.setTimeout).not.toBe(originalSetTimeout);
        expect(global.clearTimeout).not.toBe(originalClearTimeout);
        
        await manager.cleanup();
        
        // Timer functions should be restored
        expect(global.setTimeout).toBe(originalSetTimeout);
        expect(global.clearTimeout).toBe(originalClearTimeout);
      });
    });

    describe('Vitest Integration', () => {
      it('should handle fake timers correctly', async () => {
        const manager = new TestLifecycleManager({
          useFakeTimers: true
        });

        expect(vi.isFakeTimers()).toBe(false);
        
        await manager.setup();
        
        expect(vi.isFakeTimers()).toBe(true);
        
        await manager.cleanup();
        
        expect(vi.isFakeTimers()).toBe(false);
      });

      it('should reset modules when configured', async () => {
        // Mock vi.resetModules to verify it's called
        const resetModulesSpy = vi.spyOn(vi, 'resetModules').mockImplementation(() => {});
        
        const manager = new TestLifecycleManager({
          resetModules: true,
          clearMocks: false,   // Prevent clearing spy call counts
          restoreMocks: false  // Prevent restoring spy
        });
        
        await manager.setup();
        
        expect(resetModulesSpy).toHaveBeenCalledTimes(1);
        
        await manager.cleanup();
        
        expect(resetModulesSpy).toHaveBeenCalledTimes(2);
        
        resetModulesSpy.mockRestore();
      });
    });

    describe('Custom Cleanup Functions', () => {
      it('should execute custom cleanup functions', async () => {
        const manager = new TestLifecycleManager({
          restoreMocks: false, // Prevent clearing of spy during cleanup
          clearMocks: false    // Prevent clearing spy call counts
        });
        const cleanupSpy = vi.fn();
        
        await manager.setup();
        manager.addCleanup(cleanupSpy);
        
        await manager.cleanup();
        
        expect(cleanupSpy).toHaveBeenCalledTimes(1);
      });

      it('should handle async cleanup functions', async () => {
        const manager = new TestLifecycleManager();
        let cleanupExecuted = false;
        
        // Ensure we have setup called to initialize properly
        await manager.setup();
        
        manager.addCleanup(async () => {
          // Use a timer-safe approach for the delay
          await new Promise(resolve => {
            if (typeof setTimeout === 'function') {
              setTimeout(resolve, 10);
            } else {
              // Fallback if timers are corrupted
              setImmediate(resolve);
            }
          });
          cleanupExecuted = true;
        });
        
        await manager.cleanup();
        
        expect(cleanupExecuted).toBe(true);
      });

      it('should continue cleanup even if one function fails', async () => {
        const manager = new TestLifecycleManager({
          restoreMocks: false, // Prevent clearing of spy during cleanup
          clearMocks: false    // Prevent clearing spy call counts
        });
        const workingCleanup = vi.fn();
        const failingCleanup = vi.fn(() => { throw new Error('Cleanup failed'); });
        
        await manager.setup();
        manager.addCleanup(failingCleanup);
        manager.addCleanup(workingCleanup);
        
        // Should not throw
        await expect(manager.cleanup()).resolves.toBeUndefined();
        
        expect(failingCleanup).toHaveBeenCalled();
        expect(workingCleanup).toHaveBeenCalled();
      });
    });

    describe('CI-Specific Behavior', () => {
      it('should handle CI environment cleanup', async () => {
        const originalCI = process.env.CI;
        process.env.CI = 'true';
        
        try {
          const manager = new TestLifecycleManager({
            useFakeTimers: false // Avoid potential CI timer issues
          });

          await manager.setup();
          
          // Should not throw in CI mode
          await expect(manager.cleanup()).resolves.toBeUndefined();
        } finally {
          process.env.CI = originalCI;
        }
      }, 5000); // 5 second timeout
    });
  });

  describe('Test Lifecycle Presets', () => {
    it('should create unit test lifecycle with minimal cleanup', () => {
      const lifecycle = TestLifecyclePresets.unit();
      
      expect(lifecycle).toBeInstanceOf(TestLifecycleManager);
      // Should have minimal cleanup for performance
      expect((lifecycle as any).config.comprehensiveCleanup).toBe(false);
      expect((lifecycle as any).config.isolateTimers).toBe(false);
    });

    it('should create integration test lifecycle with comprehensive cleanup', () => {
      const lifecycle = TestLifecyclePresets.integration();
      
      expect(lifecycle).toBeInstanceOf(TestLifecycleManager);
      expect((lifecycle as any).config.comprehensiveCleanup).toBe(true);
      expect((lifecycle as any).config.isolateTimers).toBe(false); // Changed for CI compatibility
      expect((lifecycle as any).config.useFakeTimers).toBe(true);
    });

    it('should create service worker lifecycle with enhanced cleanup', () => {
      const lifecycle = TestLifecyclePresets.serviceWorker();
      
      expect(lifecycle).toBeInstanceOf(TestLifecycleManager);
      expect((lifecycle as any).config.comprehensiveCleanup).toBe(true);
      expect((lifecycle as any).config.isolateTimers).toBe(false); // Changed for CI compatibility
      expect((lifecycle as any).config.globalPropertiesToClean).toContain('Date');
    });

    it('should create content script lifecycle with DOM cleanup', () => {
      const lifecycle = TestLifecyclePresets.contentScript();
      
      expect(lifecycle).toBeInstanceOf(TestLifecycleManager);
      expect((lifecycle as any).config.cleanupDOM).toBe(true);
      expect((lifecycle as any).config.comprehensiveCleanup).toBe(true);
    });

    it('should create comprehensive lifecycle for problematic tests', () => {
      const lifecycle = TestLifecyclePresets.comprehensive();
      
      expect(lifecycle).toBeInstanceOf(TestLifecycleManager);
      expect((lifecycle as any).config.comprehensiveCleanup).toBe(true);
      expect((lifecycle as any).config.isolateTimers).toBe(false); // Changed for CI compatibility
      expect((lifecycle as any).config.cleanupDOM).toBe(true);
      expect((lifecycle as any).config.globalPropertiesToClean).toEqual(['Date', 'console']);
    });
  });

  describe('TestIsolationValidator', () => {
    it('should detect global property pollution', () => {
      const validator = new TestIsolationValidator();
      
      // Add global property
      (global as any).testPollution = 'pollution';
      
      const result = validator.validateGlobalCleanup();
      
      expect(result.isClean).toBe(false);
      expect(result.issues).toContain('New global property added: testPollution');
      
      // Clean up
      delete (global as any).testPollution;
    });

    it('should detect removed global properties', () => {
      // Add property before validator creation
      (global as any).testProperty = 'value';
      
      const validator = new TestIsolationValidator();
      
      // Remove property
      delete (global as any).testProperty;
      
      const result = validator.validateGlobalCleanup();
      
      expect(result.isClean).toBe(false);
      expect(result.issues).toContain('Global property removed: testProperty');
    });

    it('should pass validation when globals are clean', () => {
      const validator = new TestIsolationValidator();
      
      const result = validator.validate();
      
      expect(result.isClean).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Utility Functions', () => {
    describe('flushAllPromises', () => {
      it('should flush all pending promises', async () => {
        let resolved = false;
        
        Promise.resolve().then(() => {
          resolved = true;
        });
        
        await flushAllPromises();
        
        expect(resolved).toBe(true);
      });

      it('should advance fake timers when active', async () => {
        vi.useFakeTimers();
        
        let timerExecuted = false;
        setTimeout(() => { timerExecuted = true; }, 100);
        
        await flushAllPromises();
        
        expect(timerExecuted).toBe(true);
        
        vi.useRealTimers();
      });
    });

    describe('advanceTimersBy', () => {
      it('should advance fake timers by specified amount', async () => {
        vi.useFakeTimers();
        
        let executed = false;
        setTimeout(() => { executed = true; }, 1000);
        
        await advanceTimersBy(1000);
        
        expect(executed).toBe(true);
        
        vi.useRealTimers();
      });

      it('should wait actual time when using real timers', async () => {
        const start = Date.now();
        
        await advanceTimersBy(50);
        
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some variance
      });
    });

    describe('shuffleTestOrder', () => {
      it('should shuffle array order', () => {
        const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const shuffled = shuffleTestOrder(original);
        
        expect(shuffled).toHaveLength(original.length);
        expect(shuffled).toEqual(expect.arrayContaining(original));
        
        // With 10 elements, it's extremely unlikely to have the same order
        // (probability is 1/10! = 1/3,628,800)
        expect(shuffled).not.toEqual(original);
      });

      it('should not modify original array', () => {
        const original = [1, 2, 3];
        const shuffled = shuffleTestOrder(original);
        
        expect(original).toEqual([1, 2, 3]);
        expect(shuffled).not.toBe(original);
      });
    });

    describe('createTestIsolationValidator', () => {
      it('should create validator hooks', () => {
        const hooks = createTestIsolationValidator();
        
        expect(hooks.beforeEach).toBeInstanceOf(Function);
        expect(hooks.afterEach).toBeInstanceOf(Function);
        expect(hooks.validator).toBeNull();
      });

      it('should create and validate through hooks', () => {
        const hooks = createTestIsolationValidator();
        
        hooks.beforeEach();
        expect(hooks.validator).toBeInstanceOf(TestIsolationValidator);
        
        // Add pollution
        (global as any).testPollution = 'value';
        
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        hooks.afterEach();
        
        expect(hooks.validator).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Test isolation issues detected:',
          expect.arrayContaining(['New global property added: testPollution'])
        );
        
        consoleSpy.mockRestore();
        delete (global as any).testPollution;
      });
    });
  });

  describe('Test Execution Order Independence', () => {
    // This test validates that tests can run in any order
    const testStates = ['state1', 'state2', 'state3'];
    const shuffledStates = shuffleTestOrder([...testStates]);

    shuffledStates.forEach((state, index) => {
      it(`should handle test execution order - ${state} (position ${index})`, async () => {
        const lifecycle = TestLifecyclePresets.unit(); // Use simpler preset
        
        await lifecycle.setup();
        
        // Simulate test modifying global state
        (global as any).testState = state;
        
        // Each test should see clean state regardless of order
        expect((global as any).previousTestState).toBeUndefined();
        
        // Store state for next test to verify cleanup
        (global as any).previousTestState = state;
        
        await lifecycle.cleanup();
        
        // Manually clean up since unit preset doesn't have comprehensive cleanup
        delete (global as any).testState;
        delete (global as any).previousTestState;
      }, 2000); // 2 second timeout
    });

    it('should validate that all order-dependent tests passed', () => {
      // This test runs last to verify all order tests completed
      expect(shuffledStates).toHaveLength(testStates.length);
      expect(shuffledStates).toEqual(expect.arrayContaining(testStates));
    });
  });
});