import { describe, expect, it } from 'vitest';
import { findAndAnnotatePrices } from './dom';
import { PriceData } from '../common/types';

// Test data
const mockPriceData: PriceData = {
  usdRate: 30000,
  satoshiRate: 0.0003, // 30000 USD = 100M satoshis
  fetchedAt: Date.now(),
  source: 'CoinGecko'
};

describe('dom.ts', () => {
  describe('Price Pattern Matching', () => {
    it('should match prices with preceding dollar sign', () => {
      const patterns = [
        '$100',
        '$ 100',
        '$1,000',
        '$1,000.50',
        '$10k',
        '$10 k',
        '$10 million',
        '$1.5b',
        '$2.5 trillion'
      ];

      patterns.forEach(pattern => {
        const textNode = document.createTextNode(pattern);
        const parent = document.createElement('div');
        parent.appendChild(textNode);

        findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
        
        // Check that the pattern was annotated (now contains parentheses)
        expect(textNode.nodeValue).toContain('(');
        expect(textNode.nodeValue).toContain(')');
        expect(textNode.nodeValue).toMatch(/(sats|BTC)/);
      });
    });

    it('should match prices with concluding USD', () => {
      const patterns = [
        '100 USD',
        '100USD',
        '1,000 USD',
        '1,000.50 USD',
        '10k USD',
        '10 k USD',
        '10 million USD',
        '1.5b USD',
        '2.5 trillion USD'
      ];

      patterns.forEach(pattern => {
        const textNode = document.createTextNode(pattern);
        const parent = document.createElement('div');
        parent.appendChild(textNode);

        findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
        
        // Check that the pattern was annotated
        expect(textNode.nodeValue).toContain('(');
        expect(textNode.nodeValue).toContain(')');
        expect(textNode.nodeValue).toMatch(/(sats|BTC)/);
      });
    });

    it('should not match invalid price patterns', () => {
      const patterns = [
        'EUR 100',
        '100 EUR',
        'random text',
        '$',
        'USD',
        ''
      ];

      patterns.forEach(pattern => {
        const textNode = document.createTextNode(pattern);
        const parent = document.createElement('div');
        parent.appendChild(textNode);

        findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
        
        expect(textNode.nodeValue).toBe(pattern);
      });
    });
  });

  describe('Price Conversion', () => {
    it('should convert small amounts to satoshis', () => {
      const textNode = document.createTextNode('$0.01');
      const parent = document.createElement('div');
      parent.appendChild(textNode);

      findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
      
      expect(textNode.nodeValue).toContain('sats');
      expect(textNode.nodeValue).not.toContain('BTC');
    });

    it('should convert medium amounts to appropriate units', () => {
      const patterns = [
        { input: '$0.50', expected: 'sats' },
        { input: '$10', expected: 'k sats' },
        { input: '$500', expected: 'M sats' },
        { input: '$50000', expected: 'BTC' }
      ];

      patterns.forEach(({ input, expected }) => {
        const textNode = document.createTextNode(input);
        const parent = document.createElement('div');
        parent.appendChild(textNode);

        findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
        
        expect(textNode.nodeValue).toContain(expected);
      });
    });

    it('should handle magnitude multipliers correctly', () => {
      const patterns = [
        { input: '$10k', usdAmount: 10000 },
        { input: '$10.5k', usdAmount: 10500 },
        { input: '$10m', usdAmount: 10000000 },
        { input: '$10 million', usdAmount: 10000000 },
        { input: '$1b', usdAmount: 1000000000 },
        { input: '$1 billion', usdAmount: 1000000000 },
        { input: '$1t', usdAmount: 1000000000000 },
        { input: '$1 trillion', usdAmount: 1000000000000 }
      ];

      patterns.forEach(({ input }) => {
        const textNode = document.createTextNode(input);
        const parent = document.createElement('div');
        parent.appendChild(textNode);

        const inputEscaped = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const expectedPattern = new RegExp(`${inputEscaped}\\s*\\(`);

        findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
        
        expect(textNode.nodeValue).toMatch(expectedPattern);
      });
    });

    it('should format numbers with appropriate precision', () => {
      const textNode = document.createTextNode('$123.456');
      const parent = document.createElement('div');
      parent.appendChild(textNode);

      findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
      
      // Should have annotation with proper formatting
      expect(textNode.nodeValue).toContain('$123.456');
      expect(textNode.nodeValue).toContain('(');
      expect(textNode.nodeValue).toContain(')');
      expect(textNode.nodeValue).toMatch(/(sats|BTC)/);
    });
  });

  describe('DOM Traversal', () => {
    it('should process nested text nodes', () => {
      const parent = document.createElement('div');
      const child1 = document.createElement('span');
      const child2 = document.createElement('span');
      
      child1.appendChild(document.createTextNode('Price is $100'));
      child2.appendChild(document.createTextNode('or maybe $200'));
      
      parent.appendChild(child1);
      parent.appendChild(child2);

      findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
      
      expect(child1.textContent).toContain('(');
      expect(child1.textContent).toContain(')');
      expect(child2.textContent).toContain('(');
      expect(child2.textContent).toContain(')');
    });

    it('should skip non-text nodes', () => {
      const parent = document.createElement('div');
      const img = document.createElement('img');
      const text = document.createTextNode('$100');
      
      parent.appendChild(img);
      parent.appendChild(text);

      findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
      
      expect(text.nodeValue).toContain('(');
      expect(text.nodeValue).toContain(')');
      expect(img.outerHTML).toBe('<img>');
    });

    it('should handle deep nesting', () => {
      const root = document.createElement('div');
      let current = root;
      
      // Create nested structure
      for (let i = 0; i < 5; i++) {
        const next = document.createElement('div');
        current.appendChild(next);
        current = next;
      }
      
      current.appendChild(document.createTextNode('Deep price: $999'));

      findAndAnnotatePrices(root, mockPriceData, new Set<Node>());
      
      expect(current.textContent).toContain('(');
      expect(current.textContent).toContain(')');
      expect(current.textContent).toMatch(/(sats|BTC)/);
    });
  });

  describe('Amazon-specific handling', () => {
    it('should clear Amazon currency symbol elements', () => {
      const parent = document.createElement('div');
      const currency1 = document.createElement('span');
      const currency2 = document.createElement('span');
      
      currency1.className = 'sx-price-currency';
      currency2.className = 'a-price-symbol';
      
      currency1.appendChild(document.createTextNode('$'));
      currency2.appendChild(document.createTextNode('$'));
      
      parent.appendChild(currency1);
      parent.appendChild(currency2);

      findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
      
      // nodeValue is set to null, but depending on JSDOM version, may return differently
      const value1 = currency1.firstChild?.nodeValue;
      const value2 = currency2.firstChild?.nodeValue;
      expect(value1 === null || value1 === 'null').toBe(true);
      expect(value2 === null || value2 === 'null').toBe(true);
    });

    it('should handle Amazon whole and fractional price elements', () => {
      const parent = document.createElement('div');
      
      // sx-price pattern
      const whole1 = document.createElement('span');
      whole1.className = 'sx-price-whole';
      whole1.appendChild(document.createTextNode('29'));
      
      const fraction1 = document.createElement('span');
      fraction1.className = 'sx-price-fractional';
      fraction1.appendChild(document.createTextNode('99'));
      
      parent.appendChild(whole1);
      parent.appendChild(fraction1);

      findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
      
      expect(whole1.textContent).toContain('$29.99');
      expect(whole1.textContent).toContain('(');
      expect(whole1.textContent).toContain(')');
      const fractionValue1 = fraction1.firstChild?.nodeValue;
      expect(fractionValue1 === null || fractionValue1 === 'null').toBe(true);
    });

    it('should handle Amazon a-price pattern', () => {
      const parent = document.createElement('div');
      
      // a-price pattern
      const whole = document.createElement('span');
      whole.className = 'a-price-whole';
      whole.appendChild(document.createTextNode('49'));
      
      const fraction = document.createElement('span');
      fraction.className = 'a-price-fraction';
      fraction.appendChild(document.createTextNode('95'));
      
      parent.appendChild(whole);
      parent.appendChild(fraction);

      findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
      
      expect(whole.textContent).toContain('$49.95');
      expect(whole.textContent).toContain('(');
      expect(whole.textContent).toContain(')');
      const fractionValue = fraction.firstChild?.nodeValue;
      expect(fractionValue === null || fractionValue === 'null').toBe(true);
    });

    it('should skip Amazon fractional elements without whole part', () => {
      const parent = document.createElement('div');
      
      const fraction = document.createElement('span');
      fraction.className = 'sx-price-fractional';
      fraction.appendChild(document.createTextNode('99'));
      
      parent.appendChild(fraction);
      
      const originalContent = fraction.textContent;

      findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
      
      // Should remain unchanged
      expect(fraction.textContent).toBe(originalContent);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing nodeValue', () => {
      const parent = document.createElement('div');
      const textNode = document.createTextNode('');
      textNode.nodeValue = null;
      parent.appendChild(textNode);

      expect(() => findAndAnnotatePrices(parent, mockPriceData, new Set<Node>())).not.toThrow();
    });

    it('should handle empty strings', () => {
      const parent = document.createElement('div');
      parent.appendChild(document.createTextNode(''));

      expect(() => findAndAnnotatePrices(parent, mockPriceData, new Set<Node>())).not.toThrow();
    });

    it('should handle multiple prices in one text node', () => {
      const textNode = document.createTextNode('First price $100 and second price $200 end');
      const parent = document.createElement('div');
      parent.appendChild(textNode);

      findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
      
      const content = textNode.nodeValue || '';
      const matches = content.match(/\(/g);
      expect(matches).toHaveLength(2);
    });

    it('should handle mixed case magnitude indicators', () => {
      const patterns = [
        '$10K',
        '$10M',  
        '$10B',
        '$10T'
      ];

      patterns.forEach(pattern => {
        const textNode = document.createTextNode(pattern);
        const parent = document.createElement('div');
        parent.appendChild(textNode);

        findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
        
        expect(textNode.nodeValue).toContain('(');
        expect(textNode.nodeValue).toContain(')');
        expect(textNode.nodeValue).toMatch(/(sats|BTC)/);
      });
    });

    it('should handle decimal prices', () => {
      const textNode = document.createTextNode('$0.99');
      const parent = document.createElement('div');
      parent.appendChild(textNode);

      findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
      
      expect(textNode.nodeValue).toContain('(');
      expect(textNode.nodeValue).toContain(')');
      expect(textNode.nodeValue).toContain('sats');
    });

    it('should maintain original text when no modification needed', () => {
      const textNode = document.createTextNode('No prices here');
      const parent = document.createElement('div');
      parent.appendChild(textNode);

      const originalValue = textNode.nodeValue;

      findAndAnnotatePrices(parent, mockPriceData, new Set<Node>());
      
      expect(textNode.nodeValue).toBe(originalValue);
    });
  });
});