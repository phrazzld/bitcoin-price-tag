/**
 * Performance tests for DOM scanning algorithm
 */
import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

import { walkDomTree, scanDomForPrices } from '../../dom-scanner.js';

// Create a test environment
function createTestEnvironment() {
  // Create a DOM with varying levels of complexity
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>DOM Scanning Performance Test</title>
    </head>
    <body>
      <div id="test-container"></div>
    </body>
    </html>
  `);

  // Mock the global document and window
  global.document = dom.window.document;
  global.window = dom.window;
  global.Node = dom.window.Node;
  global.Element = dom.window.Element;
  global.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  global.MutationObserver =
    dom.window.MutationObserver ||
    class {
      constructor() {}
      observe() {}
      disconnect() {}
    };

  // Mock window.getComputedStyle
  global.window.getComputedStyle = (element) => ({
    display: 'block',
    visibility: 'visible',
    opacity: '1',
  });

  // Add Element.prototype.classList if missing
  if (!global.Element.prototype.classList) {
    class ClassList {
      constructor(element) {
        this.element = element;
        this._classes = element.className ? element.className.split(/\s+/) : [];
      }

      contains(cls) {
        return this._classes.includes(cls);
      }

      add(cls) {
        if (!this.contains(cls)) {
          this._classes.push(cls);
          this.element.className = this._classes.join(' ');
        }
      }

      remove(cls) {
        const index = this._classes.indexOf(cls);
        if (index !== -1) {
          this._classes.splice(index, 1);
          this.element.className = this._classes.join(' ');
        }
      }

      get value() {
        return this._classes.join(' ');
      }
    }

    Object.defineProperty(global.Element.prototype, 'classList', {
      get() {
        if (!this._classList) {
          this._classList = new ClassList(this);
        }
        return this._classList;
      },
    });
  }

  return { dom, document: dom.window.document };
}

// Generate test content with varying complexity
function generateTestContent(elementCount, priceCount) {
  // Generate a mix of regular elements and elements with prices
  let html = '';
  const priceInterval = Math.max(1, Math.floor(elementCount / (priceCount || 1)));

  for (let i = 1; i <= elementCount; i++) {
    if (i % priceInterval === 0) {
      // Add price elements in various formats
      const priceFormat = i % 4;
      switch (priceFormat) {
        case 0:
          html += `<div class="price">$${(i * 10.99).toFixed(2)}</div>`;
          break;
        case 1:
          html += `<span class="cost">${(i * 5.5).toFixed(2)} USD</span>`;
          break;
        case 2:
          html += `<p>Regular price: <strong>$${(i * 25).toFixed(2)}</strong></p>`;
          break;
        case 3:
          html += `<div class="product">
                    <h3>Product ${i}</h3>
                    <div class="a-price">
                      <span class="a-price-symbol">$</span>
                      <span class="a-price-whole">${Math.floor(i * 19.99)}</span>
                      <span class="a-price-decimal">.</span>
                      <span class="a-price-fraction">99</span>
                    </div>
                  </div>`;
          break;
      }
    } else {
      // Add regular elements with no prices
      const elementType = i % 5;
      switch (elementType) {
        case 0:
          html += `<div class="content-block">Regular content ${i}</div>`;
          break;
        case 1:
          html += `<p>This is paragraph ${i} with no prices</p>`;
          break;
        case 2:
          html += `<section id="section-${i}">
                    <h2>Section ${i}</h2>
                    <div>Content area with text</div>
                  </section>`;
          break;
        case 3:
          html += `<ul>
                    <li>Item ${i}.1</li>
                    <li>Item ${i}.2</li>
                    <li>Item ${i}.3</li>
                  </ul>`;
          break;
        case 4:
          html += `<div class="nested">
                    <div class="inner">
                      <span>Deeply nested content ${i}</span>
                    </div>
                  </div>`;
          break;
      }
    }
  }

  return html;
}

// Performance measurement utility
function measurePerformance(fn, iterations = 1) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  return {
    totalTime: end - start,
    averageTime: (end - start) / iterations,
  };
}

describe('DOM Scanning Performance', () => {
  let env;

  beforeEach(() => {
    env = createTestEnvironment();

    // Mock required functions from conversion.js
    global.buildPrecedingMatchPattern = () => /\$\s?\d[\d,]*(\.\d+)?/gi;
    global.buildConcludingMatchPattern = () => /\d[\d,]*(\.\d+)?\s?USD/gi;
    global.makeSnippet = (sourceElement, fiatAmount, btcPrice, satPrice) =>
      `${sourceElement} (${fiatAmount / btcPrice} BTC)`;
    global.getMultiplier = () => 1;
    global.extractNumericValue = (str) => parseFloat(str.replace(/[^\d.]/g, ''));

    // Mock globals needed for content.js
    global.btcPrice = 50000;
    global.satPrice = 0.0005;
  });

  afterEach(() => {
    // Clean up
    global.document = undefined;
    global.window = undefined;
  });

  // Original walk implementation for benchmark comparison
  function originalWalk(node) {
    let child, next;

    // Safety check
    if (!node) return;

    switch (node.nodeType) {
      case 1: // Element
      case 9: // Document
      case 11: // Document fragment
        // Skip certain elements
        const tagName = node.tagName && node.tagName.toLowerCase();
        if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
          return;
        }

        child = node.firstChild;
        while (child) {
          next = child.nextSibling;

          // Skip special case handling for Amazon prices in test

          originalWalk(child);
          child = next;
        }
        break;

      case 3: // Text node
        // Only process non-empty text nodes
        if (node.nodeValue && node.nodeValue.trim() !== '') {
          // Mock convert function
          let nodeValue = node.nodeValue;
          const precedingPattern = buildPrecedingMatchPattern();
          nodeValue = nodeValue.replace(precedingPattern, (match) => {
            const amount = extractNumericValue(match);
            return makeSnippet(match, amount, btcPrice, satPrice);
          });

          const concludingPattern = buildConcludingMatchPattern();
          nodeValue = nodeValue.replace(concludingPattern, (match) => {
            const amount = extractNumericValue(match);
            return makeSnippet(match, amount, btcPrice, satPrice);
          });

          node.nodeValue = nodeValue;
        }
        break;
    }
  }

  it('measures performance of original algorithm on small DOM', () => {
    const testContainer = env.document.getElementById('test-container');
    testContainer.innerHTML = generateTestContent(100, 20);

    const { averageTime } = measurePerformance(() => {
      originalWalk(env.document.body);
    }, 10);

    console.log(`Original algorithm (small DOM - 100 elements): ${averageTime.toFixed(2)}ms`);
    expect(averageTime).toBeDefined();
  });

  it('measures performance of original algorithm on medium DOM', () => {
    const testContainer = env.document.getElementById('test-container');
    testContainer.innerHTML = generateTestContent(1000, 200);

    const { averageTime } = measurePerformance(() => {
      originalWalk(env.document.body);
    }, 5);

    console.log(`Original algorithm (medium DOM - 1000 elements): ${averageTime.toFixed(2)}ms`);
    expect(averageTime).toBeDefined();
  });

  it('measures performance of original algorithm on large DOM', () => {
    const testContainer = env.document.getElementById('test-container');
    testContainer.innerHTML = generateTestContent(5000, 1000);

    const { averageTime } = measurePerformance(() => {
      originalWalk(env.document.body);
    }, 3);

    console.log(`Original algorithm (large DOM - 5000 elements): ${averageTime.toFixed(2)}ms`);
    expect(averageTime).toBeDefined();
  });

  // Test the optimized algorithm
  it('measures performance of optimized algorithm on small DOM', () => {
    const testContainer = env.document.getElementById('test-container');
    testContainer.innerHTML = generateTestContent(100, 20);

    const { averageTime } = measurePerformance(() => {
      scanDomForPrices(env.document.body, 50000, 0.0005);
    }, 10);

    console.log(`Optimized algorithm (small DOM - 100 elements): ${averageTime.toFixed(2)}ms`);
    expect(averageTime).toBeDefined();
  });

  it('measures performance of optimized algorithm on medium DOM', () => {
    const testContainer = env.document.getElementById('test-container');
    testContainer.innerHTML = generateTestContent(1000, 200);

    const { averageTime } = measurePerformance(() => {
      scanDomForPrices(env.document.body, 50000, 0.0005);
    }, 5);

    console.log(`Optimized algorithm (medium DOM - 1000 elements): ${averageTime.toFixed(2)}ms`);
    expect(averageTime).toBeDefined();
  });

  it('measures performance of optimized algorithm on large DOM', () => {
    const testContainer = env.document.getElementById('test-container');
    testContainer.innerHTML = generateTestContent(5000, 1000);

    const { averageTime } = measurePerformance(() => {
      scanDomForPrices(env.document.body, 50000, 0.0005);
    }, 3);

    console.log(`Optimized algorithm (large DOM - 5000 elements): ${averageTime.toFixed(2)}ms`);
    expect(averageTime).toBeDefined();
  });

  it('compares original vs optimized on real-world-like DOM', () => {
    // Create a more realistic DOM structure with nested elements and various price formats
    const testContainer = env.document.getElementById('test-container');
    testContainer.innerHTML = `
      <header>
        <nav>
          <ul>
            <li>Home</li>
            <li>Products</li>
            <li>Cart</li>
          </ul>
        </nav>
      </header>
      <main>
        <div class="hero-banner">
          <h1>Welcome to our store</h1>
        </div>
        <div class="product-grid">
          ${Array.from(
            { length: 30 },
            (_, i) => `
            <div class="product-card">
              <img src="product-${i}.jpg" alt="Product ${i}">
              <h3>Product ${i}</h3>
              <div class="product-price">$${(19.99 + i * 10).toFixed(2)}</div>
              <button>Add to Cart</button>
            </div>
          `,
          ).join('')}
        </div>
        <div class="featured-products">
          <h2>Featured Products</h2>
          ${Array.from(
            { length: 5 },
            (_, i) => `
            <div class="featured-product">
              <div class="product-info">
                <h3>Featured Product ${i}</h3>
                <p>Amazing product description ${i}</p>
              </div>
              <div class="product-details">
                <div class="original-price">$${(199.99 + i * 50).toFixed(2)}</div>
                <div class="sale-price">$${(149.99 + i * 50).toFixed(2)}</div>
                <button>Buy Now</button>
              </div>
            </div>
          `,
          ).join('')}
        </div>
        <div class="checkout-summary">
          <h2>Cart Summary</h2>
          <div class="summary-line">
            <span>Subtotal:</span>
            <span class="price">$129.95</span>
          </div>
          <div class="summary-line">
            <span>Tax:</span>
            <span class="price">$10.40</span>
          </div>
          <div class="summary-line">
            <span>Shipping:</span>
            <span class="price">$4.99</span>
          </div>
          <div class="summary-line total">
            <span>Total:</span>
            <span class="price">$145.34</span>
          </div>
        </div>
      </main>
      <footer>
        <div class="footer-links">...</div>
        <div class="copyright">...</div>
      </footer>
    `;

    // Measure original algorithm
    const originalPerf = measurePerformance(() => {
      originalWalk(env.document.body);
    }, 10);

    // Reset the test container
    testContainer.innerHTML = `
      <header>
        <nav>
          <ul>
            <li>Home</li>
            <li>Products</li>
            <li>Cart</li>
          </ul>
        </nav>
      </header>
      <main>
        <div class="hero-banner">
          <h1>Welcome to our store</h1>
        </div>
        <div class="product-grid">
          ${Array.from(
            { length: 30 },
            (_, i) => `
            <div class="product-card">
              <img src="product-${i}.jpg" alt="Product ${i}">
              <h3>Product ${i}</h3>
              <div class="product-price">$${(19.99 + i * 10).toFixed(2)}</div>
              <button>Add to Cart</button>
            </div>
          `,
          ).join('')}
        </div>
        <div class="featured-products">
          <h2>Featured Products</h2>
          ${Array.from(
            { length: 5 },
            (_, i) => `
            <div class="featured-product">
              <div class="product-info">
                <h3>Featured Product ${i}</h3>
                <p>Amazing product description ${i}</p>
              </div>
              <div class="product-details">
                <div class="original-price">$${(199.99 + i * 50).toFixed(2)}</div>
                <div class="sale-price">$${(149.99 + i * 50).toFixed(2)}</div>
                <button>Buy Now</button>
              </div>
            </div>
          `,
          ).join('')}
        </div>
        <div class="checkout-summary">
          <h2>Cart Summary</h2>
          <div class="summary-line">
            <span>Subtotal:</span>
            <span class="price">$129.95</span>
          </div>
          <div class="summary-line">
            <span>Tax:</span>
            <span class="price">$10.40</span>
          </div>
          <div class="summary-line">
            <span>Shipping:</span>
            <span class="price">$4.99</span>
          </div>
          <div class="summary-line total">
            <span>Total:</span>
            <span class="price">$145.34</span>
          </div>
        </div>
      </main>
      <footer>
        <div class="footer-links">...</div>
        <div class="copyright">...</div>
      </footer>
    `;

    // Measure optimized algorithm
    const optimizedPerf = measurePerformance(() => {
      scanDomForPrices(env.document.body, 50000, 0.0005);
    }, 10);

    console.log(`
    Real-world comparison:
    - Original algorithm: ${originalPerf.averageTime.toFixed(2)}ms
    - Optimized algorithm: ${optimizedPerf.averageTime.toFixed(2)}ms
    - Performance improvement: ${(((originalPerf.averageTime - optimizedPerf.averageTime) / originalPerf.averageTime) * 100).toFixed(2)}%
    `);

    expect(optimizedPerf.averageTime).toBeLessThan(originalPerf.averageTime);
  });
});
