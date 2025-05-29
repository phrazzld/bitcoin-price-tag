import { describe, it, expect } from 'vitest';
import {
  isObject,
  isNumber,
  isValidPrice,
  isValidTimestamp,
  isValidCurrency,
  hasOnlyExpectedProperties,
  hasRequiredProperties
} from './validation-helpers';

describe('validation-helpers', () => {
  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
      expect(isObject({ nested: { prop: 'value' } })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isObject([])).toBe(false);
      expect(isObject([1, 2, 3])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });

    it('should return false for functions', () => {
      expect(isObject(() => {})).toBe(false);
      expect(isObject(function() {})).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should return true for valid numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(42)).toBe(true);
      expect(isNumber(-123)).toBe(true);
      expect(isNumber(3.14159)).toBe(true);
      expect(isNumber(-0.5)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(isNumber(Infinity)).toBe(false);
      expect(isNumber(-Infinity)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isNumber('123')).toBe(false);
      expect(isNumber(true)).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber({})).toBe(false);
      expect(isNumber([])).toBe(false);
    });
  });

  describe('isValidPrice', () => {
    it('should return true for positive numbers', () => {
      expect(isValidPrice(1)).toBe(true);
      expect(isValidPrice(42.99)).toBe(true);
      expect(isValidPrice(0.01)).toBe(true);
      expect(isValidPrice(999999.99)).toBe(true);
    });

    it('should return false for zero', () => {
      expect(isValidPrice(0)).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(isValidPrice(-1)).toBe(false);
      expect(isValidPrice(-0.01)).toBe(false);
    });

    it('should return false for invalid numbers', () => {
      expect(isValidPrice(NaN)).toBe(false);
      expect(isValidPrice(Infinity)).toBe(false);
      expect(isValidPrice(-Infinity)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isValidPrice('42')).toBe(false);
      expect(isValidPrice(true)).toBe(false);
      expect(isValidPrice(null)).toBe(false);
      expect(isValidPrice(undefined)).toBe(false);
    });
  });

  describe('isValidTimestamp', () => {
    it('should return true for positive numbers', () => {
      expect(isValidTimestamp(1)).toBe(true);
      expect(isValidTimestamp(Date.now())).toBe(true);
      expect(isValidTimestamp(1640995200000)).toBe(true); // 2022-01-01
    });

    it('should return false for zero', () => {
      expect(isValidTimestamp(0)).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(isValidTimestamp(-1)).toBe(false);
      expect(isValidTimestamp(-1640995200000)).toBe(false);
    });

    it('should return false for invalid numbers', () => {
      expect(isValidTimestamp(NaN)).toBe(false);
      expect(isValidTimestamp(Infinity)).toBe(false);
      expect(isValidTimestamp(-Infinity)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isValidTimestamp('1640995200000')).toBe(false);
      expect(isValidTimestamp(new Date())).toBe(false);
      expect(isValidTimestamp(null)).toBe(false);
      expect(isValidTimestamp(undefined)).toBe(false);
    });
  });

  describe('isValidCurrency', () => {
    it('should return true for USD', () => {
      expect(isValidCurrency('USD')).toBe(true);
    });

    it('should return false for other currencies', () => {
      expect(isValidCurrency('EUR')).toBe(false);
      expect(isValidCurrency('GBP')).toBe(false);
      expect(isValidCurrency('BTC')).toBe(false);
      expect(isValidCurrency('usd')).toBe(false); // case sensitive
    });

    it('should return false for non-strings', () => {
      expect(isValidCurrency(123)).toBe(false);
      expect(isValidCurrency(true)).toBe(false);
      expect(isValidCurrency(null)).toBe(false);
      expect(isValidCurrency(undefined)).toBe(false);
      expect(isValidCurrency({})).toBe(false);
      expect(isValidCurrency([])).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidCurrency('')).toBe(false);
    });
  });

  describe('hasOnlyExpectedProperties', () => {
    it('should return true when object has exactly expected properties', () => {
      const obj = { price: 42, timestamp: 123456 };
      expect(hasOnlyExpectedProperties(obj, ['price', 'timestamp'])).toBe(true);
    });

    it('should return true for empty object with empty expected properties', () => {
      expect(hasOnlyExpectedProperties({}, [])).toBe(true);
    });

    it('should return false when object has additional properties', () => {
      const obj = { price: 42, timestamp: 123456, extra: 'value' };
      expect(hasOnlyExpectedProperties(obj, ['price', 'timestamp'])).toBe(false);
    });

    it('should return false when object is missing properties', () => {
      const obj = { price: 42 };
      expect(hasOnlyExpectedProperties(obj, ['price', 'timestamp'])).toBe(false);
    });

    it('should return false when object has different properties', () => {
      const obj = { foo: 42, bar: 123456 };
      expect(hasOnlyExpectedProperties(obj, ['price', 'timestamp'])).toBe(false);
    });

    it('should handle property order independence', () => {
      const obj = { timestamp: 123456, price: 42 };
      expect(hasOnlyExpectedProperties(obj, ['price', 'timestamp'])).toBe(true);
    });
  });

  describe('hasRequiredProperties', () => {
    it('should return true when object has all required properties', () => {
      const obj = { price: 42, timestamp: 123456, extra: 'allowed' };
      expect(hasRequiredProperties(obj, ['price', 'timestamp'])).toBe(true);
    });

    it('should return true for empty required properties', () => {
      expect(hasRequiredProperties({ some: 'prop' }, [])).toBe(true);
    });

    it('should return false when object is missing required properties', () => {
      const obj = { price: 42 };
      expect(hasRequiredProperties(obj, ['price', 'timestamp'])).toBe(false);
    });

    it('should return false when object is missing all required properties', () => {
      const obj = { other: 'value' };
      expect(hasRequiredProperties(obj, ['price', 'timestamp'])).toBe(false);
    });

    it('should handle properties with undefined values as present', () => {
      const obj = { price: 42, timestamp: undefined };
      expect(hasRequiredProperties(obj, ['price', 'timestamp'])).toBe(true);
    });

    it('should handle properties with null values as present', () => {
      const obj = { price: 42, timestamp: null };
      expect(hasRequiredProperties(obj, ['price', 'timestamp'])).toBe(true);
    });
  });
});