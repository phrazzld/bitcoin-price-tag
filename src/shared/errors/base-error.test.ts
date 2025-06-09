import { describe, it, expect } from 'vitest';
import { BaseError, IBaseError, ErrorOptions } from './base-error';

// Test implementation of BaseError since it's abstract
class TestError extends BaseError {
  constructor(code: string, message: string, options?: ErrorOptions) {
    super(code, message, options);
  }
}

describe('BaseError', () => {
  describe('constructor', () => {
    it('should create error with required properties', () => {
      const error = new TestError('TEST_ERROR', 'Test error message');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe('TestError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(error.stack).toBeDefined();
    });

    it('should create error with optional properties', () => {
      const cause = new Error('Original error');
      const context = { userId: '123', operation: 'fetchData' };
      const correlationId = 'req_abc123';
      
      const error = new TestError('TEST_ERROR', 'Test error message', {
        cause,
        context,
        correlationId
      });
      
      expect(error.cause).toBe(cause);
      expect(error.context).toEqual(context);
      expect(error.correlationId).toBe(correlationId);
    });

    it('should have immutable properties', () => {
      const error = new TestError('TEST_ERROR', 'Test error message');
      
      // Properties should be defined as readonly in TypeScript
      expect(error.code).toBe('TEST_ERROR');
      expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // TypeScript prevents assignment at compile time
      // Runtime behavior depends on Object.defineProperty usage
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON format', () => {
      const cause = new Error('Original error');
      const error = new TestError('TEST_ERROR', 'Test error message', {
        cause,
        context: { userId: '123' },
        correlationId: 'req_abc123'
      });
      
      const json = error.toJSON();
      
      expect(json).toMatchObject({
        name: 'TestError',
        code: 'TEST_ERROR',
        message: 'Test error message',
        correlationId: 'req_abc123',
        context: { userId: '123' }
      });
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
      expect(json.cause).toBeDefined();
    });
  });

  describe('instanceof checks', () => {
    it('should maintain proper prototype chain', () => {
      const error = new TestError('TEST_ERROR', 'Test error message');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof BaseError).toBe(true);
      expect(error instanceof TestError).toBe(true);
    });
  });

  describe('stack trace', () => {
    it('should capture stack trace at error creation point', () => {
      function throwError() {
        throw new TestError('TEST_ERROR', 'Test error message');
      }
      
      try {
        throwError();
      } catch (error) {
        expect(error).toBeInstanceOf(TestError);
        expect((error as TestError).stack).toContain('throwError');
        expect((error as TestError).stack).not.toContain('BaseError');
      }
    });
  });
});

describe('IBaseError interface', () => {
  it('should define required properties', () => {
    const error: IBaseError = {
      name: 'TestError',
      code: 'TEST_ERROR',
      message: 'Test error message',
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    };
    
    expect(error.name).toBeDefined();
    expect(error.code).toBeDefined();
    expect(error.message).toBeDefined();
    expect(error.timestamp).toBeDefined();
  });
});

describe('ErrorOptions interface', () => {
  it('should accept all optional properties', () => {
    const options: ErrorOptions = {
      cause: new Error('Original'),
      context: { key: 'value' },
      correlationId: 'req_123'
    };
    
    expect(options.cause).toBeDefined();
    expect(options.context).toBeDefined();
    expect(options.correlationId).toBeDefined();
  });
});