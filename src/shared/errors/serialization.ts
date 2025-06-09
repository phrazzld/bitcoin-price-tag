/**
 * Error serialization utilities for cross-context communication and logging
 * 
 * Handles:
 * - Converting errors to JSON-safe format
 * - Preserving error chains
 * - Handling circular references
 * - Sanitizing sensitive data
 * - Reconstructing errors from serialized data
 */

import { SerializedError } from './base-error';

/**
 * Set of field names that should be redacted in logs
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'apiKey',
  'api_key',
  'token',
  'secret',
  'creditCard',
  'credit_card',
  'ssn',
  'authorization',
  'auth'
]);

/**
 * Checks if a field name contains sensitive data
 */
function isSensitiveField(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_FIELDS.has(lowerKey) || 
         Array.from(SENSITIVE_FIELDS).some(field => lowerKey.includes(field));
}

/**
 * Sanitizes data for logging by redacting sensitive fields and truncating large values
 * 
 * @param data The data to sanitize
 * @param visited Set of visited objects to handle circular references
 * @returns Sanitized copy of the data
 */
export function sanitizeForLogging(data: unknown, visited = new WeakSet()): unknown {
  // Handle primitives
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string') {
    return data.length > 200 
      ? data.substring(0, 200) + '... (truncated)'
      : data;
  }
  
  if (typeof data !== 'object') {
    return data;
  }
  
  // Handle circular references
  if (visited.has(data)) {
    return '[Circular]';
  }
  visited.add(data);
  
  try {
    // Handle arrays
    if (Array.isArray(data)) {
      if (data.length > 5) {
        return [
          ...data.slice(0, 5).map(item => sanitizeForLogging(item, visited)),
          `... (${data.length - 5} more items)`
        ];
      }
      return data.map(item => sanitizeForLogging(item, visited));
    }
    
    // Handle objects
    const sanitized: Record<string, unknown> = {};
    const dataAsRecord = data as Record<string, unknown>;
    const keys = Object.keys(dataAsRecord);
    const maxKeys = 10;
    
    keys.slice(0, maxKeys).forEach(key => {
      if (isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLogging(dataAsRecord[key], visited);
      }
    });
    
    return sanitized;
  } catch (_e) {
    return '[Error sanitizing]';
  } finally {
    visited.delete(data);
  }
}

/**
 * Serializes an error to a JSON-safe format
 * 
 * Handles:
 * - Standard Error properties
 * - Custom error properties (code, context, etc.)
 * - Error chains (cause)
 * - Circular references
 * - Non-Error objects
 * 
 * @param error The error to serialize
 * @returns Serialized error object
 */
export function serializeError(error: unknown): SerializedError {
  // Handle null/undefined
  if (!error) {
    return {
      name: 'UnknownError',
      message: 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
  
  // Handle non-Error objects
  if (!(error instanceof Error)) {
    return {
      name: 'UnknownError',
      message: typeof error === 'string' ? error : JSON.stringify(error),
      timestamp: new Date().toISOString()
    };
  }
  
  // Build serialized error
  const errorAsRecord = error as unknown as Record<string, unknown>;
  
  // Build the serialized object with all properties
  const serialized: Record<string, unknown> = {
    name: error.name || 'Error',
    message: error.message || 'Unknown error',
    timestamp: (typeof errorAsRecord.timestamp === 'string' ? errorAsRecord.timestamp : new Date().toISOString())
  };

  // Add optional properties conditionally
  if (error.stack) {
    serialized.stack = error.stack;
  }
  
  if (typeof errorAsRecord.code === 'string') {
    serialized.code = errorAsRecord.code;
  }
  
  if (typeof errorAsRecord.correlationId === 'string') {
    serialized.correlationId = errorAsRecord.correlationId;
  }
  
  if (errorAsRecord.context) {
    try {
      serialized.context = sanitizeForLogging(errorAsRecord.context);
    } catch (_e) {
      serialized.context = { error: 'Failed to serialize context' };
    }
  }
  
  if (errorAsRecord.cause) {
    serialized.cause = serializeError(errorAsRecord.cause);
  }
  
  return serialized as unknown as SerializedError;
}

/**
 * Reconstructs an Error object from serialized data
 * 
 * Note: This creates a generic Error with properties attached.
 * The specific error type (ApiError, ValidationError, etc.) is not preserved.
 * This is primarily used for logging and debugging, not for instanceof checks.
 * 
 * @param serialized The serialized error data
 * @returns Reconstructed Error object
 */
export function deserializeError(serialized: SerializedError): Error {
  // Validate input
  if (!serialized || typeof serialized !== 'object') {
    return new Error('Unknown error');
  }
  
  // Create base error
  const error = new Error(serialized.message || 'Unknown error');
  error.name = serialized.name || 'Error';
  
  // Restore stack if available
  if (serialized.stack) {
    error.stack = serialized.stack;
  }
  
  // Attach additional properties
  const errorAsRecord = error as unknown as Record<string, unknown>;
  
  if (serialized.code) {
    errorAsRecord.code = serialized.code;
  }
  
  if (serialized.timestamp) {
    errorAsRecord.timestamp = serialized.timestamp;
  }
  
  if (serialized.correlationId) {
    errorAsRecord.correlationId = serialized.correlationId;
  }
  
  if (serialized.context) {
    errorAsRecord.context = serialized.context;
  }
  
  // Reconstruct error chain
  if (serialized.cause) {
    errorAsRecord.cause = deserializeError(serialized.cause);
  }
  
  return error;
}