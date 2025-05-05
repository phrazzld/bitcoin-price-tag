/**
 * Chrome API mocks for testing
 */

// Create a mock for chrome.runtime
globalThis.chrome = {
  runtime: {
    sendMessage: vi.fn((message, callback) => {
      if (typeof callback === 'function') {
        callback({
          btcPrice: 50000,
          satPrice: 0.0005,
          timestamp: Date.now(),
          source: 'test',
        });
      }
    }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
    getURL: vi.fn((path) => `chrome-extension://test-extension-id/${path}`),
    id: 'test-extension-id',
  },
  storage: {
    local: {
      get: vi.fn((key, callback) => {
        if (typeof callback === 'function') {
          callback({ [key]: null });
        }
      }),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
};

// Add Node to the global for tests that need to check instanceof Node
if (typeof globalThis.Node === 'undefined') {
  globalThis.Node = class Node {};
  globalThis.Node.ELEMENT_NODE = 1;
  globalThis.Node.ATTRIBUTE_NODE = 2;
  globalThis.Node.TEXT_NODE = 3;
  globalThis.Node.CDATA_SECTION_NODE = 4;
  globalThis.Node.PROCESSING_INSTRUCTION_NODE = 7;
  globalThis.Node.COMMENT_NODE = 8;
  globalThis.Node.DOCUMENT_NODE = 9;
  globalThis.Node.DOCUMENT_TYPE_NODE = 10;
  globalThis.Node.DOCUMENT_FRAGMENT_NODE = 11;
}

// Add AbortController for the fetch tests
if (typeof globalThis.AbortController === 'undefined') {
  globalThis.AbortController = class AbortController {
    constructor() {
      this.signal = { aborted: false };
    }

    abort() {
      this.signal.aborted = true;
    }
  };
}

// Add diagnostic helper to check CSP in the DOM
globalThis.document = globalThis.document || {
  querySelector: vi.fn(),
  createElement: vi.fn(() => ({
    textContent: '',
    src: '',
    onerror: null,
    onload: null,
    type: '',
    className: '',
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    classList: {
      add: vi.fn(),
      contains: vi.fn(),
    },
  })),
  head: {
    appendChild: vi.fn(),
  },
  documentElement: {
    appendChild: vi.fn(),
  },
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  chrome.runtime.lastError = null;
});
