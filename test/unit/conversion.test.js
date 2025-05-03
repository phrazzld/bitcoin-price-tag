import { describe, it, expect } from 'vitest';

// Import the functions directly from content.js
// This would normally be done by refactoring the content.js file to export these functions
// For now, we'll define them here for testing

const ONE_TRILLION = 1000000000000;
const ONE_BILLION = 1000000000;
const ONE_MILLION = 1000000;
const ONE_THOUSAND = 1000;

// Sample function to test
function getMultiplier(text) {
  let multiplier = 1;
  if (text.toLowerCase().indexOf("t") > -1) {
    multiplier = ONE_TRILLION;
  } else if (text.toLowerCase().indexOf("b") > -1) {
    multiplier = ONE_BILLION;
  } else if (text.toLowerCase().indexOf("m") > -1) {
    multiplier = ONE_MILLION;
  } else if (text.toLowerCase().indexOf("k") > -1) {
    multiplier = ONE_THOUSAND;
  }
  return multiplier;
}

// Sample function to test
function valueInBtc(fiatAmount, btcPrice) {
  return parseFloat((fiatAmount / btcPrice).toFixed(4)).toLocaleString();
}

// Sample function to test
function valueInSats(fiatAmount, satPrice) {
  return parseFloat((fiatAmount / satPrice).toFixed(0)).toLocaleString();
}

describe('Bitcoin Price Tag Conversion Functions', () => {
  describe('getMultiplier', () => {
    it('should return 1 for regular numbers', () => {
      expect(getMultiplier('$100')).toBe(1);
      expect(getMultiplier('100 USD')).toBe(1);
    });

    it('should detect thousands (k)', () => {
      expect(getMultiplier('$10k')).toBe(ONE_THOUSAND);
      expect(getMultiplier('5k USD')).toBe(ONE_THOUSAND);
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
    });
  });
});