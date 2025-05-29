/**
 * DOM and MutationObserver test builders using satisfies operator
 */

import { vi } from 'vitest';

/**
 * Create a mock NodeListOf<T> that satisfies the interface requirements
 */
export const createMockNodeList = <T extends Node>(nodes: T[] = []): NodeListOf<T> => {
  const nodeList = {
    length: nodes.length,
    item(index: number): T | null {
      return nodes[index] ?? null;
    },
    [Symbol.iterator]: function* () {
      for (const node of nodes) {
        yield node;
      }
    },
    forEach(callback: (value: T, key: number, parent: NodeListOf<T>) => void, thisArg?: any): void {
      nodes.forEach((node, index) => {
        callback.call(thisArg, node, index, this as NodeListOf<T>);
      });
    },
    entries(): IterableIterator<[number, T]> {
      return nodes.entries();
    },
    keys(): IterableIterator<number> {
      return nodes.keys();
    },
    values(): IterableIterator<T> {
      return nodes.values();
    },
    // Add indexed properties
    ...nodes.reduce((acc, node, index) => ({
      ...acc,
      [index]: node
    }), {} as { [index: number]: T })
  } satisfies NodeListOf<T>;
  
  return nodeList;
};

/**
 * Create a mock MutationRecord
 */
export const createMockMutationRecord = (overrides?: Partial<MutationRecord>): MutationRecord => ({
  type: 'childList' as MutationRecordType,
  target: document.createElement('div'),
  addedNodes: createMockNodeList([]),
  removedNodes: createMockNodeList([]),
  previousSibling: null,
  nextSibling: null,
  attributeName: null,
  attributeNamespace: null,
  oldValue: null,
  ...overrides
} satisfies MutationRecord);

/**
 * Create a mock MutationObserver instance
 */
export const createMockMutationObserverInstance = () => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn().mockReturnValue([]),
} satisfies MutationObserver);

/**
 * Create a mock MutationObserver constructor
 */
export const createMockMutationObserver = () => {
  const instances: MutationObserver[] = [];
  let capturedCallback: MutationCallback | null = null;
  
  const MockMutationObserver = vi.fn().mockImplementation((callback: MutationCallback) => {
    capturedCallback = callback;
    const instance = createMockMutationObserverInstance();
    instances.push(instance);
    
    // Store callback for testing
    (instance as any)._callback = callback;
    
    return instance;
  }) as unknown as typeof MutationObserver;
  
  // Add helper methods
  (MockMutationObserver as any).getInstances = () => instances;
  (MockMutationObserver as any).clearInstances = () => instances.length = 0;
  (MockMutationObserver as any).getCapturedCallback = () => capturedCallback;
  
  return MockMutationObserver;
};

/**
 * Create a mock MutationObserver constructor with callback capture
 */
export const createMockMutationObserverWithCallback = () => {
  let capturedCallback: MutationCallback | null = null;
  const mockObserve = vi.fn();
  const mockDisconnect = vi.fn();
  
  const MockMutationObserver = vi.fn().mockImplementation((callback: MutationCallback) => {
    capturedCallback = callback;
    return {
      observe: mockObserve,
      disconnect: mockDisconnect,
      takeRecords: vi.fn().mockReturnValue([])
    } satisfies MutationObserver;
  }) as unknown as typeof MutationObserver;
  
  return {
    MockMutationObserver,
    getCapturedCallback: () => capturedCallback,
    mockObserve,
    mockDisconnect
  };
};

/**
 * Create a text node with content
 */
export const createTextNode = (content: string): Text => 
  document.createTextNode(content);

/**
 * Create an element with optional attributes and children
 */
export const createElement = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options?: {
    attributes?: Record<string, string>;
    children?: (Node | string)[];
    textContent?: string;
  }
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tagName);
  
  if (options?.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  if (options?.textContent) {
    element.textContent = options.textContent;
  } else if (options?.children) {
    options.children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }
  
  return element;
};

/**
 * Create a DOM tree for testing price detection
 */
export const createPriceElement = (price: string, options?: {
  className?: string;
  id?: string;
  tagName?: keyof HTMLElementTagNameMap;
}): HTMLElement => {
  return createElement(options?.tagName || 'span', {
    attributes: {
      ...(options?.className && { class: options.className }),
      ...(options?.id && { id: options.id }),
    },
    textContent: price
  });
};

/**
 * Create mock DOM elements with nested price information
 */
export const createNestedPriceDOM = (): HTMLElement => {
  return createElement('div', {
    attributes: { class: 'product' },
    children: [
      createElement('h2', { textContent: 'Product Name' }),
      createElement('div', {
        attributes: { class: 'price-container' },
        children: [
          createPriceElement('$99.99', { className: 'price' }),
          createElement('span', { textContent: ' USD' })
        ]
      })
    ]
  });
};