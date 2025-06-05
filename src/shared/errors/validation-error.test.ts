import { describe, it, expect } from 'vitest';
import { ValidationError, ValidationErrorCode, createValidationError } from './validation-error';
import { BaseError } from './base-error';

describe('ValidationError', () => {
  describe('constructor', () => {
    it('should create validation error with required properties', () => {
      const error = new ValidationError(
        ValidationErrorCode.INVALID_TYPE,
        'Expected string but received number'
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('INVALID_TYPE');
      expect(error.message).toBe('Expected string but received number');
    });

    it('should create validation error with field context', () => {
      const error = new ValidationError(
        ValidationErrorCode.MISSING_FIELD,
        'Required field is missing',
        {
          context: {
            field: 'user.email',
            expectedType: 'string',
            required: true
          }
        }
      );
      
      expect(error.context?.field).toBe('user.email');
      expect(error.context?.expectedType).toBe('string');
      expect(error.context?.required).toBe(true);
    });

    it('should create validation error with value context', () => {
      const error = new ValidationError(
        ValidationErrorCode.OUT_OF_RANGE,
        'Value is out of acceptable range',
        {
          context: {
            field: 'price',
            value: -100,
            min: 0,
            max: 1000000,
            receivedType: 'number'
          }
        }
      );
      
      expect(error.context?.field).toBe('price');
      expect(error.context?.value).toBe(-100);
      expect(error.context?.min).toBe(0);
      expect(error.context?.max).toBe(1000000);
    });
  });

  describe('error codes', () => {
    it('should have all expected error codes', () => {
      expect(ValidationErrorCode.INVALID_TYPE).toBe('INVALID_TYPE');
      expect(ValidationErrorCode.MISSING_FIELD).toBe('MISSING_FIELD');
      expect(ValidationErrorCode.INVALID_FORMAT).toBe('INVALID_FORMAT');
      expect(ValidationErrorCode.OUT_OF_RANGE).toBe('OUT_OF_RANGE');
      expect(ValidationErrorCode.INVALID_ENUM).toBe('INVALID_ENUM');
      expect(ValidationErrorCode.CONSTRAINT_VIOLATION).toBe('CONSTRAINT_VIOLATION');
    });
  });

  describe('helper methods', () => {
    it('should get field path from context', () => {
      const error = new ValidationError(
        ValidationErrorCode.INVALID_TYPE,
        'Invalid type',
        {
          context: { field: 'user.profile.age' }
        }
      );
      
      expect(error.getFieldPath()).toBe('user.profile.age');
    });

    it('should return undefined when no field in context', () => {
      const error = new ValidationError(
        ValidationErrorCode.CONSTRAINT_VIOLATION,
        'General validation error'
      );
      
      expect(error.getFieldPath()).toBeUndefined();
    });

    it('should check if error is for specific field', () => {
      const error = new ValidationError(
        ValidationErrorCode.INVALID_TYPE,
        'Invalid email',
        {
          context: { field: 'email' }
        }
      );
      
      expect(error.isFieldError('email')).toBe(true);
      expect(error.isFieldError('username')).toBe(false);
    });
  });

  describe('createValidationError factory', () => {
    it('should create type mismatch error', () => {
      const error = createValidationError({
        field: 'age',
        expectedType: 'number',
        receivedValue: '25',
        receivedType: 'string'
      });
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe('INVALID_TYPE');
      expect(error.context?.field).toBe('age');
      expect(error.context?.expectedType).toBe('number');
      expect(error.context?.receivedType).toBe('string');
      expect(error.context?.value).toBe('25');
    });

    it('should create missing field error', () => {
      const error = createValidationError({
        field: 'email',
        required: true
      });
      
      expect(error.code).toBe('MISSING_FIELD');
      expect(error.message).toContain('email');
      expect(error.context?.required).toBe(true);
    });

    it('should create range validation error', () => {
      const error = createValidationError({
        field: 'quantity',
        value: 150,
        min: 1,
        max: 100
      });
      
      expect(error.code).toBe('OUT_OF_RANGE');
      expect(error.context?.value).toBe(150);
      expect(error.context?.min).toBe(1);
      expect(error.context?.max).toBe(100);
    });

    it('should create enum validation error', () => {
      const error = createValidationError({
        field: 'status',
        value: 'INVALID',
        allowedValues: ['ACTIVE', 'INACTIVE', 'PENDING']
      });
      
      expect(error.code).toBe('INVALID_ENUM');
      expect(error.context?.value).toBe('INVALID');
      expect(error.context?.allowedValues).toEqual(['ACTIVE', 'INACTIVE', 'PENDING']);
    });

    it('should create format validation error', () => {
      const error = createValidationError({
        field: 'email',
        value: 'not-an-email',
        format: 'email',
        pattern: '^[^@]+@[^@]+\\.[^@]+$'
      });
      
      expect(error.code).toBe('INVALID_FORMAT');
      expect(error.context?.format).toBe('email');
      expect(error.context?.pattern).toBeDefined();
    });
  });

  describe('serialization', () => {
    it('should serialize with validation-specific context', () => {
      const error = new ValidationError(
        ValidationErrorCode.CONSTRAINT_VIOLATION,
        'Business rule violation',
        {
          context: {
            field: 'order.quantity',
            value: 1001,
            constraint: 'MAX_ORDER_SIZE',
            maxAllowed: 1000
          }
        }
      );
      
      const json = error.toJSON();
      
      expect(json.name).toBe('ValidationError');
      expect(json.code).toBe('CONSTRAINT_VIOLATION');
      expect(json.context).toMatchObject({
        field: 'order.quantity',
        value: 1001,
        constraint: 'MAX_ORDER_SIZE'
      });
    });
  });

  describe('aggregation', () => {
    it('should support validation error aggregation', () => {
      const errors = [
        new ValidationError(ValidationErrorCode.MISSING_FIELD, 'Email required', {
          context: { field: 'email' }
        }),
        new ValidationError(ValidationErrorCode.INVALID_TYPE, 'Age must be number', {
          context: { field: 'age' }
        }),
        new ValidationError(ValidationErrorCode.OUT_OF_RANGE, 'Age out of range', {
          context: { field: 'age', value: -5 }
        })
      ];
      
      const aggregatedError = new ValidationError(
        ValidationErrorCode.CONSTRAINT_VIOLATION,
        'Multiple validation errors',
        {
          context: {
            errors: errors.map(e => ({
              field: e.context?.field,
              code: e.code,
              message: e.message
            }))
          }
        }
      );
      
      expect(aggregatedError.context?.errors).toHaveLength(3);
       
      // @ts-expect-error - accessing array index on dynamic context object
      expect(aggregatedError.context?.errors?.[0]?.field).toBe('email');
    });
  });
});