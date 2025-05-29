/**
 * Chrome API test builders using satisfies operator for type safety
 */

import { vi } from 'vitest';

/**
 * Create a mock chrome.runtime.sendMessage function
 */
export const createMockSendMessage = () => 
  vi.fn().mockImplementation((message, callback) => {
    if (callback) callback(undefined);
  });

/**
 * Create a mock chrome.runtime.onMessage event
 */
export const createMockOnMessage = () => ({
  addListener: vi.fn(),
  removeListener: vi.fn(),
  hasListener: vi.fn().mockReturnValue(false),
} satisfies chrome.runtime.ExtensionMessageEvent);

/**
 * Create a mock chrome.runtime API
 */
export const createMockChromeRuntime = (overrides?: Partial<chrome.runtime.Runtime>) => ({
  sendMessage: createMockSendMessage(),
  onMessage: createMockOnMessage(),
  lastError: undefined,
  id: 'test-extension-id',
  getManifest: vi.fn().mockReturnValue({ version: '1.0.0' }),
  getURL: vi.fn((path: string) => `chrome-extension://test-extension-id/${path}`),
  ...overrides
} satisfies Partial<chrome.runtime.Runtime>);

/**
 * Create a mock chrome.storage.StorageArea
 */
export const createMockStorageArea = (initialData: Record<string, any> = {}) => {
  const storage = { ...initialData };
  
  return {
    get: vi.fn().mockImplementation((keys, callback) => {
      const result: Record<string, any> = {};
      const keyArray = Array.isArray(keys) ? keys : [keys];
      keyArray.forEach(key => {
        if (key in storage) result[key] = storage[key];
      });
      if (callback) callback(result);
      return Promise.resolve(result);
    }),
    set: vi.fn().mockImplementation((items, callback) => {
      Object.assign(storage, items);
      if (callback) callback();
      return Promise.resolve();
    }),
    remove: vi.fn().mockImplementation((keys, callback) => {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      keyArray.forEach(key => delete storage[key]);
      if (callback) callback();
      return Promise.resolve();
    }),
    clear: vi.fn().mockImplementation((callback) => {
      Object.keys(storage).forEach(key => delete storage[key]);
      if (callback) callback();
      return Promise.resolve();
    }),
  } satisfies chrome.storage.StorageArea;
};

/**
 * Create a mock chrome.storage API
 */
export const createMockChromeStorage = () => ({
  local: createMockStorageArea(),
  sync: createMockStorageArea(),
  managed: createMockStorageArea(),
  session: createMockStorageArea(),
} satisfies chrome.storage.Static);

/**
 * Create a mock chrome.alarms.Alarm
 */
export const createMockAlarm = (name: string, overrides?: Partial<chrome.alarms.Alarm>) => ({
  name,
  scheduledTime: Date.now() + 60000, // 1 minute from now
  periodInMinutes: undefined,
  ...overrides
} satisfies chrome.alarms.Alarm);

/**
 * Create a mock chrome.alarms API
 */
export const createMockChromeAlarms = () => ({
  create: vi.fn(),
  get: vi.fn().mockResolvedValue(undefined),
  getAll: vi.fn().mockResolvedValue([]),
  clear: vi.fn().mockResolvedValue(true),
  clearAll: vi.fn().mockResolvedValue(true),
  onAlarm: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn().mockReturnValue(false),
  } satisfies chrome.alarms.AlarmEvent,
} satisfies chrome.alarms.Alarms);

/**
 * Create a complete mock chrome API
 */
export const createMockChrome = (overrides?: {
  runtime?: Partial<chrome.runtime.Runtime>;
  storage?: Partial<chrome.storage.Static>;
  alarms?: Partial<chrome.alarms.Alarms>;
}) => ({
  runtime: createMockChromeRuntime(overrides?.runtime),
  storage: createMockChromeStorage(),
  alarms: createMockChromeAlarms(),
} satisfies Partial<typeof chrome>);