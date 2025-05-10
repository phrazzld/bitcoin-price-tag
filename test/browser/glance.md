```text
/Users/phaedrus/Development/bitcoin-price-tag/test/browser

Purpose:
This directory contains browser compatibility tests for the Bitcoin Price Tag browser extension. The tests use Playwright to simulate user interactions and verify the extension's functionality across different browsers (Chromium, Firefox, and Webkit/Safari) and scenarios, especially on Amazon pages. The tests focus on ensuring that the extension correctly converts prices to Bitcoin or satoshis, handles different currency formats, deals with browser-specific DOM implementations, and gracefully handles errors and restricted contexts.

Architecture:
The tests are structured using Playwright's testing framework. They use a combination of mock extension environments, network mocking, and custom test helpers to isolate and verify the extension's behavior. The tests generally follow a pattern of:
1.  Setting up a mock extension environment and network mocking.
2.  Loading a test page (either a static HTML file or dynamically generated content).
3.  Injecting necessary extension scripts into the page context.
4.  Simulating user interactions or DOM changes.
5.  Verifying the expected behavior, such as price conversions or error handling.
The tests are designed to run in different browsers and to handle browser-specific differences in DOM implementations and API support.

Key File Roles:
*   `amazon-compatibility.test.js`: Contains tests specifically designed to verify the extension's compatibility with Amazon product, search, and cart pages. It covers scenarios such as handling restricted iframe contexts and DOM updates. It also contains a mock DOM processor that simulates the extension's behavior.
*   `browser-compatibility.test.js`: Contains tests that cover basic currency conversion and handling of different currency formats across different browsers.
*   `example.spec.js`: A simple example test that demonstrates basic browser compatibility checks and network mocking.
*   `global-setup.js`: Configures the test environment before any tests are run. Currently, it only logs setup and cleanup messages.
*   `test-helpers.js`: Provides helper functions for loading test pages, creating currency pages, waiting for currency conversions, and verifying conversions.
*   `amazon-test-helpers.js`: Provides helper functions specifically for testing the Amazon integration, such as loading Amazon fixture files, enabling diagnostic mode, and verifying price conversions.
*   `browser-specific.test.js`: Contains tests that specifically target browser-specific implementation details and interactions, such as differences in `textContent` vs `innerText` and CSS selector compatibility.
*   `mock-extension.js`: Provides functions for creating a mock extension environment in the browser, including a mock Chrome API and functions for injecting extension scripts.
*   `network-mock.js`: Provides utilities for intercepting and mocking network requests during tests, allowing for isolated testing of the extension's behavior without relying on external APIs.

Important Dependencies and Gotchas:
*   Playwright: The tests rely heavily on Playwright's testing framework for browser automation and test execution.
*   Mock Extension Environment: The tests use a mock extension environment to simulate the extension's runtime context, including the Chrome API and extension storage.
*   Network Mocking: Network requests are mocked to isolate the extension's behavior and ensure consistent test results.
*   Browser-Specific Differences: The tests need to account for browser-specific differences in DOM implementations, API support, and CSS selector behavior.
*   Asynchronous Operations: The tests involve asynchronous operations, such as loading pages, injecting scripts, and waiting for DOM changes. Proper handling of these operations is crucial for reliable test results.
*   Amazon's DOM Structure: The Amazon-specific tests need to be resilient to changes in Amazon's DOM structure, as these changes can break the tests.
*   Restricted Contexts: The tests need to handle restricted contexts, such as sandboxed iframes, gracefully, without causing the extension to crash.
```
