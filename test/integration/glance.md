```
/Users/phaedrus/Development/bitcoin-price-tag/test/integration
```

## Technical Overview

This directory contains integration tests for the Bitcoin Price Tag browser extension. The purpose of these tests is to verify the correct end-to-end behavior of the extension in a simulated browser environment. This includes DOM manipulation, error handling, and interaction with the extension's background script.

### Architecture

The integration tests use Vitest as a testing framework. The tests simulate the browser environment using `jsdom`, allowing manipulation of the DOM and mocking of browser APIs like `chrome.runtime`. The tests focus on verifying the extension's core functionalities, such as:

- **DOM Scanning and Price Detection:** Identifying price elements within a webpage's DOM.
- **Currency Conversion:** Converting fiat currency amounts to Bitcoin (BTC) or satoshis (sats).
- **DOM Updates:** Annotating the DOM with the converted Bitcoin/satoshi prices.
- **Error Handling:** Ensuring graceful failure and recovery in various error scenarios.

The tests achieve integration by:

- Mocking the `chrome.runtime.sendMessage` API to simulate communication with the background script for fetching Bitcoin price data.
- Creating a private module scope to import and test the content script's functions without immediately executing them.
- Using `vi.spyOn` to track calls to key functions like `conversion.makeSnippet` for verification.
- Manipulating the global `document` and `globalThis` objects to simulate different browser environments and error conditions.

### Key File Roles

- **`critical-fixes.test.js`:** This file focuses on testing the extension's ability to handle critical error scenarios and browser compatibility issues. It includes tests for:
  - `Fetch lifecycle error resolution`: Tests the handling of network errors during price fetching.
  - `Node is not defined reference resolution`: Tests the extension's behavior in environments where the `Node` object is not defined.
  - `Bootstrap module loading failure handling`: Tests the handling of errors during the loading of the extension's bootstrap module.
  - `CSP violation resolution`: Tests the extension's ability to handle Content Security Policy (CSP) restrictions by injecting scripts in a CSP-compliant manner.
- **`dom-manipulation.test.js`:** This file focuses on testing the extension's DOM manipulation capabilities. It includes tests for:
  - Basic text node conversion: Tests the conversion of prices in simple text nodes.
  - Nested DOM elements: Tests the conversion of prices within nested DOM structures.
  - Amazon-style price elements: Tests the conversion of prices in the specific DOM structure used by Amazon.
  - Edge cases: Tests the handling of empty elements, malformed HTML, and very small or very large prices.

### Important Dependencies and Gotchas

- **Vitest:** The testing framework used for running the tests.
- **jsdom:** A pure JavaScript implementation of the DOM and HTML standards, used to simulate the browser environment.
- **`chrome.runtime` API:** The tests rely on mocking the `chrome.runtime.sendMessage` API to simulate communication with the extension's background script.
- **`globalThis` object:** The tests manipulate the `globalThis` object to simulate different browser environments and error conditions. This can be fragile and requires careful restoration of the original values after each test.
- **Asynchronous Operations:** The tests involve asynchronous operations (e.g., mocking `fetch`), requiring the use of `async/await` and careful handling of promises.
- **Module Scope:** The tests create a private module scope to import and test the content script's functions. This requires careful recreation of the necessary functions and mocks within the test environment.
- **DOM Manipulation:** The tests directly manipulate the DOM, which can be complex and requires careful attention to detail. The tests attempt to create realistic DOM structures, but may not fully replicate the complexity of real-world websites.
- **Mocking:** The tests rely heavily on mocking browser APIs and extension functions. This can make the tests brittle if the underlying implementation changes. It's important to keep the mocks up-to-date with the actual implementation.
- **Content Security Policy (CSP):** The CSP tests require careful attention to detail to ensure that the extension is injecting scripts in a CSP-compliant manner. The tests mock the CSP meta tag and verify that the extension is using external scripts instead of inline scripts when necessary.

```

```
