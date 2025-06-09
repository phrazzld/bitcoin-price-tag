import { finalTest as test, expect } from '../fixtures/extension-final';
import { 
  forceServiceWorkerRestart, 
  createAlarmInSW, 
  getAlarmFromSW, 
  getAllAlarmsFromSW,
  clearAllAlarmsInSW,
  setupAlarmListener,
  waitForAlarmTrigger,
  clearStorageInSW
} from '../helpers/service-worker';

test.describe('Service Worker Alarm Persistence', () => {
  test.beforeEach(async ({ serviceWorker }) => {
    await clearAllAlarmsInSW(serviceWorker);
    await clearStorageInSW(serviceWorker);
    await setupAlarmListener(serviceWorker);
  });

  test.afterEach(async ({ serviceWorker }) => {
    await clearAllAlarmsInSW(serviceWorker);
    await clearStorageInSW(serviceWorker);
  });

  test('should persist alarm configuration across restart', async ({ extensionContext, extensionId, serviceWorker }) => {
    // Create test alarm
    const alarmName = 'testAlarm';
    const alarmInfo = {
      delayInMinutes: 5,
      periodInMinutes: 10,
    };

    await createAlarmInSW(serviceWorker, alarmName, alarmInfo);

    // Verify alarm created
    const alarmBefore = await getAlarmFromSW(serviceWorker, alarmName);
    expect(alarmBefore).toBeTruthy();
    expect(alarmBefore.name).toBe(alarmName);
    expect(alarmBefore.periodInMinutes).toBe(10);

    // Force restart
    await forceServiceWorkerRestart(extensionContext, extensionId);

    // Get new service worker
    const newServiceWorker = await extensionContext.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify alarm persisted
    const alarmAfter = await getAlarmFromSW(newServiceWorker, alarmName);
    expect(alarmAfter).toBeTruthy();
    expect(alarmAfter.name).toBe(alarmName);
    expect(alarmAfter.periodInMinutes).toBe(10);
  });

  test('should maintain multiple alarms across restart', async ({ extensionContext, extensionId, serviceWorker }) => {
    // Create multiple alarms
    await createAlarmInSW(serviceWorker, 'alarm1', { delayInMinutes: 1 });
    await createAlarmInSW(serviceWorker, 'alarm2', { delayInMinutes: 2 });
    await createAlarmInSW(serviceWorker, 'alarm3', { periodInMinutes: 5 });

    // Verify all created
    const alarmsBefore = await getAllAlarmsFromSW(serviceWorker);
    expect(alarmsBefore).toHaveLength(3);

    // Force restart
    await forceServiceWorkerRestart(extensionContext, extensionId);

    // Get new service worker
    const newServiceWorker = await extensionContext.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify all persisted
    const alarmsAfter = await getAllAlarmsFromSW(newServiceWorker);
    expect(alarmsAfter).toHaveLength(3);
    expect(alarmsAfter.map(a => a.name).sort()).toEqual(['alarm1', 'alarm2', 'alarm3']);
  });

  test('should trigger alarm after restart', async ({ extensionContext, extensionId, serviceWorker }) => {
    // Create alarm with short delay (0.02 minutes = 1.2 seconds)
    const alarmName = 'quickTrigger';
    await createAlarmInSW(serviceWorker, alarmName, { delayInMinutes: 0.02 });

    // Force restart immediately
    await forceServiceWorkerRestart(extensionContext, extensionId);

    // Get new service worker
    const newServiceWorker = await extensionContext.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Setup listener again for the new service worker
    await setupAlarmListener(newServiceWorker);

    // Wait for alarm to trigger
    const triggered = await waitForAlarmTrigger(newServiceWorker, alarmName, 5000);
    expect(triggered).toBe(true);
  });

  test('should handle empty alarm state across restart', async ({ extensionContext, extensionId, serviceWorker }) => {
    // Verify no alarms
    const alarmsBefore = await getAllAlarmsFromSW(serviceWorker);
    expect(alarmsBefore).toHaveLength(0);

    // Force restart
    await forceServiceWorkerRestart(extensionContext, extensionId);

    // Get new service worker
    const newServiceWorker = await extensionContext.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Verify still no alarms
    const alarmsAfter = await getAllAlarmsFromSW(newServiceWorker);
    expect(alarmsAfter).toHaveLength(0);
  });

  test('should preserve periodic alarm timing', async ({ extensionContext, extensionId, serviceWorker }) => {
    // Create periodic alarm
    const alarmName = 'periodicAlarm';
    await createAlarmInSW(serviceWorker, alarmName, { 
      delayInMinutes: 0.02, // 1.2 seconds
      periodInMinutes: 1 
    });

    // Wait for first trigger
    const firstTrigger = await waitForAlarmTrigger(serviceWorker, alarmName, 3000);
    expect(firstTrigger).toBe(true);

    // Clear the trigger flag
    await serviceWorker.evaluate((name: string) => {
      chrome.storage.local.remove(`alarm_${name}_triggered`);
    }, alarmName);

    // Force restart
    await forceServiceWorkerRestart(extensionContext, extensionId);

    // Get new service worker
    const newServiceWorker = await extensionContext.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes('service-worker'),
    });

    // Setup listener for new worker
    await setupAlarmListener(newServiceWorker);

    // Verify alarm still exists and is periodic
    const alarmAfter = await getAlarmFromSW(newServiceWorker, alarmName);
    expect(alarmAfter).toBeTruthy();
    expect(alarmAfter.periodInMinutes).toBe(1);
  });
});