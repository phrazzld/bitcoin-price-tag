import { describe, it, expect } from 'vitest';
import { ChromeApiError, ChromeErrorCode, createChromeApiError } from './chrome-api-error';
import { BaseError } from './base-error';

describe('ChromeApiError', () => {
  describe('constructor', () => {
    it('should create Chrome API error with required properties', () => {
      const error = new ChromeApiError(
        ChromeErrorCode.RUNTIME_ERROR,
        'Extension context invalidated'
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(ChromeApiError);
      expect(error.name).toBe('ChromeApiError');
      expect(error.code).toBe('RUNTIME_ERROR');
      expect(error.message).toBe('Extension context invalidated');
    });

    it('should create Chrome API error with API context', () => {
      const error = new ChromeApiError(
        ChromeErrorCode.PERMISSION_DENIED,
        'Missing required permission',
        {
          context: {
            api: 'chrome.storage',
            method: 'get',
            permissions: ['storage'],
            manifestVersion: 3
          }
        }
      );
      
      expect(error.context?.api).toBe('chrome.storage');
      expect(error.context?.method).toBe('get');
      expect(error.context?.permissions).toEqual(['storage']);
      expect(error.context?.manifestVersion).toBe(3);
    });

    it('should create storage quota error', () => {
      const error = new ChromeApiError(
        ChromeErrorCode.QUOTA_EXCEEDED,
        'Storage quota exceeded',
        {
          context: {
            api: 'chrome.storage.local',
            method: 'set',
            quotaBytes: 5242880, // 5MB
            usedBytes: 5242000,
            requestedBytes: 10000
          }
        }
      );
      
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.context?.quotaBytes).toBe(5242880);
      expect(error.context?.usedBytes).toBe(5242000);
      expect(error.context?.requestedBytes).toBe(10000);
    });
  });

  describe('error codes', () => {
    it('should have all expected error codes', () => {
      expect(ChromeErrorCode.RUNTIME_ERROR).toBe('RUNTIME_ERROR');
      expect(ChromeErrorCode.STORAGE_ERROR).toBe('STORAGE_ERROR');
      expect(ChromeErrorCode.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
      expect(ChromeErrorCode.CONTEXT_INVALID).toBe('CONTEXT_INVALID');
      expect(ChromeErrorCode.API_UNAVAILABLE).toBe('API_UNAVAILABLE');
      expect(ChromeErrorCode.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED');
    });
  });

  describe('helper methods', () => {
    it('should check if error is recoverable', () => {
      const contextError = new ChromeApiError(
        ChromeErrorCode.CONTEXT_INVALID,
        'Extension context invalidated'
      );
      const permissionError = new ChromeApiError(
        ChromeErrorCode.PERMISSION_DENIED,
        'Missing permission'
      );
      const quotaError = new ChromeApiError(
        ChromeErrorCode.QUOTA_EXCEEDED,
        'Storage full'
      );
      
      expect(contextError.isRecoverable()).toBe(false);
      expect(permissionError.isRecoverable()).toBe(false);
      expect(quotaError.isRecoverable()).toBe(true); // Can clear storage
    });

    it('should get Chrome API from context', () => {
      const error = new ChromeApiError(
        ChromeErrorCode.STORAGE_ERROR,
        'Storage operation failed',
        {
          context: {
            api: 'chrome.storage.sync',
            method: 'set'
          }
        }
      );
      
      expect(error.getChromeApi()).toBe('chrome.storage.sync');
    });

    it('should return undefined when no API in context', () => {
      const error = new ChromeApiError(
        ChromeErrorCode.RUNTIME_ERROR,
        'General runtime error'
      );
      
      expect(error.getChromeApi()).toBeUndefined();
    });
  });

  describe('createChromeApiError factory', () => {
    it('should create error from chrome.runtime.lastError', () => {
      const lastError = { message: 'Could not establish connection' };
      const error = createChromeApiError(lastError, {
        api: 'chrome.runtime',
        method: 'sendMessage'
      });
      
      expect(error).toBeInstanceOf(ChromeApiError);
      expect(error.code).toBe('RUNTIME_ERROR');
      expect(error.message).toBe('Could not establish connection');
      expect(error.context?.api).toBe('chrome.runtime');
    });

    it('should detect permission errors', () => {
      const lastError = { message: 'Permission denied for storage' };
      const error = createChromeApiError(lastError, {
        api: 'chrome.storage.local',
        method: 'get'
      });
      
      expect(error.code).toBe('PERMISSION_DENIED');
    });

    it('should detect quota errors', () => {
      const lastError = { message: 'Quota exceeded' };
      const error = createChromeApiError(lastError, {
        api: 'chrome.storage.local',
        method: 'set',
        dataSize: 10000
      });
      
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.context?.dataSize).toBe(10000);
    });

    it('should detect context invalidation', () => {
      const lastError = { message: 'Extension context invalidated' };
      const error = createChromeApiError(lastError);
      
      expect(error.code).toBe('CONTEXT_INVALID');
    });

    it('should handle generic Chrome errors', () => {
      const genericError = new Error('Chrome API failed');
      const error = createChromeApiError(genericError, {
        api: 'chrome.tabs',
        method: 'query'
      });
      
      expect(error.code).toBe('RUNTIME_ERROR');
      expect(error.cause).toBe(genericError);
    });
  });

  describe('serialization', () => {
    it('should serialize with Chrome-specific context', () => {
      const error = new ChromeApiError(
        ChromeErrorCode.STORAGE_ERROR,
        'Failed to save data',
        {
          context: {
            api: 'chrome.storage.local',
            method: 'set',
            key: 'user_preferences',
            errorDetails: {
              chromeVersion: '120.0.0',
              extensionId: 'abc123'
            }
          },
          correlationId: 'req_123'
        }
      );
      
      const json = error.toJSON();
      
      expect(json.name).toBe('ChromeApiError');
      expect(json.code).toBe('STORAGE_ERROR');
      expect(json.context).toMatchObject({
        api: 'chrome.storage.local',
        method: 'set',
        key: 'user_preferences'
      });
      expect(json.correlationId).toBe('req_123');
    });
  });

  describe('Chrome runtime context', () => {
    it('should handle message passing errors', () => {
      const error = new ChromeApiError(
        ChromeErrorCode.RUNTIME_ERROR,
        'Could not establish connection',
        {
          context: {
            api: 'chrome.runtime',
            method: 'sendMessage',
            messageType: 'PRICE_REQUEST',
            targetContext: 'service-worker',
            tabId: 123
          }
        }
      );
      
      expect(error.context?.messageType).toBe('PRICE_REQUEST');
      expect(error.context?.targetContext).toBe('service-worker');
      expect(error.context?.tabId).toBe(123);
    });
  });
});