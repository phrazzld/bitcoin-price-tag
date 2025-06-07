/**
 * Comprehensive schema validation system for Chrome API messages and external data
 * 
 * This module provides deep, recursive validation for all inter-component communication
 * and external API responses. It's designed with security as the primary concern,
 * implementing zero-trust validation principles.
 * 
 * Security Features:
 * - Deep recursive validation prevents property injection attacks
 * - Type coercion protection prevents JavaScript's implicit conversions
 * - Comprehensive logging of validation failures for security monitoring
 * - Fail-safe defaults - invalid data is rejected, never coerced
 */

import { createLogger } from '../shared/logger';
import { 
  PriceRequestMessage, 
  PriceResponseMessage, 
  PriceData, 
  CoinGeckoApiResponse
} from './types';

const logger = createLogger('common/schema-validation');

/**
 * Validation result with detailed error information
 */
export interface ValidationResult<T = unknown> {
  readonly isValid: boolean;
  readonly data?: T;
  readonly errors: readonly ValidationError[];
}

/**
 * Detailed validation error with path information
 */
export interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly code: ValidationErrorCode;
  readonly actualValue?: unknown;
  readonly expectedType?: string;
}

/**
 * Validation error codes for categorizing security issues
 */
export enum ValidationErrorCode {
  MISSING_PROPERTY = 'missing_property',
  INVALID_TYPE = 'invalid_type',
  INVALID_VALUE = 'invalid_value',
  EXTRA_PROPERTY = 'extra_property',
  NESTED_VALIDATION_FAILED = 'nested_validation_failed',
  EMPTY_STRING = 'empty_string',
  NEGATIVE_NUMBER = 'negative_number',
  INVALID_TIMESTAMP = 'invalid_timestamp',
  INVALID_ENUM_VALUE = 'invalid_enum_value'
}

/**
 * Context for validation operations
 */
interface ValidationContext {
  readonly path: string;
  readonly errors: ValidationError[];
  readonly strictMode: boolean; // When true, extra properties cause validation failure
}

/**
 * Primitive type validators with security considerations
 */
class PrimitiveValidators {
  /**
   * Validates string with security checks
   */
  static validateString(value: unknown, context: ValidationContext, allowEmpty = false): boolean {
    if (typeof value !== 'string') {
      context.errors.push({
        path: context.path,
        message: `Expected string, got ${typeof value}`,
        code: ValidationErrorCode.INVALID_TYPE,
        actualValue: value,
        expectedType: 'string'
      });
      return false;
    }

    if (!allowEmpty && value.length === 0) {
      context.errors.push({
        path: context.path,
        message: 'String cannot be empty',
        code: ValidationErrorCode.EMPTY_STRING,
        actualValue: value
      });
      return false;
    }

    return true;
  }

  /**
   * Validates number with security and range checks
   */
  static validateNumber(value: unknown, context: ValidationContext, options: {
    allowNegative?: boolean;
    allowZero?: boolean;
    finite?: boolean;
  } = {}): boolean {
    const { allowNegative = false, allowZero = true, finite = true } = options;

    if (typeof value !== 'number') {
      context.errors.push({
        path: context.path,
        message: `Expected number, got ${typeof value}`,
        code: ValidationErrorCode.INVALID_TYPE,
        actualValue: value,
        expectedType: 'number'
      });
      return false;
    }

    if (finite && !Number.isFinite(value)) {
      context.errors.push({
        path: context.path,
        message: `Number must be finite (not NaN, Infinity, or -Infinity)`,
        code: ValidationErrorCode.INVALID_VALUE,
        actualValue: value
      });
      return false;
    }

    if (!allowNegative && value < 0) {
      context.errors.push({
        path: context.path,
        message: 'Number cannot be negative',
        code: ValidationErrorCode.NEGATIVE_NUMBER,
        actualValue: value
      });
      return false;
    }

    if (!allowZero && value === 0) {
      context.errors.push({
        path: context.path,
        message: 'Number cannot be zero',
        code: ValidationErrorCode.INVALID_VALUE,
        actualValue: value
      });
      return false;
    }

    return true;
  }

  /**
   * Validates timestamp with reasonable bounds
   */
  static validateTimestamp(value: unknown, context: ValidationContext): boolean {
    if (!this.validateNumber(value, context, { allowNegative: false, allowZero: false })) {
      return false;
    }

    const timestamp = value as number;
    const now = Date.now();
    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);

    if (timestamp < oneYearAgo || timestamp > oneYearFromNow) {
      context.errors.push({
        path: context.path,
        message: 'Timestamp outside reasonable range (1 year ago to 1 year from now)',
        code: ValidationErrorCode.INVALID_TIMESTAMP,
        actualValue: value
      });
      return false;
    }

    return true;
  }

  /**
   * Validates enum value with strict checking
   */
  static validateEnum<T extends string>(
    value: unknown, 
    context: ValidationContext, 
    allowedValues: readonly T[]
  ): value is T {
    if (!this.validateString(value, context)) {
      return false;
    }

    const stringValue = value as string;
    if (!allowedValues.includes(stringValue as T)) {
      context.errors.push({
        path: context.path,
        message: `Invalid enum value. Expected one of: ${allowedValues.join(', ')}`,
        code: ValidationErrorCode.INVALID_ENUM_VALUE,
        actualValue: value,
        expectedType: `enum(${allowedValues.join('|')})`
      });
      return false;
    }

    return true;
  }
}

/**
 * Object validation utilities with security-first approach
 */
class ObjectValidators {
  /**
   * Validates object structure with strict property checking
   */
  static validateObject(value: unknown, context: ValidationContext): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      context.errors.push({
        path: context.path,
        message: `Expected non-null object, got ${Array.isArray(value) ? 'array' : typeof value}`,
        code: ValidationErrorCode.INVALID_TYPE,
        actualValue: value,
        expectedType: 'object'
      });
      return false;
    }

    return true;
  }

  /**
   * Validates required properties exist
   */
  static validateRequiredProperties(
    obj: Record<string, unknown>, 
    context: ValidationContext,
    requiredProps: readonly string[]
  ): boolean {
    let valid = true;
    
    for (const prop of requiredProps) {
      if (!(prop in obj)) {
        context.errors.push({
          path: `${context.path}.${prop}`,
          message: `Required property '${prop}' is missing`,
          code: ValidationErrorCode.MISSING_PROPERTY,
          expectedType: 'any'
        });
        valid = false;
      }
    }

    return valid;
  }

  /**
   * Validates no extra properties exist (security-critical)
   */
  static validateNoExtraProperties(
    obj: Record<string, unknown>,
    context: ValidationContext,
    allowedProps: readonly string[]
  ): boolean {
    if (!context.strictMode) return true;

    const allowedSet = new Set(allowedProps);
    
    // Get all enumerable properties
    const ownProps = Object.keys(obj);
    
    // Additional security check for common pollution vectors
    const dangerousProps = ['__proto__', 'constructor', 'prototype'];
    const allPropsToCheck = [...ownProps];
    
    // Check for dangerous properties that are explicitly set as own properties
    for (const dangerousProp of dangerousProps) {
      if (Object.prototype.hasOwnProperty.call(obj, dangerousProp) && !allowedSet.has(dangerousProp)) {
        allPropsToCheck.push(dangerousProp);
      }
    }
    
    const extraProps = [...new Set(allPropsToCheck)].filter(key => !allowedSet.has(key));

    if (extraProps.length > 0) {
      for (const prop of extraProps) {
        context.errors.push({
          path: `${context.path}.${prop}`,
          message: `Unexpected property '${prop}' found`,
          code: ValidationErrorCode.EXTRA_PROPERTY,
          actualValue: obj[prop]
        });
      }
      return false;
    }

    return true;
  }
}

/**
 * Schema validators for specific message types
 */
export class MessageValidators {
  /**
   * Validates PriceRequestMessage with comprehensive security checks
   */
  static validatePriceRequestMessage(value: unknown, strictMode = true): ValidationResult<PriceRequestMessage> {
    const context: ValidationContext = {
      path: 'PriceRequestMessage',
      errors: [],
      strictMode
    };

    // Basic object validation
    if (!ObjectValidators.validateObject(value, context)) {
      return { isValid: false, errors: context.errors };
    }

    const obj = value;
    const requiredProps = ['type', 'requestId', 'timestamp'] as const;
    const allowedProps = requiredProps;

    // Validate required properties
    if (!ObjectValidators.validateRequiredProperties(obj, context, requiredProps)) {
      return { isValid: false, errors: context.errors };
    }

    // Validate no extra properties (security-critical)
    if (!ObjectValidators.validateNoExtraProperties(obj, context, allowedProps)) {
      return { isValid: false, errors: context.errors };
    }

    // Deep validation of each property
    let valid = true;

    // Validate type
    const typeContext = { ...context, path: 'PriceRequestMessage.type' };
    if (!PrimitiveValidators.validateEnum(obj.type, typeContext, ['PRICE_REQUEST'] as const)) {
      valid = false;
    }

    // Validate requestId
    const requestIdContext = { ...context, path: 'PriceRequestMessage.requestId' };
    if (!PrimitiveValidators.validateString(obj.requestId, requestIdContext)) {
      valid = false;
    }

    // Validate timestamp
    const timestampContext = { ...context, path: 'PriceRequestMessage.timestamp' };
    if (!PrimitiveValidators.validateTimestamp(obj.timestamp, timestampContext)) {
      valid = false;
    }

    if (!valid) {
      return { isValid: false, errors: context.errors };
    }

    // If we get here, the message is valid
    return {
      isValid: true,
      data: obj as PriceRequestMessage,
      errors: []
    };
  }

  /**
   * Validates PriceData with comprehensive checks
   */
  static validatePriceData(value: unknown, strictMode = true): ValidationResult<PriceData> {
    const context: ValidationContext = {
      path: 'PriceData',
      errors: [],
      strictMode
    };

    if (!ObjectValidators.validateObject(value, context)) {
      return { isValid: false, errors: context.errors };
    }

    const obj = value;
    const requiredProps = ['usdRate', 'satoshiRate', 'fetchedAt', 'source'] as const;
    const allowedProps = requiredProps;

    if (!ObjectValidators.validateRequiredProperties(obj, context, requiredProps)) {
      return { isValid: false, errors: context.errors };
    }

    if (!ObjectValidators.validateNoExtraProperties(obj, context, allowedProps)) {
      return { isValid: false, errors: context.errors };
    }

    let valid = true;

    // Validate usdRate (positive number)
    const usdRateContext = { ...context, path: 'PriceData.usdRate' };
    if (!PrimitiveValidators.validateNumber(obj.usdRate, usdRateContext, { allowZero: false })) {
      valid = false;
    }

    // Validate satoshiRate (positive number)
    const satoshiRateContext = { ...context, path: 'PriceData.satoshiRate' };
    if (!PrimitiveValidators.validateNumber(obj.satoshiRate, satoshiRateContext, { allowZero: false })) {
      valid = false;
    }

    // Validate fetchedAt (timestamp)
    const fetchedAtContext = { ...context, path: 'PriceData.fetchedAt' };
    if (!PrimitiveValidators.validateTimestamp(obj.fetchedAt, fetchedAtContext)) {
      valid = false;
    }

    // Validate source (non-empty string)
    const sourceContext = { ...context, path: 'PriceData.source' };
    if (!PrimitiveValidators.validateString(obj.source, sourceContext)) {
      valid = false;
    }

    if (!valid) {
      return { isValid: false, errors: context.errors };
    }

    return {
      isValid: true,
      data: obj as PriceData,
      errors: []
    };
  }

  /**
   * Validates PriceResponseMessage with conditional schema based on status
   */
  static validatePriceResponseMessage(value: unknown, strictMode = true): ValidationResult<PriceResponseMessage> {
    const context: ValidationContext = {
      path: 'PriceResponseMessage',
      errors: [],
      strictMode
    };

    if (!ObjectValidators.validateObject(value, context)) {
      return { isValid: false, errors: context.errors };
    }

    const obj = value;
    const requiredProps = ['type', 'requestId', 'status', 'timestamp'] as const;

    if (!ObjectValidators.validateRequiredProperties(obj, context, requiredProps)) {
      return { isValid: false, errors: context.errors };
    }

    let valid = true;

    // Validate type
    const typeContext = { ...context, path: 'PriceResponseMessage.type' };
    if (!PrimitiveValidators.validateEnum(obj.type, typeContext, ['PRICE_RESPONSE'] as const)) {
      valid = false;
    }

    // Validate requestId
    const requestIdContext = { ...context, path: 'PriceResponseMessage.requestId' };
    if (!PrimitiveValidators.validateString(obj.requestId, requestIdContext)) {
      valid = false;
    }

    // Validate status
    const statusContext = { ...context, path: 'PriceResponseMessage.status' };
    if (!PrimitiveValidators.validateEnum(obj.status, statusContext, ['success', 'error'] as const)) {
      valid = false;
    }

    // Validate timestamp
    const timestampContext = { ...context, path: 'PriceResponseMessage.timestamp' };
    if (!PrimitiveValidators.validateTimestamp(obj.timestamp, timestampContext)) {
      valid = false;
    }

    if (!valid) {
      return { isValid: false, errors: context.errors };
    }

    // Conditional validation based on status
    const status = obj.status as 'success' | 'error';
    let allowedProps: readonly string[];

    if (status === 'success') {
      allowedProps = [...requiredProps, 'data'] as const;
      
      // Must have data, must not have error
      if (!('data' in obj)) {
        context.errors.push({
          path: 'PriceResponseMessage.data',
          message: 'Success response must include data property',
          code: ValidationErrorCode.MISSING_PROPERTY
        });
        valid = false;
      } else {
        // Validate data deeply
        const dataResult = MessageValidators.validatePriceData(obj.data, strictMode);
        if (!dataResult.isValid) {
          context.errors.push(...dataResult.errors);
          valid = false;
        }
      }

      if ('error' in obj) {
        context.errors.push({
          path: 'PriceResponseMessage.error',
          message: 'Success response must not include error property',
          code: ValidationErrorCode.EXTRA_PROPERTY,
          actualValue: obj.error
        });
        valid = false;
      }
    } else {
      // status === 'error'
      allowedProps = [...requiredProps, 'error'] as const;

      // Must have error, must not have data
      if (!('error' in obj)) {
        context.errors.push({
          path: 'PriceResponseMessage.error',
          message: 'Error response must include error property',
          code: ValidationErrorCode.MISSING_PROPERTY
        });
        valid = false;
      } else {
        // Validate error object
        const errorResult = MessageValidators.validateErrorObject(obj.error, strictMode);
        if (!errorResult.isValid) {
          context.errors.push(...errorResult.errors);
          valid = false;
        }
      }

      if ('data' in obj) {
        context.errors.push({
          path: 'PriceResponseMessage.data',
          message: 'Error response must not include data property',
          code: ValidationErrorCode.EXTRA_PROPERTY,
          actualValue: obj.data
        });
        valid = false;
      }
    }

    // Validate no extra properties
    if (!ObjectValidators.validateNoExtraProperties(obj, context, allowedProps)) {
      valid = false;
    }

    if (!valid) {
      return { isValid: false, errors: context.errors };
    }

    return {
      isValid: true,
      data: obj as PriceResponseMessage,
      errors: []
    };
  }

  /**
   * Validates error object structure
   */
  static validateErrorObject(value: unknown, strictMode = true): ValidationResult<{ message: string; code: string }> {
    const context: ValidationContext = {
      path: 'ErrorObject',
      errors: [],
      strictMode
    };

    if (!ObjectValidators.validateObject(value, context)) {
      return { isValid: false, errors: context.errors };
    }

    const obj = value;
    const requiredProps = ['message', 'code'] as const;
    const allowedProps = requiredProps;

    if (!ObjectValidators.validateRequiredProperties(obj, context, requiredProps)) {
      return { isValid: false, errors: context.errors };
    }

    if (!ObjectValidators.validateNoExtraProperties(obj, context, allowedProps)) {
      return { isValid: false, errors: context.errors };
    }

    let valid = true;

    // Validate message
    const messageContext = { ...context, path: 'ErrorObject.message' };
    if (!PrimitiveValidators.validateString(obj.message, messageContext)) {
      valid = false;
    }

    // Validate code
    const codeContext = { ...context, path: 'ErrorObject.code' };
    if (!PrimitiveValidators.validateString(obj.code, codeContext)) {
      valid = false;
    }

    if (!valid) {
      return { isValid: false, errors: context.errors };
    }

    return {
      isValid: true,
      data: obj as { message: string; code: string },
      errors: []
    };
  }

  /**
   * Validates CoinGecko API response with security checks
   */
  static validateCoinGeckoApiResponse(value: unknown, strictMode = true): ValidationResult<CoinGeckoApiResponse> {
    const context: ValidationContext = {
      path: 'CoinGeckoApiResponse',
      errors: [],
      strictMode
    };

    if (!ObjectValidators.validateObject(value, context)) {
      return { isValid: false, errors: context.errors };
    }

    const obj = value;
    const requiredProps = ['bitcoin'] as const;
    const allowedProps = strictMode ? requiredProps : undefined;

    if (!ObjectValidators.validateRequiredProperties(obj, context, requiredProps)) {
      return { isValid: false, errors: context.errors };
    }

    if (allowedProps && !ObjectValidators.validateNoExtraProperties(obj, context, allowedProps)) {
      return { isValid: false, errors: context.errors };
    }

    // Validate bitcoin object
    const bitcoinContext: ValidationContext = {
      path: 'CoinGeckoApiResponse.bitcoin',
      errors: context.errors,
      strictMode
    };

    if (!ObjectValidators.validateObject(obj.bitcoin, bitcoinContext)) {
      return { isValid: false, errors: context.errors };
    }

    const bitcoinObj = obj.bitcoin;
    const bitcoinRequiredProps = ['usd'] as const;
    const bitcoinAllowedProps = strictMode ? bitcoinRequiredProps : undefined;

    if (!ObjectValidators.validateRequiredProperties(bitcoinObj, bitcoinContext, bitcoinRequiredProps)) {
      return { isValid: false, errors: context.errors };
    }

    if (bitcoinAllowedProps && !ObjectValidators.validateNoExtraProperties(bitcoinObj, bitcoinContext, bitcoinAllowedProps)) {
      return { isValid: false, errors: context.errors };
    }

    // Validate usd price
    const usdContext = { ...context, path: 'CoinGeckoApiResponse.bitcoin.usd' };
    if (!PrimitiveValidators.validateNumber(bitcoinObj.usd, usdContext, { allowZero: false })) {
      return { isValid: false, errors: context.errors };
    }

    return {
      isValid: true,
      data: obj as CoinGeckoApiResponse,
      errors: []
    };
  }
}

/**
 * High-level validation functions with security logging
 */
export class SecureValidation {
  /**
   * Validates and logs security-relevant validation failures
   */
  static validateWithSecurityLogging<T>(
    value: unknown,
    validator: (value: unknown, strictMode?: boolean) => ValidationResult<T>,
    context: { operation: string; source?: string; sender?: object },
    strictMode = true
  ): ValidationResult<T> {
    const result = validator(value, strictMode);

    if (!result.isValid) {
      // Log security-relevant validation failures
      logger.warn('Message validation failed', {
        operation: context.operation,
        source: context.source,
        sender: context.sender,
        errorCount: result.errors.length,
        errors: result.errors.map(error => ({
          path: error.path,
          code: error.code,
          message: error.message,
          hasActualValue: error.actualValue !== undefined
        }))
      });
    }

    return result;
  }

  /**
   * Validates Chrome runtime message with comprehensive security checks
   */
  static validateChromeMessage(
    message: unknown,
    sender: chrome.runtime.MessageSender,
    expectedType: 'PRICE_REQUEST' | 'PRICE_RESPONSE'
  ): ValidationResult<PriceRequestMessage | PriceResponseMessage> {
    const context = {
      operation: 'chrome_message_validation',
      source: 'chrome_runtime',
      sender: {
        tab: sender.tab ? { id: sender.tab.id, url: sender.tab.url } : undefined,
        frameId: sender.frameId,
        origin: sender.origin
      }
    };

    if (expectedType === 'PRICE_REQUEST') {
      return this.validateWithSecurityLogging(
        message,
        (value, strictMode) => MessageValidators.validatePriceRequestMessage(value, strictMode),
        context,
        true // Always use strict mode for incoming messages
      );
    } else {
      return this.validateWithSecurityLogging(
        message,
        (value, strictMode) => MessageValidators.validatePriceResponseMessage(value, strictMode),
        context,
        true
      );
    }
  }

  /**
   * Validates external API response with security checks
   */
  static validateApiResponse<T>(
    response: unknown,
    validator: (value: unknown, strictMode?: boolean) => ValidationResult<T>,
    apiSource: string
  ): ValidationResult<T> {
    const context = {
      operation: 'api_response_validation',
      source: apiSource
    };

    return this.validateWithSecurityLogging(
      response,
      validator,
      context,
      false // Use non-strict mode for API responses (may have extra fields)
    );
  }
}