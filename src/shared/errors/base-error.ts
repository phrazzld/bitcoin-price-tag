/**
 * Base error interfaces and abstract class for the Bitcoin Price Tag extension
 * 
 * Provides a consistent error structure across all error types with support for:
 * - Error codes for categorization
 * - Rich context for debugging
 * - Error chaining with cause tracking
 * - Correlation IDs for request tracing
 * - Proper serialization for cross-context communication
 */

import { serializeError } from './serialization';

/**
 * Base interface for all application errors
 * Provides consistent structure and required metadata
 */
export interface IBaseError extends Error {
  readonly name: string;                // Error constructor name
  readonly code: string;                // Unique error code for categorization
  readonly message: string;             // Human-readable error message
  readonly context?: Record<string, unknown>; // Additional error context
  readonly cause?: Error;               // Original error that caused this one
  readonly timestamp: string;           // ISO 8601 UTC timestamp when error occurred
  readonly correlationId?: string;      // Request correlation ID
}

/**
 * Options for creating errors with additional metadata
 */
export interface ErrorOptions {
  readonly cause?: Error;                    // Original error that caused this one
  readonly context?: Record<string, unknown>;    // Additional debugging context
  readonly correlationId?: string;           // Request/operation correlation ID
}

/**
 * Serialized error format for cross-context communication and logging
 */
export interface SerializedError {
  readonly name: string;
  readonly message: string;
  readonly code?: string;
  readonly stack?: string;
  readonly timestamp: string;
  readonly correlationId?: string;
  readonly context?: unknown;
  readonly cause?: SerializedError;
}

/**
 * Abstract base class for all custom errors in the extension
 * 
 * Provides common functionality for:
 * - Consistent error structure
 * - Automatic timestamp generation
 * - Stack trace capture
 * - JSON serialization
 * 
 * All custom error types should extend this class
 */
export abstract class BaseError extends Error implements IBaseError {
  readonly name: string;
  readonly code: string;
  readonly timestamp: string;
  readonly correlationId?: string;
  readonly context?: Record<string, unknown>;
  readonly cause?: Error;

  constructor(
    code: string,
    message: string,
    options?: ErrorOptions
  ) {
    super(message);
    
    // Set the name to the actual constructor name
    this.name = this.constructor.name;
    
    // Set readonly properties
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.correlationId = options?.correlationId;
    this.context = options?.context;
    this.cause = options?.cause;
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts the error to a JSON-serializable format
   * Used for cross-context communication and logging
   */
  toJSON(): SerializedError {
    return serializeError(this);
  }
}