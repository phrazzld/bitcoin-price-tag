import { describe, it, expect } from 'vitest';
import { serializeError, deserializeError, sanitizeForLogging } from './serialization';
import { ApiError, ApiErrorCode } from './api-error';
import { ValidationError, ValidationErrorCode } from './validation-error';

describe('serializeError', () => {
  it('should serialize basic error properties', () => {
    const error = new Error('Test error');
    const serialized = serializeError(error);
    
    expect(serialized).toMatchObject({
      name: 'Error',
      message: 'Test error'
    });
    expect(serialized.stack).toBeDefined();
    expect(serialized.timestamp).toBeDefined();
  });

  it('should serialize custom error with all properties', () => {
    const cause = new Error('Original cause');
    const error = new ApiError(
      ApiErrorCode.HTTP_ERROR,
      'Server error',
      {
        context: {
          statusCode: 500,
          endpoint: 'https://api.example.com'
        },
        correlationId: 'req_123',
        cause
      }
    );
    
    const serialized = serializeError(error);
    
    expect(serialized).toMatchObject({
      name: 'ApiError',
      code: 'HTTP_ERROR',
      message: 'Server error',
      correlationId: 'req_123',
      context: {
        statusCode: 500,
        endpoint: 'https://api.example.com'
      }
    });
    expect(serialized.cause).toMatchObject({
      name: 'Error',
      message: 'Original cause'
    });
  });

  it('should handle circular references in context', () => {
    const circular: { value: number; self?: unknown } = { value: 1 };
    circular.self = circular;
    
    const error = new ValidationError(
      ValidationErrorCode.INVALID_TYPE,
      'Circular reference test',
      {
        context: { data: circular }
      }
    );
    
    // Should not throw
    const serialized = serializeError(error);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(serialized.context?.data?.self).toBe('[Circular]');
  });

  it('should handle null and undefined', () => {
    expect(serializeError(null as unknown)).toMatchObject({
      name: 'UnknownError',
      message: 'Unknown error'
    });
    
    expect(serializeError(undefined as unknown)).toMatchObject({
      name: 'UnknownError',
      message: 'Unknown error'
    });
  });

  it('should handle non-Error objects', () => {
    const obj = { error: 'Something went wrong', code: 42 };
    const serialized = serializeError(obj as unknown);
    
    expect(serialized).toMatchObject({
      name: 'UnknownError',
      message: JSON.stringify(obj)
    });
  });

  it('should preserve error chain', () => {
    const rootCause = new Error('Root cause');
    const middleError = new ApiError(ApiErrorCode.NETWORK_ERROR, 'Network failed', {
      cause: rootCause
    });
    const topError = new ApiError(ApiErrorCode.HTTP_ERROR, 'Request failed', {
      cause: middleError
    });
    
    const serialized = serializeError(topError);
    
    expect(serialized.cause?.name).toBe('ApiError');
    expect(serialized.cause?.code).toBe('NETWORK_ERROR');
    expect(serialized.cause?.cause?.name).toBe('Error');
    expect(serialized.cause?.cause?.message).toBe('Root cause');
  });
});

describe('deserializeError', () => {
  it('should reconstruct Error from serialized data', () => {
    const serialized = {
      name: 'Error',
      message: 'Test error',
      stack: 'Error: Test error\n    at test.js:1:1',
      timestamp: new Date().toISOString()
    };
    
    const error = deserializeError(serialized);
    
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
    expect(error.stack).toBe(serialized.stack);
  });

  it('should reconstruct custom error with metadata', () => {
    const serialized = {
      name: 'ApiError',
      code: 'HTTP_ERROR',
      message: 'Server error',
      correlationId: 'req_123',
      context: {
        statusCode: 500,
        endpoint: 'https://api.example.com'
      },
      timestamp: new Date().toISOString(),
      stack: 'ApiError: Server error\n    at test.js:1:1'
    };
    
    const error = deserializeError(serialized);
    
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Server error');
    expect((error as { code: string }).code).toBe('HTTP_ERROR');
    expect((error as { correlationId: string }).correlationId).toBe('req_123');
    expect((error as { context: unknown }).context).toEqual(serialized.context);
  });

  it('should reconstruct error chain', () => {
    const serialized = {
      name: 'ApiError',
      code: 'HTTP_ERROR',
      message: 'Request failed',
      timestamp: new Date().toISOString(),
      cause: {
        name: 'Error',
        message: 'Network timeout',
        timestamp: new Date().toISOString()
      }
    };
    
    const error = deserializeError(serialized);
    
    expect((error as { cause: Error }).cause).toBeInstanceOf(Error);
    expect((error as { cause: Error }).cause.message).toBe('Network timeout');
  });

  it('should handle invalid serialized data', () => {
    const invalid = { invalid: 'data' };
    const error = deserializeError(invalid as unknown);
    
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Unknown error');
  });
});

describe('sanitizeForLogging', () => {
  it('should truncate long strings', () => {
    const longString = 'a'.repeat(300);
    const sanitized = sanitizeForLogging(longString);
    
    expect(sanitized).toHaveLength(215); // 200 + '... (truncated)'
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    expect(sanitized.endsWith('... (truncated)')).toBe(true);
  });

  it('should limit array items', () => {
    const longArray = Array.from({ length: 10 }, (_, i) => i);
    const sanitized = sanitizeForLogging(longArray);
    
    expect(sanitized).toHaveLength(6); // 5 items + summary
    expect(sanitized[5]).toBe('... (5 more items)');
  });

  it('should limit object keys', () => {
    const largeObject = Object.fromEntries(
      Array.from({ length: 15 }, (_, i) => [`key${i}`, i])
    );
    const sanitized = sanitizeForLogging(largeObject);
    
    // Should have at most 10 keys (no extra summary key in current implementation)
    expect(Object.keys(sanitized)).toHaveLength(10);
  });

  it('should handle nested structures', () => {
    const nested = {
      level1: {
        level2: {
          array: Array.from({ length: 10 }, (_, i) => i),
          string: 'a'.repeat(300)
        }
      }
    };
    
    const sanitized = sanitizeForLogging(nested) as {
      level1: {
        level2: {
          array: unknown[];
          string: string;
        };
      };
    };
    
    expect(sanitized.level1.level2.array).toHaveLength(6);
    expect(sanitized.level1.level2.string.endsWith('... (truncated)')).toBe(true);
  });

  it('should handle circular references', () => {
    const circular: { value: number; self?: unknown } = { value: 1 };
    circular.self = circular;
    
    const sanitized = sanitizeForLogging(circular) as { self: string };
    expect(sanitized.self).toBe('[Circular]');
  });

  it('should preserve primitive values', () => {
    expect(sanitizeForLogging(123)).toBe(123);
    expect(sanitizeForLogging(true)).toBe(true);
    expect(sanitizeForLogging(null)).toBe(null);
    expect(sanitizeForLogging(undefined)).toBe(undefined);
  });

  it('should redact sensitive fields', () => {
    const sensitive = {
      password: 'secret123',
      api_key: 'sk_live_abc123',
      token: 'bearer_token',
      credit_card: '4111111111111111',
      normal: 'visible data'
    };
    
    const sanitized = sanitizeForLogging(sensitive);
    
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.api_key).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.credit_card).toBe('[REDACTED]');
    expect(sanitized.normal).toBe('visible data');
  });
});