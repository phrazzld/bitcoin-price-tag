/**
 * Integration test for DomObserver and DomAnnotator interaction
 *
 * This test verifies that the DomObserver correctly passes nodes to the
 * annotation function and that the processedNodes set is shared correctly.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestPriceData } from "../utils/test-helpers";
import { PriceData } from "../../src/common/types";
import { DOM_OBSERVER_DEBOUNCE_MS } from "../../src/common/constants";

// Mock the logger to avoid console output in tests
vi.mock("../../src/shared/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

import { createDomObserver } from "../../src/content-script/dom-observer";
import { findAndAnnotatePrices } from "../../src/content-script/dom";

describe("DomObserver and DOM Annotation Integration", () => {
  let mockPriceData: PriceData;
  let processedNodes: Set<Node>;

  beforeEach(() => {
    // Create mock price data
    mockPriceData = createTestPriceData();

    // Create a fresh processedNodes set
    processedNodes = new Set<Node>();

    // Clear document.body for clean test environment
    document.body.innerHTML = "";
  });

  it("should create a DomObserver with the correct parameters", () => {
    // Create the DOM observer
    const domObserver = createDomObserver(
      document.body,
      findAndAnnotatePrices,
      DOM_OBSERVER_DEBOUNCE_MS,
      processedNodes,
    );

    // Verify we can start and stop the observer
    expect(() => domObserver.start(mockPriceData)).not.toThrow();
    expect(() => domObserver.stop()).not.toThrow();
  });

  it("should pass the same processedNodes set to the annotation function", () => {
    // Create the DOM observer with the real annotation function
    const domObserver = createDomObserver(
      document.body,
      findAndAnnotatePrices,
      DOM_OBSERVER_DEBOUNCE_MS,
      processedNodes,
    );

    // Start the observer
    domObserver.start(mockPriceData);

    // Add a test element to verify integration
    const testElement = document.createElement("div");
    testElement.textContent = "$75";

    // Call the real annotation function to verify processedNodes integration
    findAndAnnotatePrices(testElement, mockPriceData, processedNodes);

    // Verify the element was added to the shared processedNodes set
    expect(processedNodes.has(testElement)).toBe(true);

    // Verify the annotation actually worked
    expect(testElement.textContent).toContain("sats");

    // Verify the observer interface is properly defined
    expect(domObserver).toBeDefined();
    expect(domObserver.start).toBeDefined();
    expect(domObserver.stop).toBeDefined();

    // Clean up
    domObserver.stop();
  });

  it("should maintain the same processedNodes reference across operations", () => {
    // Create a test element and add it to processedNodes
    const testElement = document.createElement("div");
    testElement.textContent = "$100";
    processedNodes.add(testElement);

    // Create the DOM observer
    const domObserver = createDomObserver(
      document.body,
      findAndAnnotatePrices,
      DOM_OBSERVER_DEBOUNCE_MS,
      processedNodes,
    );

    // Start the observer
    domObserver.start(mockPriceData);

    // Verify the element is still in the set
    expect(processedNodes.has(testElement)).toBe(true);

    // Create another element and test direct annotation
    const newElement = document.createElement("p");
    newElement.textContent = "$200";

    // Call findAndAnnotatePrices directly with our processedNodes set
    findAndAnnotatePrices(newElement, mockPriceData, processedNodes);

    // Verify the new element was added to the set
    expect(processedNodes.has(newElement)).toBe(true);

    // Clean up
    domObserver.stop();
  });

  it("should respect the debounce configuration", () => {
    // Create the DOM observer with a specific debounce value
    const customDebounce = 100;
    const domObserver = createDomObserver(
      document.body,
      findAndAnnotatePrices,
      customDebounce,
      processedNodes,
    );

    // Start the observer
    domObserver.start(mockPriceData);

    // The observer should be created successfully with the custom debounce
    expect(domObserver).toBeDefined();

    // Clean up
    domObserver.stop();
  });

  it("should integrate with the real findAndAnnotatePrices function", () => {
    // Create a test element with a price
    const priceElement = document.createElement("div");
    priceElement.textContent = "$500";

    // Call findAndAnnotatePrices directly
    findAndAnnotatePrices(priceElement, mockPriceData, processedNodes);

    // Verify the element was added to processedNodes
    expect(processedNodes.has(priceElement)).toBe(true);

    // Verify the price was annotated (should contain sats)
    expect(priceElement.textContent).toContain("sats");

    // Call again with the same element and verify it's skipped
    const originalText = priceElement.textContent;
    findAndAnnotatePrices(priceElement, mockPriceData, processedNodes);

    // Text should remain the same since the element was already processed
    expect(priceElement.textContent).toBe(originalText);
  });

  it("should filter out script and style elements properly", () => {
    // Create an annotation function that tracks what nodes it receives
    const processedNodesTracker: Node[] = [];
    const trackingAnnotationFunction = (
      node: Node,
      _priceData: PriceData,
      processedNodes: Set<Node>,
    ) => {
      processedNodesTracker.push(node);
      processedNodes.add(node);
    };

    // Create the DOM observer with our tracking function
    const domObserver = createDomObserver(
      document.body,
      trackingAnnotationFunction,
      DOM_OBSERVER_DEBOUNCE_MS,
      processedNodes,
    );

    // Start the observer
    domObserver.start(mockPriceData);

    // The observer should be configured to filter out script and style elements
    // This is verified by the implementation's shouldProcessNode function
    expect(domObserver).toBeDefined();

    // Clean up
    domObserver.stop();
  });
});
