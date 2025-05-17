/**
 * Mock for Chrome storage API
 * Used to simulate extension storage in tests
 */

import type { LocalStorageCache, PriceData } from '../../src/common/types';
import { PRICE_CACHE_KEY } from '../../src/common/constants';

interface StorageStore {
  [key: string]: any;
}

export interface StorageMockConfig {
  initialData?: StorageStore;
  shouldFail?: boolean;
  failureMessage?: string;
}

export function createStorageMock(config: StorageMockConfig = {}) {
  const { 
    initialData = {}, 
    shouldFail = false, 
    failureMessage = 'Storage error' 
  } = config;
  
  const store: StorageStore = { ...initialData };

  const mockGet = vi.fn().mockImplementation((keys: string | string[] | null | undefined) => {
    if (shouldFail) {
      return Promise.reject(new Error(failureMessage));
    }

    if (keys === null || keys === undefined) {
      return Promise.resolve(store);
    }

    if (typeof keys === 'string') {
      // Return object with key as property name, matching Chrome storage behavior
      return Promise.resolve({ [keys]: store[keys] });
    }

    const result: StorageStore = {};
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        if (key in store) {
          result[key] = store[key];
        }
      });
    }
    
    return Promise.resolve(result);
  });

  const mockSet = vi.fn().mockImplementation((items: StorageStore) => {
    if (shouldFail) {
      return Promise.reject(new Error(failureMessage));
    }

    Object.assign(store, items);
    return Promise.resolve();
  });

  const mockRemove = vi.fn().mockImplementation((keys: string | string[]) => {
    if (shouldFail) {
      return Promise.reject(new Error(failureMessage));
    }

    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => delete store[key]);
    
    return Promise.resolve();
  });

  const mockClear = vi.fn().mockImplementation(() => {
    if (shouldFail) {
      return Promise.reject(new Error(failureMessage));
    }

    Object.keys(store).forEach(key => delete store[key]);
    return Promise.resolve();
  });

  return {
    get: mockGet,
    set: mockSet,
    remove: mockRemove,
    clear: mockClear,
    // Expose store for testing
    getStore: () => store,
  };
}

export function createStorageWithCache(priceData: PriceData, ageMs: number = 0) {
  const now = Date.now();
  const cache: LocalStorageCache = {
    priceData,
    cachedAt: now - ageMs,
    version: 1,
  };

  return createStorageMock({
    initialData: {
      [PRICE_CACHE_KEY]: cache,
    },
  });
}

export function createEmptyStorage() {
  return createStorageMock();
}

export function createFailingStorage(message = 'Storage error') {
  return createStorageMock({
    shouldFail: true,
    failureMessage: message,
  });
}