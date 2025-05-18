import { BrowserContext } from '@playwright/test';

export async function forceServiceWorkerRestart(context: BrowserContext, extensionId: string): Promise<void> {
  // We need to navigate to extension context to access chrome.runtime
  // Some extensions might not have index.html, so we'll use the extension's base URL
  const page = await context.newPage();
  
  try {
    // Try index.html first
    await page.goto(`chrome-extension://${extensionId}/index.html`);
  } catch (error) {
    // If that fails, try the base URL
    await page.goto(`chrome-extension://${extensionId}/`);
  }
  
  // Reload the extension
  await page.evaluate(() => {
    chrome.runtime.reload();
  });
  
  // Wait for new service worker
  await context.waitForEvent('serviceworker', {
    predicate: (worker) => worker.url().includes('service-worker'),
    timeout: 10000,
  });
  
  await page.close();
}

export async function getStateFromSW(serviceWorker: any, key: string): Promise<any> {
  return await serviceWorker.evaluate((k: string) => {
    return new Promise((resolve) => {
      chrome.storage.local.get(k, (result) => {
        resolve(result[k]);
      });
    });
  }, key);
}

export async function setStateInSW(serviceWorker: any, key: string, value: any): Promise<void> {
  await serviceWorker.evaluate((k: string, v: any) => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ [k]: v }, () => {
        resolve();
      });
    });
  }, key, value);
}

export async function clearStorageInSW(serviceWorker: any): Promise<void> {
  await serviceWorker.evaluate(() => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  });
}

export async function createAlarmInSW(serviceWorker: any, name: string, alarmInfo: any): Promise<void> {
  await serviceWorker.evaluate((n: string, info: any) => {
    chrome.alarms.create(n, info);
  }, name, alarmInfo);
}

export async function getAlarmFromSW(serviceWorker: any, name: string): Promise<any> {
  return await serviceWorker.evaluate((n: string) => {
    return new Promise((resolve) => {
      chrome.alarms.get(n, (alarm) => {
        resolve(alarm);
      });
    });
  }, name);
}

export async function getAllAlarmsFromSW(serviceWorker: any): Promise<any[]> {
  return await serviceWorker.evaluate(() => {
    return new Promise((resolve) => {
      chrome.alarms.getAll((alarms) => {
        resolve(alarms);
      });
    });
  });
}

export async function clearAllAlarmsInSW(serviceWorker: any): Promise<void> {
  await serviceWorker.evaluate(() => {
    return new Promise<void>((resolve) => {
      chrome.alarms.clearAll(() => {
        resolve();
      });
    });
  });
}

export async function waitForAlarmTrigger(
  serviceWorker: any, 
  alarmName: string, 
  timeout: number = 5000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const triggered = await serviceWorker.evaluate((name: string) => {
      return new Promise((resolve) => {
        chrome.storage.local.get(`alarm_${name}_triggered`, (result) => {
          resolve(result[`alarm_${name}_triggered`] === true);
        });
      });
    }, alarmName);
    
    if (triggered) {
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return false;
}

export async function setupAlarmListener(serviceWorker: any): Promise<void> {
  await serviceWorker.evaluate(() => {
    if (!(globalThis as any).alarmListenerSetup) {
      chrome.alarms.onAlarm.addListener(async (alarm) => {
        await chrome.storage.local.set({ [`alarm_${alarm.name}_triggered`]: true });
      });
      (globalThis as any).alarmListenerSetup = true;
    }
  });
}