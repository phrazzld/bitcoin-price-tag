/**
 * Unit tests for error handling utilities
 */

import { describe, it, expect, vi } from 'vitest';

import {
  ErrorTypes,
  ErrorSeverity,
  categorizeError,
  createError,
  withTimeout,
} from '../../error-handling.js';

describe('Error Handling Utilities', () => {
  describe('categorizeError', () => {
    it('should categorize network errors', () => {
      const networkError = new Error('Failed to fetch resource');
      expect(categorizeError(networkError)).toBe(ErrorTypes.NETWORK);

      const fetchError = new Error('Failed to fetch');
      expect(categorizeError(fetchError)).toBe(ErrorTypes.NETWORK);
    });

    it('should categorize timeout errors', () => {
      const timeoutError = new Error('Operation timed out');
      timeoutError.name = 'AbortError';
      expect(categorizeError(timeoutError)).toBe(ErrorTypes.TIMEOUT);
    });

    it('should categorize JSON parsing errors', () => {
      const jsonError = new SyntaxError('Unexpected token in JSON');
      expect(categorizeError(jsonError)).toBe(ErrorTypes.PARSING);
    });

    it('should categorize API errors', () => {
      const apiError = new Error('API responded with status: 404');
      expect(categorizeError(apiError)).toBe(ErrorTypes.API);

      const statusError = new Error('Bad status');
      statusError.status = 500;
      expect(categorizeError(statusError)).toBe(ErrorTypes.API);
    });

    it('should categorize storage errors', () => {
      const storageError = new Error('chrome.storage.local.get failed');
      expect(categorizeError(storageError)).toBe(ErrorTypes.STORAGE);
    });

    it('should return unknown for uncategorized errors', () => {
      const unknownError = new Error('Some random error');
      expect(categorizeError(unknownError)).toBe(ErrorTypes.UNKNOWN);
    });

    it('should handle null or undefined errors', () => {
      expect(categorizeError(null)).toBe(ErrorTypes.UNKNOWN);
      expect(categorizeError(undefined)).toBe(ErrorTypes.UNKNOWN);
    });
  });

  describe('createError', () => {
    it('should create an error with type and details', () => {
      const error = createError('Test error', ErrorTypes.API, { statusCode: 404 });
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ErrorTypes.API);
      expect(error.details).toEqual({ statusCode: 404 });
    });

    it('should work with minimal parameters', () => {
      const error = createError('Minimal error');
      expect(error.message).toBe('Minimal error');
      expect(error.details).toEqual({});
    });
  });

  describe('withTimeout', () => {
    it('should resolve when promise resolves before timeout', async () => {
      const result = await withTimeout(Promise.resolve('success'), 100);
      expect(result).toBe('success');
    });

    it('should reject with timeout error when promise takes too long', async () => {
      const slowPromise = new Promise((resolve) => setTimeout(() => resolve('too late'), 100));
      try {
        await withTimeout(slowPromise, 10, 'Timed out!');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toBe('Timed out!');
        expect(error.type).toBe(ErrorTypes.TIMEOUT);
      }
    });

    it('should propagate rejection from the original promise', async () => {
      const failingPromise = Promise.reject(new Error('Original error'));
      try {
        await withTimeout(failingPromise, 100);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toBe('Original error');
      }
    });
  });
});
