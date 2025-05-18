import { test, expect } from '../fixtures/extension';
import { 
  forceServiceWorkerRestart, 
  getStateFromSW, 
  setStateInSW, 
  clearStorageInSW 
} from '../helpers/service-worker';

test.describe('Service Worker State Persistence', () => {
  test.beforeEach(async ({ serviceWorker }) => {
    await clearStorageInSW(serviceWorker);
  });

  test.afterEach(async ({ serviceWorker }) => {
    await clearStorageInSW(serviceWorker);
  });

  test('should persist price data across service worker restart', async ({ context, extensionId, serviceWorker }) => {
    // Set test data
    const testPriceData = {
      usdRate: 45000,
      satoshiRate: 0.00002222,
      timestamp: Date.now(),
    };

    await setStateInSW(serviceWorker, 'btc_price', testPriceData);

    // Verify data was set
    const dataBeforeRestart = await getStateFromSW(serviceWorker, 'btc_price');
    expect(dataBeforeRestart).toEqual(testPriceData);

    // Force service worker restart
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker instance
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify data persisted
    const dataAfterRestart = await getStateFromSW(newServiceWorker, 'btc_price');
    expect(dataAfterRestart).toEqual(testPriceData);
  });

  test('should maintain cache TTL values across restart', async ({ context, extensionId, serviceWorker }) => {
    // Set cache with TTL
    const cacheEntry = {
      data: { usdRate: 50000 },
      ttl: Date.now() + 300000, // 5 minutes from now
    };

    await setStateInSW(serviceWorker, 'price_cache', cacheEntry);

    // Force restart
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify TTL preserved
    const cachedData = await getStateFromSW(newServiceWorker, 'price_cache');
    expect(cachedData.ttl).toBe(cacheEntry.ttl);
    expect(cachedData.data).toEqual(cacheEntry.data);
  });

  test('should handle empty storage across restart', async ({ context, extensionId, serviceWorker }) => {
    // Ensure storage is empty
    const emptyData = await getStateFromSW(serviceWorker, 'nonexistent_key');
    expect(emptyData).toBeUndefined();

    // Force restart
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify still empty
    const stillEmpty = await getStateFromSW(newServiceWorker, 'nonexistent_key');
    expect(stillEmpty).toBeUndefined();
  });

  test('should preserve multiple storage entries', async ({ context, extensionId, serviceWorker }) => {
    // Set multiple entries
    await setStateInSW(serviceWorker, 'entry1', { value: 'test1' });
    await setStateInSW(serviceWorker, 'entry2', { value: 'test2' });
    await setStateInSW(serviceWorker, 'entry3', { value: 'test3' });

    // Force restart
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify all entries preserved
    const entry1 = await getStateFromSW(newServiceWorker, 'entry1');
    const entry2 = await getStateFromSW(newServiceWorker, 'entry2');
    const entry3 = await getStateFromSW(newServiceWorker, 'entry3');

    expect(entry1).toEqual({ value: 'test1' });
    expect(entry2).toEqual({ value: 'test2' });
    expect(entry3).toEqual({ value: 'test3' });
  });

  test('should handle updated values across restart', async ({ context, extensionId, serviceWorker }) => {
    // Set initial value
    await setStateInSW(serviceWorker, 'updateTest', { version: 1 });

    // Update value
    await setStateInSW(serviceWorker, 'updateTest', { version: 2, updated: true });

    // Force restart
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify updated value persisted
    const updatedValue = await getStateFromSW(newServiceWorker, 'updateTest');
    expect(updatedValue).toEqual({ version: 2, updated: true });
  });
});