/**
 * Mock implementation for the logger module
 * This provides a testable version of the logger that captures logs for assertions
 */

import { vi } from 'vitest';
import { Logger, LoggerConfig, LoggerOutputAdapter, LogEntry, LogLevelType } from './logger';

/**
 * Create a mock logger adapter for testing
 * This captures logs for each level and provides utility methods
 */
export function createMockLoggerAdapter() {
  const mockAdapter = {
    calls: new Map<LogLevelType, { message: string, entry: LogEntry }[]>(),
    debug: vi.fn((message: string) => {
      const entry = tryParseJson(message);
      addLogToAdapter('debug', message, entry, mockAdapter.calls);
    }),
    info: vi.fn((message: string) => {
      const entry = tryParseJson(message);
      addLogToAdapter('info', message, entry, mockAdapter.calls);
    }),
    warn: vi.fn((message: string) => {
      const entry = tryParseJson(message);
      addLogToAdapter('warn', message, entry, mockAdapter.calls);
    }),
    error: vi.fn((message: string) => {
      const entry = tryParseJson(message);
      addLogToAdapter('error', message, entry, mockAdapter.calls);
    }),
    reset() {
      this.calls.clear();
      this.debug.mockClear();
      this.info.mockClear();
      this.warn.mockClear();
      this.error.mockClear();
    }
  };
  
  return mockAdapter;
}

/**
 * Helper to safely parse JSON log messages
 */
function tryParseJson(jsonString: string): LogEntry | null {
  try {
    return JSON.parse(jsonString) as LogEntry;
  } catch (e) {
    return null;
  }
}

/**
 * Helper to add a log to the mock adapter's call map
 */
function addLogToAdapter(
  level: LogLevelType, 
  message: string, 
  entry: LogEntry | null,
  callsMap: Map<LogLevelType, { message: string, entry: LogEntry }[]>
) {
  if (!callsMap.has(level)) {
    callsMap.set(level, []);
  }
  callsMap.get(level)!.push({ message, entry: entry as LogEntry });
}

/**
 * Create a test logger with the provided mock adapter
 */
export function createTestLogger(config: LoggerConfig = {}, mockAdapter?: LoggerOutputAdapter) {
  const adapter = mockAdapter || createMockLoggerAdapter();
  return new Logger(config, adapter);
}

/**
 * Setup mocking for the logger module in tests
 * This creates a mock adapter and test logger, replacing the module exports
 */
export function setupLoggerMock() {
  const mockAdapter = createMockLoggerAdapter();
  const testLogger = createTestLogger({}, mockAdapter);
  
  // Mock the logger module
  vi.mock('./logger', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./logger')>();
    
    return {
      ...actual,
      createLogger: vi.fn((_module: string, _config?: any, _adapter?: any) => testLogger),
      logger: testLogger
    };
  });
  
  return { mockAdapter, testLogger };
}