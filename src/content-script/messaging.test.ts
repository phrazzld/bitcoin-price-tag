import { describe, it, expect } from 'vitest';
import { PriceResponseMessage, PriceData } from '../common/types';
import { isPriceResponseMessage } from './messaging';

describe('messaging - isPriceResponseMessage', () => {
  const validPriceData: PriceData = {
    usdRate: 45000.50,
    satoshiRate: 0.00000001,
    fetchedAt: 1640995200000,
    source: 'coingecko'
  };

  const validSuccessMessage: PriceResponseMessage = {
    requestId: 'req-123',
    type: 'PRICE_RESPONSE',
    status: 'success',
    data: validPriceData,
    timestamp: 1640995200000
  };

  const validErrorMessage: PriceResponseMessage = {
    requestId: 'req-456',
    type: 'PRICE_RESPONSE',
    status: 'error',
    error: {
      message: 'Failed to fetch price',
      code: 'FETCH_ERROR'
    },
    timestamp: 1640995200000
  };

  describe('valid messages', () => {
    it('should return true for valid success message', () => {
      expect(isPriceResponseMessage(validSuccessMessage)).toBe(true);
    });

    it('should return true for valid error message', () => {
      expect(isPriceResponseMessage(validErrorMessage)).toBe(true);
    });
  });

  describe('invalid input types', () => {
    it('should return false for null', () => {
      expect(isPriceResponseMessage(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isPriceResponseMessage(undefined)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isPriceResponseMessage('string')).toBe(false);
      expect(isPriceResponseMessage(123)).toBe(false);
      expect(isPriceResponseMessage(true)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isPriceResponseMessage([])).toBe(false);
      expect(isPriceResponseMessage([1, 2, 3])).toBe(false);
    });
  });

  describe('missing required properties', () => {
    it('should return false when missing requestId', () => {
      const message = { ...validSuccessMessage };
      delete (message as any).requestId;
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false when missing type', () => {
      const message = { ...validSuccessMessage };
      delete (message as any).type;
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false when missing status', () => {
      const message = { ...validSuccessMessage };
      delete (message as any).status;
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false when missing timestamp', () => {
      const message = { ...validSuccessMessage };
      delete (message as any).timestamp;
      expect(isPriceResponseMessage(message)).toBe(false);
    });
  });

  describe('invalid type property', () => {
    it('should return false for wrong message type', () => {
      const message = { ...validSuccessMessage, type: 'WRONG_TYPE' };
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false for non-string type', () => {
      const message = { ...validSuccessMessage, type: 123 };
      expect(isPriceResponseMessage(message)).toBe(false);
    });
  });

  describe('invalid requestId', () => {
    it('should return false for non-string requestId', () => {
      const message = { ...validSuccessMessage, requestId: 123 };
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false for empty string requestId', () => {
      const message = { ...validSuccessMessage, requestId: '' };
      expect(isPriceResponseMessage(message)).toBe(false);
    });
  });

  describe('invalid status', () => {
    it('should return false for invalid status value', () => {
      const message = { ...validSuccessMessage, status: 'invalid' };
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false for non-string status', () => {
      const message = { ...validSuccessMessage, status: 123 };
      expect(isPriceResponseMessage(message)).toBe(false);
    });
  });

  describe('invalid timestamp', () => {
    it('should return false for non-number timestamp', () => {
      const message = { ...validSuccessMessage, timestamp: '1640995200000' };
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false for negative timestamp', () => {
      const message = { ...validSuccessMessage, timestamp: -1 };
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false for zero timestamp', () => {
      const message = { ...validSuccessMessage, timestamp: 0 };
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false for NaN timestamp', () => {
      const message = { ...validSuccessMessage, timestamp: NaN };
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false for Infinity timestamp', () => {
      const message = { ...validSuccessMessage, timestamp: Infinity };
      expect(isPriceResponseMessage(message)).toBe(false);
    });
  });

  describe('success message validation', () => {
    it('should return false when success message is missing data', () => {
      const message = { ...validSuccessMessage };
      delete (message as any).data;
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false when success message has error property', () => {
      const message = { ...validSuccessMessage, error: { message: 'error', code: 'ERROR' } };
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false when success message has extra properties', () => {
      const message = { ...validSuccessMessage, extra: 'value' };
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    describe('invalid data property', () => {
      it('should return false for null data', () => {
        const message = { ...validSuccessMessage, data: null };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false for non-object data', () => {
        const message = { ...validSuccessMessage, data: 'string' };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when data is missing usdRate', () => {
        const data = { ...validPriceData };
        delete (data as any).usdRate;
        const message = { ...validSuccessMessage, data };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when data has invalid usdRate', () => {
        const message = { ...validSuccessMessage, data: { ...validPriceData, usdRate: -1 } };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when data is missing satoshiRate', () => {
        const data = { ...validPriceData };
        delete (data as any).satoshiRate;
        const message = { ...validSuccessMessage, data };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when data has invalid satoshiRate', () => {
        const message = { ...validSuccessMessage, data: { ...validPriceData, satoshiRate: 0 } };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when data is missing fetchedAt', () => {
        const data = { ...validPriceData };
        delete (data as any).fetchedAt;
        const message = { ...validSuccessMessage, data };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when data has invalid fetchedAt', () => {
        const message = { ...validSuccessMessage, data: { ...validPriceData, fetchedAt: -1 } };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when data is missing source', () => {
        const data = { ...validPriceData };
        delete (data as any).source;
        const message = { ...validSuccessMessage, data };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when data has invalid source', () => {
        const message = { ...validSuccessMessage, data: { ...validPriceData, source: '' } };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when data has extra properties', () => {
        const message = { ...validSuccessMessage, data: { ...validPriceData, extra: 'value' } };
        expect(isPriceResponseMessage(message)).toBe(false);
      });
    });
  });

  describe('error message validation', () => {
    it('should return false when error message is missing error', () => {
      const message = { ...validErrorMessage };
      delete (message as any).error;
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false when error message has data property', () => {
      const message = { ...validErrorMessage, data: validPriceData };
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    it('should return false when error message has extra properties', () => {
      const message = { ...validErrorMessage, extra: 'value' };
      expect(isPriceResponseMessage(message)).toBe(false);
    });

    describe('invalid error property', () => {
      it('should return false for null error', () => {
        const message = { ...validErrorMessage, error: null };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false for non-object error', () => {
        const message = { ...validErrorMessage, error: 'string' };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when error is missing message', () => {
        const error = { code: 'ERROR' };
        const message = { ...validErrorMessage, error };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when error has invalid message', () => {
        const message = { ...validErrorMessage, error: { message: '', code: 'ERROR' } };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when error is missing code', () => {
        const error = { message: 'Error message' };
        const message = { ...validErrorMessage, error };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when error has invalid code', () => {
        const message = { ...validErrorMessage, error: { message: 'Error', code: '' } };
        expect(isPriceResponseMessage(message)).toBe(false);
      });

      it('should return false when error has extra properties', () => {
        const error = { message: 'Error', code: 'ERROR', extra: 'value' };
        const message = { ...validErrorMessage, error };
        expect(isPriceResponseMessage(message)).toBe(false);
      });
    });
  });
});