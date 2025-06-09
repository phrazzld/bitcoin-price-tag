import { describe, it, expect } from 'vitest';
import { MessagingError, MessagingErrorCode, PriceRequestTimeoutError, createMessagingError } from './messaging-error';
import { BaseError } from './base-error';

describe('MessagingError', () => {
  describe('constructor', () => {
    it('should create messaging error with required properties', () => {
      const error = new MessagingError(
        MessagingErrorCode.SEND_FAILED,
        'Failed to send message'
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(MessagingError);
      expect(error.name).toBe('MessagingError');
      expect(error.code).toBe('SEND_FAILED');
      expect(error.message).toBe('Failed to send message');
    });

    it('should create messaging error with message context', () => {
      const error = new MessagingError(
        MessagingErrorCode.INVALID_RESPONSE,
        'Invalid response format',
        {
          context: {
            messageType: 'PRICE_REQUEST',
            requestId: 'req_123',
            targetContext: 'service-worker',
            tabId: 456
          }
        }
      );
      
      expect(error.context?.messageType).toBe('PRICE_REQUEST');
      expect(error.context?.requestId).toBe('req_123');
      expect(error.context?.targetContext).toBe('service-worker');
      expect(error.context?.tabId).toBe(456);
    });
  });

  describe('error codes', () => {
    it('should have all expected error codes', () => {
      expect(MessagingErrorCode.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
      expect(MessagingErrorCode.SEND_FAILED).toBe('SEND_FAILED');
      expect(MessagingErrorCode.INVALID_MESSAGE).toBe('INVALID_MESSAGE');
      expect(MessagingErrorCode.INVALID_RESPONSE).toBe('INVALID_RESPONSE');
      expect(MessagingErrorCode.CONNECTION_ERROR).toBe('CONNECTION_ERROR');
      expect(MessagingErrorCode.HANDLER_ERROR).toBe('HANDLER_ERROR');
    });
  });

  describe('helper methods', () => {
    it('should check if error is timeout', () => {
      const timeoutError = new MessagingError(
        MessagingErrorCode.TIMEOUT_ERROR,
        'Request timeout'
      );
      const sendError = new MessagingError(
        MessagingErrorCode.SEND_FAILED,
        'Send failed'
      );
      
      expect(timeoutError.isTimeout()).toBe(true);
      expect(sendError.isTimeout()).toBe(false);
    });

    it('should get request ID from context', () => {
      const error = new MessagingError(
        MessagingErrorCode.TIMEOUT_ERROR,
        'Timeout',
        {
          context: { requestId: 'req_abc123' }
        }
      );
      
      expect(error.getRequestId()).toBe('req_abc123');
    });

    it('should return undefined when no request ID', () => {
      const error = new MessagingError(
        MessagingErrorCode.CONNECTION_ERROR,
        'Connection lost'
      );
      
      expect(error.getRequestId()).toBeUndefined();
    });
  });

  describe('PriceRequestTimeoutError', () => {
    it('should create timeout error with request details', () => {
      const error = new PriceRequestTimeoutError('req_123', 10000);
      
      expect(error).toBeInstanceOf(MessagingError);
      expect(error.name).toBe('PriceRequestTimeoutError');
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.message).toContain('10000ms');
      expect(error.message).toContain('req_123');
      expect(error.context?.requestId).toBe('req_123');
      expect(error.context?.timeoutMs).toBe(10000);
    });

    it('should use default timeout when not specified', () => {
      const error = new PriceRequestTimeoutError('req_456');
      
      expect(error.message).toContain('10000ms'); // Default timeout
      expect(error.context?.timeoutMs).toBe(10000);
    });
  });

  describe('createMessagingError factory', () => {
    it('should create error from Chrome runtime error', () => {
      const chromeError = { message: 'Could not establish connection' };
      const error = createMessagingError(chromeError, {
        messageType: 'PRICE_REQUEST',
        requestId: 'req_123'
      });
      
      expect(error).toBeInstanceOf(MessagingError);
      expect(error.code).toBe('CONNECTION_ERROR');
      expect(error.message).toBe('Could not establish connection');
      expect(error.context?.messageType).toBe('PRICE_REQUEST');
    });

    it('should create timeout error', () => {
      const timeoutError = new Error('Request timed out');
      const error = createMessagingError(timeoutError, {
        requestId: 'req_123',
        timeoutMs: 5000
      });
      
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.context?.timeoutMs).toBe(5000);
    });

    it('should create invalid message error', () => {
      const error = createMessagingError(new Error('Invalid format'), {
        messageType: 'UNKNOWN_TYPE',
        reason: 'Unsupported message type'
      });
      
      expect(error.code).toBe('INVALID_MESSAGE');
      expect(error.context?.reason).toBe('Unsupported message type');
    });
  });

  describe('cross-context error propagation', () => {
    it('should preserve error details across contexts', () => {
      const serviceWorkerError = new MessagingError(
        MessagingErrorCode.HANDLER_ERROR,
        'Service worker handler failed',
        {
          context: {
            handler: 'handlePriceRequest',
            originalError: 'API rate limited'
          },
          correlationId: 'req_789'
        }
      );
      
      // Simulate serialization for message passing
      const serialized = serviceWorkerError.toJSON();
      
      // In content script, reconstruct error
      const contentScriptError = new MessagingError(
        MessagingErrorCode.INVALID_RESPONSE,
        'Service worker error',
        {
          context: {
            serviceWorkerError: serialized,
            requestId: 'req_789'
          }
        }
      );
      
      expect(contentScriptError.context?.serviceWorkerError).toMatchObject({
        code: 'HANDLER_ERROR',
        correlationId: 'req_789'
      });
    });
  });

  describe('serialization', () => {
    it('should serialize with messaging-specific context', () => {
      const error = new MessagingError(
        MessagingErrorCode.CONNECTION_ERROR,
        'Extension context invalidated',
        {
          context: {
            messageType: 'PRICE_UPDATE',
            targetContext: 'content-script',
            tabId: 123,
            frameId: 0,
            extensionId: 'abc123def456'
          },
          correlationId: 'msg_001'
        }
      );
      
      const json = error.toJSON();
      
      expect(json.name).toBe('MessagingError');
      expect(json.code).toBe('CONNECTION_ERROR');
      expect(json.context).toMatchObject({
        messageType: 'PRICE_UPDATE',
        tabId: 123
      });
      expect(json.correlationId).toBe('msg_001');
    });
  });
});