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