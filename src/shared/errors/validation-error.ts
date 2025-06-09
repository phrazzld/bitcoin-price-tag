/**
 * Validation error class and utilities for data validation failures
 */

import { BaseError, ErrorOptions } from './base-error';

/**
 * Error codes for validation-related errors
 */
export enum ValidationErrorCode {
  INVALID_TYPE = 'INVALID_TYPE',               // Type mismatch
  MISSING_FIELD = 'MISSING_FIELD',             // Required field missing
  INVALID_FORMAT = 'INVALID_FORMAT',           // Format validation failed
  OUT_OF_RANGE = 'OUT_OF_RANGE',               // Value outside acceptable range
  INVALID_ENUM = 'INVALID_ENUM',               // Invalid enumeration value
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION' // Business rule violation
}

/**
 * Validation error context interface
 */
export interface ValidationErrorContext {
  readonly field?: string;
  readonly expectedType?: string;
  readonly receivedType?: string;
  readonly value?: unknown;
  readonly min?: number;
  readonly max?: number;
  readonly allowedValues?: unknown[];
  readonly format?: string;
  readonly pattern?: string;
  readonly constraint?: string;
  readonly required?: boolean;
  readonly [key: string]: unknown;
}

/**
 * Error class for data validation failures
 * 
 * Includes field paths, expected vs received values, and validation constraints
 */
export class ValidationError extends BaseError {

  constructor(
    code: ValidationErrorCode,
    message: string,
    options?: ErrorOptions & { context?: ValidationErrorContext }
  ) {
    super(code, message, options);
  }

  /**
   * Gets the field path from the error context
   */
  getFieldPath(): string | undefined {
    return (this.context as ValidationErrorContext)?.field;
  }

  /**
   * Checks if this error is for a specific field
   */
  isFieldError(fieldName: string): boolean {
    const fieldPath = this.getFieldPath();
    return fieldPath === fieldName || fieldPath?.endsWith(`.${fieldName}`) === true;
  }
}

/**
 * Factory function parameters for creating validation errors
 */
export interface ValidationErrorParams {
  readonly field?: string;
  readonly expectedType?: string;
  readonly receivedValue?: unknown;
  readonly receivedType?: string;
  readonly min?: number;
  readonly max?: number;
  readonly allowedValues?: unknown[];
  readonly format?: string;
  readonly pattern?: string;
  readonly constraint?: string;
  readonly required?: boolean;
  readonly value?: unknown;
}

/**
 * Factory function to create ValidationError with appropriate code and message
 * 
 * @param params Validation error parameters
 * @returns ValidationError instance with appropriate code and message
 */
export function createValidationError(params: ValidationErrorParams): ValidationError {
  const { field, expectedType, receivedType, receivedValue, min, max, allowedValues, format, required } = params;
  
  // Determine error code and message based on parameters
  let code: ValidationErrorCode;
  let message: string;
  
  if (required && (receivedValue === undefined || receivedValue === null)) {
    code = ValidationErrorCode.MISSING_FIELD;
    message = field ? `Required field '${field}' is missing` : 'Required field is missing';
  } else if (expectedType && receivedType && expectedType !== receivedType) {
    code = ValidationErrorCode.INVALID_TYPE;
    message = field 
      ? `Field '${field}' expected ${expectedType} but received ${receivedType}`
      : `Expected ${expectedType} but received ${receivedType}`;
  } else if (min !== undefined || max !== undefined) {
    code = ValidationErrorCode.OUT_OF_RANGE;
    const value = String(params.value ?? receivedValue);
    if (min !== undefined && max !== undefined) {
      message = field 
        ? `Field '${field}' value ${value} is outside range [${min}, ${max}]`
        : `Value ${value} is outside range [${min}, ${max}]`;
    } else if (min !== undefined) {
      message = field 
        ? `Field '${field}' value ${value} is below minimum ${min}`
        : `Value ${value} is below minimum ${min}`;
    } else {
      message = field 
        ? `Field '${field}' value ${value} exceeds maximum ${max}`
        : `Value ${value} exceeds maximum ${max}`;
    }
  } else if (allowedValues && allowedValues.length > 0) {
    code = ValidationErrorCode.INVALID_ENUM;
    const value = String(params.value ?? receivedValue);
    const allowedValuesStr = allowedValues.map(v => String(v)).join(', ');
    message = field 
      ? `Field '${field}' value '${value}' is not one of allowed values: ${allowedValuesStr}`
      : `Value '${value}' is not one of allowed values: ${allowedValuesStr}`;
  } else if (format) {
    code = ValidationErrorCode.INVALID_FORMAT;
    message = field 
      ? `Field '${field}' has invalid ${format} format`
      : `Invalid ${format} format`;
  } else {
    code = ValidationErrorCode.CONSTRAINT_VIOLATION;
    message = field 
      ? `Field '${field}' violates validation constraint`
      : 'Validation constraint violation';
  }
  
  return new ValidationError(code, message, {
    context: {
      field,
      expectedType,
      receivedType,
      value: params.value ?? receivedValue,
      min,
      max,
      allowedValues,
      format,
      pattern: params.pattern,
      constraint: params.constraint,
      required
    }
  });
}