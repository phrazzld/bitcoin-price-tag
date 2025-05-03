/**
 * Chrome API mocks for testing
 */

// Create a mock for chrome.runtime
globalThis.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  chrome.runtime.lastError = null;
});