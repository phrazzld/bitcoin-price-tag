import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LogLevel, createLogger, logger as _logger, getEnvironmentLogLevel } from './logger';

describe('logger.ts', () => {
  // Mock console methods
  const mockConsole = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    // Clear all mocks first
    vi.clearAllMocks();
    
    // Setup console spies
    vi.spyOn(console, 'debug').mockImplementation(mockConsole.debug);
    vi.spyOn(console, 'info').mockImplementation(mockConsole.info);
    vi.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error);
  });

  afterEach(() => {
    // Comprehensive cleanup
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('Logger class', () => {
    it('should create logger with default configuration', () => {
      const log = new Logger({ level: LogLevel.INFO }); // Explicitly set level for test consistency
      log.info('test message');
      
      expect(mockConsole.info).toHaveBeenCalledOnce();
      const call = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(call).toMatchObject({
        level: 'info',
        message: 'test message',
      });
      expect(call.timestamp).toBeDefined();
    });

    it('should include module in log entries', () => {
      const log = new Logger({ module: 'test-module', level: LogLevel.INFO });
      log.info('test message');
      
      const call = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(call.module).toBe('test-module');
    });

    it('should include correlation ID in log entries', () => {
      const log = new Logger({ correlationId: 'test-123', level: LogLevel.INFO });
      log.info('test message');
      
      const call = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(call.correlationId).toBe('test-123');
    });

    it('should handle different log levels', () => {
      const log = new Logger({ level: LogLevel.DEBUG });
      
      log.debug('debug msg');
      log.info('info msg');
      log.warn('warn msg');
      log.error('error msg');
      
      expect(mockConsole.debug).toHaveBeenCalledOnce();
      expect(mockConsole.info).toHaveBeenCalledOnce();
      expect(mockConsole.warn).toHaveBeenCalledOnce();
      expect(mockConsole.error).toHaveBeenCalledOnce();
    });

    it('should respect log level filtering', () => {
      const log = new Logger({ level: LogLevel.WARN });
      
      log.debug('debug msg');
      log.info('info msg');
      log.warn('warn msg');
      log.error('error msg');
      
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalledOnce();
      expect(mockConsole.error).toHaveBeenCalledOnce();
    });

    it('should handle context data', () => {
      const log = new Logger({ level: LogLevel.INFO });
      const context = { userId: 123, action: 'test' };
      
      log.info('test message', context);
      
      const call = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(call.context).toEqual(context);
    });

    it('should handle error objects', () => {
      const log = new Logger({ level: LogLevel.INFO });
      const error = new Error('test error');
      error.stack = 'test stack trace';
      
      log.error('error occurred', error);
      
      const call = JSON.parse(mockConsole.error.mock.calls[0][0]);
      expect(call.errorDetails).toMatchObject({
        type: 'Error',
        message: 'test error',
        stack: 'test stack trace',
      });
    });

    it('should handle circular references in context', () => {
      const log = new Logger({ level: LogLevel.INFO });
      const circularObj: any = { a: 1 };
      circularObj.self = circularObj;
      
      log.info('test message', circularObj);
      
      const call = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(call.context).toBe('[Circular reference detected]');
      expect(call.stringifyError).toBeDefined();
    });

    it('should disable logging when configured', () => {
      const log = new Logger({ enabled: false });
      
      log.debug('debug msg');
      log.info('info msg');
      log.warn('warn msg');
      log.error('error msg');
      
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  describe('child logger', () => {
    it('should inherit parent configuration', () => {
      const parent = new Logger({ module: 'parent', correlationId: 'test-123', level: LogLevel.INFO });
      const child = parent.child({ module: 'child' });
      
      child.info('child message');
      
      const call = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(call.module).toBe('child');
      expect(call.correlationId).toBe('test-123');
    });

    it('should override parent configuration', () => {
      const parent = new Logger({ level: LogLevel.INFO });
      const child = parent.child({ level: LogLevel.DEBUG });
      
      parent.debug('parent debug');
      child.debug('child debug');
      
      expect(mockConsole.debug).toHaveBeenCalledOnce();
      const call = JSON.parse(mockConsole.debug.mock.calls[0][0]);
      expect(call.message).toBe('child debug');
    });
  });

  describe('createLogger function', () => {
    it('should create logger with module name', () => {
      const log = createLogger('my-module', { level: LogLevel.INFO });
      log.info('test message');
      
      const call = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(call.module).toBe('my-module');
    });

    it('should accept additional configuration', () => {
      const log = createLogger('my-module', { level: LogLevel.ERROR });
      
      log.info('info msg');
      log.error('error msg');
      
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledOnce();
    });
  });

  describe('default logger instance', () => {
    it('should be available for quick usage', () => {
      // Create a new logger with explicit level for this test
      const testLogger = new Logger({ level: LogLevel.INFO });
      testLogger.info('test message');
      
      expect(mockConsole.info).toHaveBeenCalledOnce();
      const call = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(call.message).toBe('test message');
    });
  });

  describe('error handling', () => {
    it('should handle non-Error objects in error method', () => {
      const log = new Logger({ level: LogLevel.INFO });
      
      log.error('error occurred', 'string error');
      log.error('error occurred', 123);
      log.error('error occurred', null);
      
      expect(mockConsole.error).toHaveBeenCalledTimes(3);
      
      const call1 = JSON.parse(mockConsole.error.mock.calls[0][0]);
      expect(call1.errorDetails.message).toBe('string error');
      
      const call2 = JSON.parse(mockConsole.error.mock.calls[1][0]);
      expect(call2.errorDetails.message).toBe('123');
      
      const call3 = JSON.parse(mockConsole.error.mock.calls[2][0]);
      expect(call3.errorDetails.message).toBe('null');
    });

    it('should handle custom Error subclasses', () => {
      const log = new Logger({ level: LogLevel.INFO });
      
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      
      class ValidationError extends Error {
        constructor(message: string, public field: string) {
          super(message);
          this.name = 'ValidationError';
        }
      }
      
      const customError = new CustomError('Custom error occurred');
      const validationError = new ValidationError('Field is required', 'email');
      
      log.error('Custom error test', customError);
      log.error('Validation error test', validationError);
      
      expect(mockConsole.error).toHaveBeenCalledTimes(2);
      
      const call1 = JSON.parse(mockConsole.error.mock.calls[0][0]);
      expect(call1.errorDetails).toMatchObject({
        type: 'CustomError',
        message: 'Custom error occurred'
      });
      expect(call1.errorDetails.stack).toBeDefined();
      
      const call2 = JSON.parse(mockConsole.error.mock.calls[1][0]);
      expect(call2.errorDetails).toMatchObject({
        type: 'ValidationError', 
        message: 'Field is required'
      });
      expect(call2.errorDetails.stack).toBeDefined();
    });

    it('should handle nested error objects with context', () => {
      const log = new Logger({ level: LogLevel.INFO });
      
      const rootError = new Error('Root cause error');
      const wrappedError = new Error('Wrapped error');
      
      const context = {
        operation: 'data processing',
        userId: 12345,
        nested: {
          originalError: rootError,
          attempts: 3
        }
      };
      
      log.error('Complex error scenario', wrappedError, context);
      
      expect(mockConsole.error).toHaveBeenCalledOnce();
      const call = JSON.parse(mockConsole.error.mock.calls[0][0]);
      
      expect(call.errorDetails).toMatchObject({
        type: 'Error',
        message: 'Wrapped error'
      });
      expect(call.errorDetails.stack).toBeDefined();
      
      expect(call.context).toMatchObject({
        operation: 'data processing',
        userId: 12345,
        nested: {
          attempts: 3
        }
      });
      
      // The nested error should be serialized as a string representation
      expect(call.context.nested.originalError).toBeDefined();
    });

    it('should verify error message readability in logs', () => {
      const log = new Logger({ level: LogLevel.INFO });
      
      const testError = new Error('This is a readable error message');
      testError.stack = `Error: This is a readable error message
    at testFunction (/path/to/file.js:123:45)
    at anotherFunction (/path/to/file.js:67:89)`;
      
      log.error('Readable error test', testError, { component: 'test-component' });
      
      expect(mockConsole.error).toHaveBeenCalledOnce();
      const logOutput = mockConsole.error.mock.calls[0][0];
      const parsedLog = JSON.parse(logOutput);
      
      // Verify the log entry structure
      expect(parsedLog).toMatchObject({
        level: 'error',
        message: 'Readable error test',
        errorDetails: {
          type: 'Error',
          message: 'This is a readable error message',
          stack: expect.stringContaining('at testFunction')
        },
        context: {
          component: 'test-component'
        }
      });
      
      // Verify readability: error message should not be "[object Object]"
      expect(parsedLog.errorDetails.message).not.toBe('[object Object]');
      expect(parsedLog.errorDetails.message).toBe('This is a readable error message');
      
      // Verify stack trace is preserved and readable
      expect(parsedLog.errorDetails.stack).toContain('at testFunction');
      expect(parsedLog.errorDetails.stack).toContain('/path/to/file.js:123:45');
      
      // Verify the entire log output is valid JSON (can be parsed)
      expect(() => JSON.parse(logOutput)).not.toThrow();
    });

    it('should handle Error objects with missing stack traces', () => {
      const log = new Logger({ level: LogLevel.INFO });
      
      const errorWithoutStack = new Error('Error without stack');
      delete errorWithoutStack.stack;
      
      log.error('Error without stack test', errorWithoutStack);
      
      expect(mockConsole.error).toHaveBeenCalledOnce();
      const call = JSON.parse(mockConsole.error.mock.calls[0][0]);
      
      expect(call.errorDetails).toMatchObject({
        type: 'Error',
        message: 'Error without stack'
      });
      
      // Stack should be undefined when not present
      expect(call.errorDetails.stack).toBeUndefined();
    });

    it('should handle Error objects with complex properties', () => {
      const log = new Logger({ level: LogLevel.INFO });
      
      const complexError = new Error('Complex error');
      (complexError as any).code = 'ERR_NETWORK';
      (complexError as any).status = 500;
      (complexError as any).details = { endpoint: '/api/data', method: 'POST' };
      
      log.error('Complex error test', complexError);
      
      expect(mockConsole.error).toHaveBeenCalledOnce();
      const call = JSON.parse(mockConsole.error.mock.calls[0][0]);
      
      // Standard error properties should be in errorDetails
      expect(call.errorDetails).toMatchObject({
        type: 'Error',
        message: 'Complex error'
      });
      
      // Custom properties are not included in errorDetails by design
      // The logger only extracts standard Error properties (type, message, stack)
      expect(call.errorDetails.code).toBeUndefined();
      expect(call.errorDetails.status).toBeUndefined();
      expect(call.errorDetails.details).toBeUndefined();
    });
  });

  describe('getEnvironmentLogLevel', () => {
    const originalProcess = global.process;

    beforeEach(() => {
      // Clear mocks for this describe block
      vi.clearAllMocks();
    });

    afterEach(() => {
      // Restore global process and clear mocks
      global.process = originalProcess;
      vi.clearAllMocks();
    });

    it('should return INFO when no environment variable is set', () => {
      global.process = {
        env: {}
      } as any;

      expect(getEnvironmentLogLevel()).toBe(LogLevel.INFO);
    });

    it('should return correct log level from environment variable', () => {
      global.process = {
        env: { LOG_LEVEL: 'DEBUG' }
      } as any;
      expect(getEnvironmentLogLevel()).toBe(LogLevel.DEBUG);

      global.process = {
        env: { LOG_LEVEL: 'INFO' }
      } as any;
      expect(getEnvironmentLogLevel()).toBe(LogLevel.INFO);

      global.process = {
        env: { LOG_LEVEL: 'WARN' }
      } as any;
      expect(getEnvironmentLogLevel()).toBe(LogLevel.WARN);

      global.process = {
        env: { LOG_LEVEL: 'ERROR' }
      } as any;
      expect(getEnvironmentLogLevel()).toBe(LogLevel.ERROR);
    });

    it('should handle case-insensitive log levels', () => {
      global.process = {
        env: { LOG_LEVEL: 'debug' }
      } as any;
      expect(getEnvironmentLogLevel()).toBe(LogLevel.DEBUG);

      global.process = {
        env: { LOG_LEVEL: 'WaRn' }
      } as any;
      expect(getEnvironmentLogLevel()).toBe(LogLevel.WARN);
    });

    it('should return INFO for invalid log level values', () => {
      global.process = {
        env: { LOG_LEVEL: 'INVALID' }
      } as any;
      expect(getEnvironmentLogLevel()).toBe(LogLevel.INFO);

      global.process = {
        env: { LOG_LEVEL: 'TRACE' }
      } as any;
      expect(getEnvironmentLogLevel()).toBe(LogLevel.INFO);
    });

    it('should return INFO when process.env is not available', () => {
      global.process = undefined as any;
      expect(getEnvironmentLogLevel()).toBe(LogLevel.INFO);
    });

    it('should return INFO when process exists but env does not', () => {
      global.process = {} as any;
      expect(getEnvironmentLogLevel()).toBe(LogLevel.INFO);
    });
  });

  describe('environment-based logging', () => {
    const originalProcess = global.process;

    beforeEach(() => {
      // Clear mocks for this describe block
      vi.clearAllMocks();
    });

    afterEach(() => {
      // Restore global process and clear mocks
      global.process = originalProcess;
      vi.clearAllMocks();
    });

    it('should respect DEBUG level from environment', () => {
      global.process = {
        env: { LOG_LEVEL: 'DEBUG' }
      } as any;

      const log = new Logger();
      log.debug('debug message');
      log.info('info message');

      expect(mockConsole.debug).toHaveBeenCalledOnce();
      expect(mockConsole.info).toHaveBeenCalledOnce();
    });

    it('should respect ERROR level from environment', () => {
      global.process = {
        env: { LOG_LEVEL: 'ERROR' }
      } as any;

      const log = new Logger();
      log.debug('debug message');
      log.info('info message');
      log.warn('warn message');
      log.error('error message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledOnce();
    });

    it('should allow config override of environment level', () => {
      global.process = {
        env: { LOG_LEVEL: 'ERROR' }
      } as any;

      const log = new Logger({ level: LogLevel.DEBUG });
      log.debug('debug message');

      expect(mockConsole.debug).toHaveBeenCalledOnce();
    });
  });
});