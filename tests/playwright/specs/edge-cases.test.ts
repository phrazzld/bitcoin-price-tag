import { test, expect } from '../fixtures/extension';
import { 
  forceServiceWorkerRestart, 
  getStateFromSW, 
  setStateInSW,
  createAlarmInSW,
  clearStorageInSW,
  clearAllAlarmsInSW
} from '../helpers/service-worker';

test.describe('Edge Cases for Service Worker Persistence', () => {
  test.beforeEach(async ({ serviceWorker }) => {
    await clearStorageInSW(serviceWorker);
    await clearAllAlarmsInSW(serviceWorker);
  });

  test.afterEach(async ({ serviceWorker }) => {
    await clearStorageInSW(serviceWorker);
    await clearAllAlarmsInSW(serviceWorker);
  });

  test('should handle multiple rapid restarts', async ({ context, extensionId, serviceWorker }) => {
    // Set initial state
    const testData = { 
      value: 'persistent', 
      timestamp: Date.now(),
      restartCount: 0 
    };
    await setStateInSW(serviceWorker, 'rapidTest', testData);

    // Perform multiple rapid restarts
    for (let i = 0; i < 3; i++) {
      await forceServiceWorkerRestart(context, extensionId);
      
      // Get new service worker
      const newServiceWorker = await context.waitForEvent('serviceworker', {
        predicate: (worker) => worker.url().includes('service-worker'),
      });

      // Verify and update state
      const data = await getStateFromSW(newServiceWorker, 'rapidTest');
      expect(data.value).toBe('persistent');
      expect(data.timestamp).toBe(testData.timestamp);
      
      // Update restart count
      data.restartCount = i + 1;
      await setStateInSW(newServiceWorker, 'rapidTest', data);
    }

    // Final verification
    const finalSW = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });
    const finalData = await getStateFromSW(finalSW, 'rapidTest');
    expect(finalData.restartCount).toBe(3);
  });

  test('should handle large data persistence', async ({ context, extensionId, serviceWorker }) => {
    // Create large data object
    const largeData = {
      arrays: Array(100).fill(null).map((_, i) => ({
        id: i,
        data: `Item ${i}`,
        nested: { value: i * 2 }
      })),
      metadata: {
        created: Date.now(),
        version: '1.0.0',
        description: 'A'.repeat(1000) // Long string
      }
    };

    await setStateInSW(serviceWorker, 'largeData', largeData);

    // Force restart
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify large data persisted correctly
    const retrievedData = await getStateFromSW(newServiceWorker, 'largeData');
    expect(retrievedData.arrays).toHaveLength(100);
    expect(retrievedData.arrays[50].id).toBe(50);
    expect(retrievedData.metadata.description.length).toBe(1000);
  });

  test('should handle corrupted storage gracefully', async ({ context, extensionId, serviceWorker }) => {
    // Set valid data first
    await setStateInSW(serviceWorker, 'validData', { status: 'ok' });

    // Attempt to simulate corruption by setting invalid JSON-like structure
    // Note: Chrome storage API typically handles serialization, so we test edge cases
    const edgeCaseData = {
      circular: null as any,
      undefined: undefined,
      function: () => {}, // Functions are typically stripped
      symbol: Symbol('test'), // Symbols are typically stripped
    };
    edgeCaseData.circular = edgeCaseData; // Create circular reference

    try {
      await setStateInSW(serviceWorker, 'edgeCase', edgeCaseData);
    } catch (_error) {
      // Expected - some values might fail
    }

    // Force restart
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify valid data still accessible
    const validData = await getStateFromSW(newServiceWorker, 'validData');
    expect(validData).toEqual({ status: 'ok' });

    // Check edge case data (may be stripped or modified)
    const retrievedEdgeCase = await getStateFromSW(newServiceWorker, 'edgeCase');
    if (retrievedEdgeCase) {
      expect(typeof retrievedEdgeCase.function).not.toBe('function');
      expect(retrievedEdgeCase.symbol).toBeUndefined();
    }
  });

  test('should maintain state during concurrent operations', async ({ context, extensionId, serviceWorker }) => {
    // Start multiple concurrent operations
    const operations = [];
    
    // Concurrent writes
    for (let i = 0; i < 5; i++) {
      operations.push(setStateInSW(serviceWorker, `concurrent_${i}`, { value: i }));
    }
    
    // Concurrent alarm creation
    for (let i = 0; i < 3; i++) {
      operations.push(createAlarmInSW(serviceWorker, `concurrentAlarm_${i}`, { 
        delayInMinutes: 10 + i 
      }));
    }

    // Wait for all operations
    await Promise.all(operations);

    // Force restart while operations might still be settling
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify all data persisted
    for (let i = 0; i < 5; i++) {
      const data = await getStateFromSW(newServiceWorker, `concurrent_${i}`);
      expect(data).toEqual({ value: i });
    }
  });

  test('should handle restart during storage operation', async ({ context, extensionId, serviceWorker }) => {
    // Start a storage operation and restart immediately
    const _storagePromise = setStateInSW(serviceWorker, 'racyWrite', { 
      timestamp: Date.now(),
      data: 'test'
    });

    // Don't wait for completion - restart immediately
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // The write might or might not have completed
    const data = await getStateFromSW(newServiceWorker, 'racyWrite');
    
    // If data exists, it should be valid
    if (data) {
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('data');
    }
    
    // Ensure we can still write after the race condition
    await setStateInSW(newServiceWorker, 'afterRace', { status: 'ok' });
    const afterData = await getStateFromSW(newServiceWorker, 'afterRace');
    expect(afterData).toEqual({ status: 'ok' });
  });
});