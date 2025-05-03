import { describe, it, expect } from 'vitest';
import {
  buildPrecedingMatchPattern,
  buildConcludingMatchPattern,
  extractNumericValue,
  getMultiplier,
  valueInSats,
  valueInBtc,
  makeSnippet,
  calculateSatPrice,
  ONE_THOUSAND,
  ONE_MILLION,
  ONE_BILLION,
  ONE_TRILLION
} from '../../conversion.js';

describe('Bitcoin Price Tag Conversion Module', () => {
  describe('Pattern Builders', () => {
    it('buildPrecedingMatchPattern should match currency with symbol first', () => {
      const pattern = buildPrecedingMatchPattern();
      
      expect('$100'.match(pattern)).not.toBeNull();
      expect('$1,234.56'.match(pattern)).not.toBeNull();
      expect('$1.5k'.match(pattern)).not.toBeNull();
      expect('$2.3 million'.match(pattern)).not.toBeNull();
      expect('USD 50'.match(pattern)).not.toBeNull();
      
      // Should not match these
      expect('100$'.match(pattern)).toBeNull();
      expect('test'.match(pattern)).toBeNull();
    });
    
    it('buildConcludingMatchPattern should match currency with symbol last', () => {
      const pattern = buildConcludingMatchPattern();
      
      expect('100$'.match(pattern)).not.toBeNull();
      expect('1,234.56 USD'.match(pattern)).not.toBeNull();
      expect('1.5k USD'.match(pattern)).not.toBeNull();
      expect('2.3 million USD'.match(pattern)).not.toBeNull();
      
      // Should not match these
      expect('$100'.match(pattern)).toBeNull();
      expect('test'.match(pattern)).toBeNull();
    });
  });
  
  describe('extractNumericValue', () => {
    it('should extract numeric values from currency strings', () => {
      expect(extractNumericValue('$100')).toBe(100);
      expect(extractNumericValue('$1,234.56')).toBe(1234.56);
      expect(extractNumericValue('100 USD')).toBe(100);
      expect(extractNumericValue('$0.5')).toBe(0.5);
    });
    
    it('should handle invalid inputs gracefully', () => {
      expect(extractNumericValue('no numbers')).toBeNaN();
      expect(extractNumericValue('$')).toBeNaN();
    });
  });
  
  describe('getMultiplier', () => {
    it('should return 1 for regular numbers', () => {
      expect(getMultiplier('$100')).toBe(1);
      expect(getMultiplier('100 USD')).toBe(1);
    });

    it('should detect thousands (k)', () => {
      expect(getMultiplier('$10k')).toBe(ONE_THOUSAND);
      expect(getMultiplier('5k USD')).toBe(ONE_THOUSAND);
      expect(getMultiplier('3 thousand')).toBe(ONE_THOUSAND);
    });

    it('should detect millions (m)', () => {
      expect(getMultiplier('$5m')).toBe(ONE_MILLION);
      expect(getMultiplier('1.5m USD')).toBe(ONE_MILLION);
      expect(getMultiplier('2 million')).toBe(ONE_MILLION);
    });

    it('should detect billions (b)', () => {
      expect(getMultiplier('$1b')).toBe(ONE_BILLION);
      expect(getMultiplier('2.5b USD')).toBe(ONE_BILLION);
      expect(getMultiplier('3 billion')).toBe(ONE_BILLION);
    });

    it('should detect trillions (t)', () => {
      expect(getMultiplier('$1t')).toBe(ONE_TRILLION);
      expect(getMultiplier('2.5t USD')).toBe(ONE_TRILLION);
      expect(getMultiplier('3 trillion')).toBe(ONE_TRILLION);
    });
    
    it('should handle case insensitivity', () => {
      expect(getMultiplier('$5K')).toBe(ONE_THOUSAND);
      expect(getMultiplier('$5M')).toBe(ONE_MILLION);
      expect(getMultiplier('$5B')).toBe(ONE_BILLION);
      expect(getMultiplier('$5T')).toBe(ONE_TRILLION);
    });
    
    it('should prioritize full words over abbreviations', () => {
      expect(getMultiplier('$5m billion')).toBe(ONE_BILLION);
    });
    
    it('should handle empty and null inputs', () => {
      expect(getMultiplier(' ')).toBe(1);
      expect(() => getMultiplier(null)).toThrow('Input text cannot be null or undefined');
    });
  });

  describe('valueInBtc', () => {
    it('should convert fiat to BTC with 4 decimal places', () => {
      // Mock BTC price: $50,000
      const btcPrice = 50000;
      
      // $100,000 = 2 BTC
      expect(valueInBtc(100000, btcPrice)).toBe('2');
      
      // $25,000 = 0.5 BTC
      expect(valueInBtc(25000, btcPrice)).toBe('0.5');
      
      // $1,000 = 0.02 BTC
      expect(valueInBtc(1000, btcPrice)).toBe('0.02');
      
      // $1 = 0.00002 BTC (very small, so display as minimum value)
      expect(valueInBtc(1, btcPrice)).toBe('0.0001');
      
      // $0.1 = 0.000002 BTC (very small, so display as minimum value)
      expect(valueInBtc(0.1, btcPrice)).toBe('0.0001');
    });
    
    it('should handle edge cases properly', () => {
      expect(valueInBtc(0, 50000)).toBe('0');
      expect(() => valueInBtc(100, 0)).toThrow('Invalid bitcoin price');
      expect(() => valueInBtc(100, -1)).toThrow('Invalid bitcoin price');
    });
  });

  describe('valueInSats', () => {
    it('should convert fiat to sats with 0 decimal places', () => {
      // Mock sat price: 1 sat = $0.0005 (BTC at $50,000)
      const satPrice = 0.0005;
      
      // $1 = 2,000 sats
      expect(valueInSats(1, satPrice)).toBe('2,000');
      
      // $0.1 = 200 sats
      expect(valueInSats(0.1, satPrice)).toBe('200');
      
      // $10 = 20,000 sats
      expect(valueInSats(10, satPrice)).toBe('20,000');
      
      // $0.0005 = 1 sat
      expect(valueInSats(0.0005, satPrice)).toBe('1');
      
      // $0.00025 = 0.5 sat, which rounds to 1
      expect(valueInSats(0.00025, satPrice)).toBe('1');
    });
    
    it('should handle edge cases properly', () => {
      expect(valueInSats(0, 0.0005)).toBe('0');
      expect(() => valueInSats(100, 0)).toThrow('Invalid satoshi price');
      expect(() => valueInSats(100, -1)).toThrow('Invalid satoshi price');
    });
  });
  
  describe('makeSnippet', () => {
    it('should use BTC for large values', () => {
      const btcPrice = 50000;
      const satPrice = 0.0005;
      
      // Amount larger than BTC price should use BTC
      const largeResult = makeSnippet('$60000', 60000, btcPrice, satPrice);
      expect(largeResult).toContain('BTC');
      expect(largeResult).not.toContain('sats');
      expect(largeResult).toBe('$60000 (1.2 BTC) ');
    });
    
    it('should use sats for small values', () => {
      const btcPrice = 50000;
      const satPrice = 0.0005;
      
      // Amount smaller than BTC price should use sats
      const smallResult = makeSnippet('$25', 25, btcPrice, satPrice);
      expect(smallResult).toContain('sats');
      expect(smallResult).not.toContain('BTC');
      expect(smallResult).toBe('$25 (50,000 sats) ');
    });
    
    it('should handle edge cases properly', () => {
      const btcPrice = 50000;
      const satPrice = 0.0005;
      
      // Equal to BTC price should use BTC
      const equalResult = makeSnippet('$50000', 50000, btcPrice, satPrice);
      expect(equalResult).toContain('BTC');
      expect(equalResult).toBe('$50000 (1 BTC) ');
      
      // Zero amount
      const zeroResult = makeSnippet('$0', 0, btcPrice, satPrice);
      expect(zeroResult).toContain('sats');
      expect(zeroResult).toBe('$0 (0 sats) ');
      
      // Invalid inputs
      expect(() => makeSnippet('$100', 100, 0, satPrice)).toThrow('Invalid bitcoin price');
      expect(() => makeSnippet('$100', 100, btcPrice, 0)).toThrow('Invalid satoshi price');
    });
  });
  
  describe('calculateSatPrice', () => {
    it('should calculate sat price correctly from BTC price', () => {
      expect(calculateSatPrice(50000)).toBe(0.0005);
      expect(calculateSatPrice(100000)).toBe(0.001);
      expect(calculateSatPrice(1)).toBe(0.00000001);
    });
    
    it('should handle edge cases properly', () => {
      expect(() => calculateSatPrice(0)).toThrow('Invalid bitcoin price');
      expect(() => calculateSatPrice(-1)).toThrow('Invalid bitcoin price');
    });
  });
});