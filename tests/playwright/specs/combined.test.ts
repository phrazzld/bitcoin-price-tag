import { test, expect } from '../fixtures/extension';
import { 
  forceServiceWorkerRestart, 
  getStateFromSW, 
  setStateInSW,
  createAlarmInSW,
  getAlarmFromSW,
  clearStorageInSW,
  clearAllAlarmsInSW,
  setupAlarmListener,
  waitForAlarmTrigger
} from '../helpers/service-worker';

test.describe('Combined State and Alarm Persistence', () => {
  test.beforeEach(async ({ serviceWorker }) => {
    await clearStorageInSW(serviceWorker);
    await clearAllAlarmsInSW(serviceWorker);
    await setupAlarmListener(serviceWorker);
  });

  test.afterEach(async ({ serviceWorker }) => {
    await clearStorageInSW(serviceWorker);
    await clearAllAlarmsInSW(serviceWorker);
  });

  test('should persist state and alarms together', async ({ context, extensionId, serviceWorker }) => {
    // Set state
    const testData = {
      priceCache: { usdRate: 55000, timestamp: Date.now() },
      settings: { refreshInterval: 300000 },
    };
    await setStateInSW(serviceWorker, 'priceData', testData.priceCache);
    await setStateInSW(serviceWorker, 'settings', testData.settings);

    // Create alarms
    await createAlarmInSW(serviceWorker, 'refreshPrice', { periodInMinutes: 5 });
    await createAlarmInSW(serviceWorker, 'cleanup', { delayInMinutes: 60 });

    // Force restart
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify state persisted
    const priceData = await getStateFromSW(newServiceWorker, 'priceData');
    const settings = await getStateFromSW(newServiceWorker, 'settings');
    expect(priceData).toEqual(testData.priceCache);
    expect(settings).toEqual(testData.settings);

    // Verify alarms persisted
    const refreshAlarm = await getAlarmFromSW(newServiceWorker, 'refreshPrice');
    const cleanupAlarm = await getAlarmFromSW(newServiceWorker, 'cleanup');
    expect(refreshAlarm).toBeTruthy();
    expect(refreshAlarm.periodInMinutes).toBe(5);
    expect(cleanupAlarm).toBeTruthy();
  });

  test('should handle alarm trigger updating state after restart', async ({ context, extensionId, serviceWorker }) => {
    // Set initial state
    await setStateInSW(serviceWorker, 'updateCount', 0);

    // Create alarm with short delay
    await createAlarmInSW(serviceWorker, 'updateAlarm', { delayInMinutes: 0.02 });

    // Add custom listener that increments count
    await serviceWorker.evaluate(() => {
      chrome.alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name === 'updateAlarm') {
          const result = await chrome.storage.local.get('updateCount');
          const currentCount = result.updateCount || 0;
          await chrome.storage.local.set({ updateCount: currentCount + 1 });
        }
      });
    });

    // Force restart
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Re-add the custom listener
    await newServiceWorker.evaluate(() => {
      chrome.alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name === 'updateAlarm') {
          const result = await chrome.storage.local.get('updateCount');
          const currentCount = result.updateCount || 0;
          await chrome.storage.local.set({ updateCount: currentCount + 1 });
        }
      });
    });

    // Wait for alarm to trigger
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if count was incremented
    const count = await getStateFromSW(newServiceWorker, 'updateCount');
    expect(count).toBe(1);
  });

  test('should maintain cache rehydration pattern', async ({ context, extensionId, serviceWorker }) => {
    // Simulate cache structure as used by the extension
    const cacheData = {
      btc_price: {
        usdRate: 60000,
        satoshiRate: 0.00001667,
        timestamp: Date.now(),
      },
      cache_ttl: Date.now() + 300000, // 5 minutes
    };

    await setStateInSW(serviceWorker, 'btc_price', cacheData.btc_price);
    await setStateInSW(serviceWorker, 'cache_ttl', cacheData.cache_ttl);

    // Force restart
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify cache structure preserved
    const priceData = await getStateFromSW(newServiceWorker, 'btc_price');
    const ttl = await getStateFromSW(newServiceWorker, 'cache_ttl');
    
    expect(priceData).toEqual(cacheData.btc_price);
    expect(ttl).toBe(cacheData.cache_ttl);
  });

  test('should handle rapid updates before restart', async ({ context, extensionId, serviceWorker }) => {
    // Perform rapid updates
    for (let i = 0; i < 5; i++) {
      await setStateInSW(serviceWorker, 'counter', i);
      await setStateInSW(serviceWorker, `item_${i}`, { value: i * 10 });
    }

    // Create multiple alarms
    for (let i = 0; i < 3; i++) {
      await createAlarmInSW(serviceWorker, `alarm_${i}`, { delayInMinutes: i + 1 });
    }

    // Force restart
    await forceServiceWorkerRestart(context, extensionId);

    // Get new service worker
    const newServiceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify final state
    const counter = await getStateFromSW(newServiceWorker, 'counter');
    expect(counter).toBe(4); // Last value

    // Check some items
    const item2 = await getStateFromSW(newServiceWorker, 'item_2');
    expect(item2).toEqual({ value: 20 });

    // Verify alarms
    const alarm1 = await getAlarmFromSW(newServiceWorker, 'alarm_1');
    expect(alarm1).toBeTruthy();
  });
});