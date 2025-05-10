```
## Technical Overview of `/Users/phaedrus/Development/bitcoin-price-tag/test/performance`

This directory contains performance tests for the DOM scanning algorithm used to identify and convert fiat prices to Bitcoin equivalents within a web page's content. The primary goal is to assess and compare the performance of different DOM scanning approaches, specifically an "original" (likely a baseline or less-optimized) algorithm versus an "optimized" algorithm.

### Architecture

The tests are structured around the `vitest` testing framework.  They use `happy-dom` to create a simulated browser environment, including a `window` and `document` object. The core of the tests involves generating artificial DOM structures of varying sizes and complexities, then measuring the execution time of the DOM scanning algorithms against these structures. Performance is measured using the `performance.now()` API, and the results are logged to the console.  The tests compare the average execution time of the "original" and "optimized" algorithms across different DOM sizes (small, medium, large) and a more complex, "real-world-like" DOM structure.

### Key File Roles

*   **`dom-scanning.test.js`**: This file contains the core performance tests.
    *   It imports testing utilities from `vitest` (`expect`, `describe`, `it`, etc.) and `happy-dom` (`Window`).
    *   It imports the `scanDomForPrices` function, which is the "optimized" DOM scanning algorithm under test, from `../../dom-scanner.js`.
    *   It defines helper functions:
        *   `createTestEnvironment()`: Sets up the simulated browser environment using `happy-dom`, including mocking necessary global objects like `document`, `window`, `Node`, `Element`, `IntersectionObserver`, and `MutationObserver`.  It also mocks `window.getComputedStyle` and provides a basic `classList` implementation if one is not already present.
        *   `generateTestContent()`: Creates artificial HTML content with varying levels of complexity and a controlled number of price elements.  It generates different price formats and regular content to simulate real-world scenarios.
        *   `measurePerformance()`: Measures the execution time of a given function over a specified number of iterations, returning the total and average execution times.
        *   Mocked utility functions (`buildPrecedingMatchPattern`, `buildConcludingMatchPattern`, `makeSnippet`, `extractNumericValue`) to isolate the DOM scanning performance from the actual price conversion logic.  These mocks are crucial for ensuring that the tests focus solely on the DOM traversal aspects.
        *   `originalWalk()`: Implements a basic DOM traversal algorithm (likely the baseline or less-optimized version) for performance comparison.  This function recursively walks the DOM tree, processing text nodes and skipping certain elements (e.g., `<script>`, `<style>`).
    *   It defines `describe` blocks that group the performance tests for the "original" and "optimized" algorithms.
    *   Each `it` block performs the following steps:
        1.  Generates test content using `generateTestContent()`.
        2.  Measures the execution time of the DOM scanning algorithm using `measurePerformance()`.
        3.  Logs the average execution time to the console using `console.debug()`.
        4.  Includes a basic `expect` assertion to verify that the average time is defined.
    *   The final `it` block compares the performance of the "original" and "optimized" algorithms on a more realistic DOM structure.

### Important Dependencies and Gotchas

*   **`vitest`**:  The testing framework used to structure and run the performance tests.
*   **`happy-dom`**:  A headless browser environment that provides a `window` and `document` object for simulating a web page.  It's crucial for running DOM manipulation code in a Node.js environment.
*   **`../../dom-scanner.js`**: This file contains the `scanDomForPrices` function, which is the "optimized" DOM scanning algorithm being tested. Changes to this file will directly impact the performance test results.
*   **Mocking**: The tests heavily rely on mocking global objects and utility functions.  It's important to ensure that these mocks accurately simulate the behavior of the real dependencies without introducing performance bottlenecks.  The mocks for `buildPrecedingMatchPattern`, `buildConcludingMatchPattern`, `makeSnippet`, `extractNumericValue` are particularly important for isolating the DOM scanning logic.
*   **`performance.now()`**:  The accuracy of the performance measurements depends on the precision of `performance.now()`.  Variations in system load or browser behavior can affect the results.
*   **DOM Generation**: The `generateTestContent` function's design directly impacts the test. The types of elements, nesting, and the frequency of price-containing elements will influence performance.
*   **Heisenbugs**: Performance tests are susceptible to environmental factors and can exhibit variability. Running tests multiple times and averaging the results can help mitigate this.
*   **`originalWalk` Function:** The performance of the `originalWalk` function serves as the baseline. If this function is inefficient, it could skew the perception of the "optimized" algorithm's performance.
```
