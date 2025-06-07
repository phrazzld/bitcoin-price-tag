import { describe, it, expect } from 'vitest';
import { PriceResponseMessage, PriceData } from '../common/types';
import { MessageValidators } from '../common/schema-validation';

describe('messaging - validatePriceResponseMessage', () => {
  const validPriceData: PriceData = {
    usdRate: 45000.50,
    satoshiRate: 0.00000001,
    fetchedAt: Date.now(),
    source: 'coingecko'
  };

  const validSuccessMessage: PriceResponseMessage = {
    requestId: 'req-123',
    type: 'PRICE_RESPONSE',
    status: 'success',
    data: validPriceData,
    timestamp: Date.now()
  };

  const validErrorMessage: PriceResponseMessage = {
    requestId: 'req-456',
    type: 'PRICE_RESPONSE',
    status: 'error',
    error: {
      message: 'Failed to fetch price',
      code: 'FETCH_ERROR'
    },
    timestamp: Date.now()
  };

  describe('valid messages', () => {
    it('should return true for valid success message', () => {
      const result = MessageValidators.validatePriceResponseMessage(validSuccessMessage);
      if (!result.isValid) {
        console.log('Validation errors:', result.errors);
      }
      expect(result.isValid).toBe(true);
    });

    it('should return true for valid error message', () => {
      expect(MessageValidators.validatePriceResponseMessage(validErrorMessage).isValid).toBe(true);
    });
  });

  describe('invalid input types', () => {
    it('should return false for null', () => {
      expect(MessageValidators.validatePriceResponseMessage(null).isValid).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(MessageValidators.validatePriceResponseMessage(undefined).isValid).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(MessageValidators.validatePriceResponseMessage('string').isValid).toBe(false);
      expect(MessageValidators.validatePriceResponseMessage(123).isValid).toBe(false);
      expect(MessageValidators.validatePriceResponseMessage(true).isValid).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(MessageValidators.validatePriceResponseMessage([]).isValid).toBe(false);
      expect(MessageValidators.validatePriceResponseMessage([1, 2, 3]).isValid).toBe(false);
    });
  });

  describe('missing required properties', () => {
    it('should return false when missing requestId', () => {
      const message = { ...validSuccessMessage };
      delete (message as any).requestId;
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false when missing type', () => {
      const message = { ...validSuccessMessage };
      delete (message as any).type;
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false when missing status', () => {
      const message = { ...validSuccessMessage };
      delete (message as any).status;
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false when missing timestamp', () => {
      const message = { ...validSuccessMessage };
      delete (message as any).timestamp;
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });
  });

  describe('invalid type property', () => {
    it('should return false for wrong message type', () => {
      const message = { ...validSuccessMessage, type: 'WRONG_TYPE' };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false for non-string type', () => {
      const message = { ...validSuccessMessage, type: 123 };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });
  });

  describe('invalid requestId', () => {
    it('should return false for non-string requestId', () => {
      const message = { ...validSuccessMessage, requestId: 123 };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false for empty string requestId', () => {
      const message = { ...validSuccessMessage, requestId: '' };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });
  });

  describe('invalid status', () => {
    it('should return false for invalid status value', () => {
      const message = { ...validSuccessMessage, status: 'invalid' };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false for non-string status', () => {
      const message = { ...validSuccessMessage, status: 123 };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });
  });

  describe('invalid timestamp', () => {
    it('should return false for non-number timestamp', () => {
      const message = { ...validSuccessMessage, timestamp: '1640995200000' };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false for negative timestamp', () => {
      const message = { ...validSuccessMessage, timestamp: -1 };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false for zero timestamp', () => {
      const message = { ...validSuccessMessage, timestamp: 0 };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false for NaN timestamp', () => {
      const message = { ...validSuccessMessage, timestamp: NaN };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false for Infinity timestamp', () => {
      const message = { ...validSuccessMessage, timestamp: Infinity };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });
  });

  describe('success message validation', () => {
    it('should return false when success message is missing data', () => {
      const message = { ...validSuccessMessage };
      delete (message as any).data;
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false when success message has error property', () => {
      const message = { ...validSuccessMessage, error: { message: 'error', code: 'ERROR' } };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false when success message has extra properties', () => {
      const message = { ...validSuccessMessage, extra: 'value' };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    describe('invalid data property', () => {
      it('should return false for null data', () => {
        const message = { ...validSuccessMessage, data: null };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false for non-object data', () => {
        const message = { ...validSuccessMessage, data: 'string' };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when data is missing usdRate', () => {
        const data = { ...validPriceData };
        delete (data as any).usdRate;
        const message = { ...validSuccessMessage, data };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when data has invalid usdRate', () => {
        const message = { ...validSuccessMessage, data: { ...validPriceData, usdRate: -1 } };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when data is missing satoshiRate', () => {
        const data = { ...validPriceData };
        delete (data as any).satoshiRate;
        const message = { ...validSuccessMessage, data };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when data has invalid satoshiRate', () => {
        const message = { ...validSuccessMessage, data: { ...validPriceData, satoshiRate: 0 } };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when data is missing fetchedAt', () => {
        const data = { ...validPriceData };
        delete (data as any).fetchedAt;
        const message = { ...validSuccessMessage, data };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when data has invalid fetchedAt', () => {
        const message = { ...validSuccessMessage, data: { ...validPriceData, fetchedAt: -1 } };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when data is missing source', () => {
        const data = { ...validPriceData };
        delete (data as any).source;
        const message = { ...validSuccessMessage, data };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when data has invalid source', () => {
        const message = { ...validSuccessMessage, data: { ...validPriceData, source: '' } };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when data has extra properties', () => {
        const message = { ...validSuccessMessage, data: { ...validPriceData, extra: 'value' } };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });
    });
  });

  describe('error message validation', () => {
    it('should return false when error message is missing error', () => {
      const message = { ...validErrorMessage };
      delete (message as any).error;
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false when error message has data property', () => {
      const message = { ...validErrorMessage, data: validPriceData };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    it('should return false when error message has extra properties', () => {
      const message = { ...validErrorMessage, extra: 'value' };
      expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
    });

    describe('invalid error property', () => {
      it('should return false for null error', () => {
        const message = { ...validErrorMessage, error: null };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false for non-object error', () => {
        const message = { ...validErrorMessage, error: 'string' };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when error is missing message', () => {
        const error = { code: 'ERROR' };
        const message = { ...validErrorMessage, error };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when error has invalid message', () => {
        const message = { ...validErrorMessage, error: { message: '', code: 'ERROR' } };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when error is missing code', () => {
        const error = { message: 'Error message' };
        const message = { ...validErrorMessage, error };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when error has invalid code', () => {
        const message = { ...validErrorMessage, error: { message: 'Error', code: '' } };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });

      it('should return false when error has extra properties', () => {
        const error = { message: 'Error', code: 'ERROR', extra: 'value' };
        const message = { ...validErrorMessage, error };
        expect(MessageValidators.validatePriceResponseMessage(message).isValid).toBe(false);
      });
    });
  });
});