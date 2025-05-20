# BACKLOG

## Critical Priority

### 🚨 Immediate Fixes & Blockers

- **[Fix] Update Tests and Mocks to Use CoinGecko API Instead of CoinDesk**
  - **Type**: Fix
  - **Complexity**: Medium
  - **Rationale**: CRITICAL - Tests and mocks currently use outdated CoinDesk API structures, while production code uses CoinGecko. This misalignment creates a false sense of security, risks undetected bugs, and hinders reliable verification of the V3 extension.
  - **Expected Outcome**: All test suites (unit, integration, E2E), mock implementations (`tests/mocks/fetch.ts`), and related documentation (`README.md`, `MANIFEST_V3_APPROACHES.md`) are updated to use the correct CoinGecko API URL and its corresponding response format. All tests pass reliably using CoinGecko data structures.
  - **Affected Files**: `src/service-worker/api.test.ts`, `tests/mocks/fetch.ts`, `README.md` (line 160), `verify-build.js` (line 69), `MANIFEST_V3_APPROACHES.md`

- **[Fix] Correct Manifest Host Permissions Check in Build Script**
  - **Type**: Fix
  - **Complexity**: Simple
  - **Rationale**: BLOCKER - The build verification script (`verify-build.js`) incorrectly checks for CoinDesk host permissions, while the Manifest V3 `manifest.json` correctly uses CoinGecko. This causes false negatives in the build process, preventing reliable build verification and deployment.
  - **Expected Outcome**: `verify-build.js` (line 69) is updated to correctly validate `*://api.coingecko.com/*` host permissions as defined in `src/manifest.json`. The build verification script passes when host permissions are correctly configured for CoinGecko.

## High Priority

### 🐛 Core Functionality & Reliability

- **[Refactor] Implement Robust Content Script Initialization for Dynamic Pages**
  - **Type**: Refactor
  - **Complexity**: High
  - **Rationale**: The current fixed `setTimeout` (2500ms) for content script initialization (`src/content-script/index.ts:30`) is fragile and unreliable. It frequently misses price annotations on dynamic, single-page applications (SPAs), or slow-loading pages, significantly degrading user experience and the extension's core value.
  - **Expected Outcome**: Replace `setTimeout` with a more robust DOM change detection mechanism (e.g., `MutationObserver`, `requestIdleCallback` combined with targeted DOM checks, or integration with page lifecycle events). Price annotation should occur reliably and consistently across various page types and loading behaviors.

- **[Security] Implement Deep Type Validation for Chrome API Messages**
  - **Type**: Security
  - **Complexity**: High
  - **Rationale**: Current type guards for Chrome API messages (`isPriceResponseMessage`, `isPriceRequestMessage`) perform only shallow validation. This poses a security risk and can lead to runtime errors if malformed or malicious messages are received, potentially crashing the service worker or content script. Deep validation is crucial for robust and secure inter-component communication.
  - **Expected Outcome**: Type guards are enhanced to perform deep, recursive validation of all message fields, including nested objects and their expected types (e.g., using a schema validation library or custom recursive checks). Malformed messages are safely rejected and logged appropriately.

- **[Fix] Ensure Correct Service Worker Memory Cache Versioning**
  - **Type**: Fix
  - **Complexity**: High
  - **Rationale**: The in-memory cache mirror in the Service Worker (`src/service-worker/cache.ts`) does not currently validate its version against the `CACHE_VERSION` constant. This can lead to serving stale data or encountering errors if the cache structure changes between extension updates, compromising data integrity and user experience.
  - **Expected Outcome**: The in-memory cache rehydration process and data access logic are updated to check `CACHE_VERSION`. If a version mismatch is detected, the stale memory cache is invalidated or migrated, ensuring data consistency and preventing errors from structural changes.

- **[Refactor] Extract Amazon-Specific DOM Logic into a Dedicated Module**
  - **Type**: Refactor
  - **Complexity**: High
  - **Rationale**: Hardcoded Amazon selectors and parsing logic (`src/content-script/dom.ts:168-205`) are tightly coupled within generic DOM traversal functions. This makes the code brittle, harder to maintain, clutters core logic, and risks breaking generic functionality if Amazon's site structure changes.
  - **Expected Outcome**: Amazon-specific DOM detection and price extraction logic is isolated into a separate, well-defined adapter module. The main DOM processing logic calls this adapter gracefully. Errors or changes specific to Amazon should not break generic price annotation on other sites.

### 🏛️ Price Annotation Modernization

- **[Enhancement] Modernize Currency Entity Recognition with Libraries**
  - **Type**: Enhancement
  - **Complexity**: Complex
  - **Rationale**: Current regex-based price detection (`src/content-script/dom.ts:11-44`) is overly complex, brittle, and difficult to maintain or extend for various currency formats and new websites. Using a specialized library (e.g., Microsoft Recognizers Text or similar) offers more robust, accurate, and maintainable currency entity recognition.
  - **Expected Outcome**: A robust NLP/entity recognition library is integrated to identify currency mentions and amounts in DOM text. This will lead to higher accuracy in price detection, reduced false positives/negatives, and easier extensibility for new currency formats or languages. Custom regex logic for price pattern matching is significantly reduced or eliminated.
  - **Dependencies**: Successful V3 Service Worker architecture.

- **[Enhancement] Implement Safe DOM Annotation with Libraries**
  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Direct text node modification for price annotation is fragile and can break website layouts or interfere with web application frameworks. A library like `mark.js` or `findAndReplaceDOMText` provides safer, more structured DOM manipulation, respecting existing DOM structure and event listeners.
  - **Expected Outcome**: Price annotations are applied using a robust DOM manipulation library. Annotations are wrapped in dedicated, stylable elements (e.g., `<span>`) without breaking page functionality or interfering with existing event listeners. This improves compatibility with complex web pages and simplifies styling.
  - **Dependencies**: Successful V3 Service Worker architecture; ideally follows "Modernize Currency Entity Recognition with Libraries".

### 🧪 Testing & Quality Assurance

- **[Testing] Standardize Test Mocks: Mock Logger Interface, Not Console**
  - **Type**: Testing
  - **Complexity**: High
  - **Rationale**: Current tests sometimes mock low-level `console` methods. This is brittle, tests implementation details, and doesn't align with the structured logging abstraction (`src/shared/logger.ts`). Tests should mock the `Logger` interface directly for more robust and maintainable tests.
  - **Expected Outcome**: All tests that currently mock `console` methods are refactored to mock the `Logger` interface. Tests will verify logging behavior through this abstraction, making them less coupled to console specifics.

- **[Dependencies] Update `@types/chrome` to Latest Stable Version**
  - **Type**: Dependencies
  - **Complexity**: Medium
  - **Rationale**: The current `@types/chrome` version (0.0.322) is significantly outdated for Manifest V3 development. Updating to the latest stable version provides accurate type definitions for V3 APIs, improving type safety and developer experience.
  - **Expected Outcome**: `@types/chrome` is updated to its latest stable release in `package.json`. Any resulting type errors in the codebase are resolved, ensuring full compatibility with modern Chrome extension APIs.

- **[Dependencies] Standardize on Correct Vitest Version**
  - **Type**: Dependencies
  - **Complexity**: Medium
  - **Rationale**: The listed Vitest version (3.1.3) in the original backlog appears incorrect as the current stable major version is 1.x. Using an incorrect or non-existent version can lead to unexpected testing behavior or prevent project setup.
  - **Expected Outcome**: The project's `package.json` is updated to use a correct, documented, and stable version of Vitest (e.g., latest 1.x). The test suite runs correctly and reliably with this version.

### 🛠️ Developer Workflow & Experience

- **[Enhancement] Configure Quality Gates: Pre-commit Hooks**
  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Enforces code quality standards (linting, formatting, type-checking) automatically *before* code is committed. This prevents common errors, ensures consistency, reduces CI failures, and improves overall code health.
  - **Expected Outcome**: Pre-commit hooks (e.g., using Husky/Lefthook + lint-staged) are configured to run ESLint, Prettier, and `tsc --noEmit` on staged files. Commits are blocked if any of these checks fail.
  - **Dependencies**: Robust project structure and tooling (already completed).

- **[Enhancement] Implement Conventional Commits Enforcement**
  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Standardizes commit messages, enabling automated changelog generation, semantic versioning, and clearer project history. This is crucial for maintainable V3 development and efficient release management.
  - **Expected Outcome**: `commitlint` (or a similar tool) is configured with pre-commit hooks (via Husky/Lefthook) to enforce the Conventional Commits specification on all commit messages.
  - **Dependencies**: "Configure Quality Gates: Pre-commit Hooks".

- **[Enhancement] Configure Quality Gates: Basic CI Pipeline (GitHub Actions)**
  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Provides automated verification of code quality (linting, formatting, type checking, tests, build) on every push and pull request. This ensures standards are met before merging, acts as a crucial safety net, and supports the V3 architecture's stability.
  - **Expected Outcome**: A GitHub Actions workflow is configured to run on pushes/PRs to main branches. The workflow executes linting, formatting checks, type checking (`tsc --noEmit`), unit and integration tests, and a production build. The build must pass for PRs to be considered mergeable.
  - **Dependencies**: Robust project structure and tooling (already completed).

## Medium Priority

### ✨ User Experience & Core Features

- **[Feature] Implement Basic User Options Page**
  - **Type**: Feature
  - **Complexity**: Medium
  - **Rationale**: Provides users with essential control over the extension's behavior, such as enabling/disabling the extension globally or choosing preferred display formats for Bitcoin prices (e.g., BTC, sats). This enhances user satisfaction and utility, leveraging V3's options page capabilities.
  - **Expected Outcome**: A simple HTML options page is created, accessible via the extension's entry in `chrome://extensions`. Options are stored using `chrome.storage.sync` or `chrome.storage.local` and directly affect extension behavior. The `manifest.json` is updated to declare the options page.

- **[Enhancement] Integrate Advanced Currency Handling Library (e.g., money.js)**
  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: Parsing, calculating, and formatting currency values using manual methods or simple `parseFloat` can be error-prone, especially with various international formats or when preparing for multi-currency support. A dedicated library like `money.js` ensures accurate currency arithmetic and robust parsing/formatting.
  - **Expected Outcome**: A currency handling library (e.g., `money.js`, `decimal.js`) is integrated for all fiat value parsing, calculations (conversions), and formatting of the final Bitcoin price. This improves accuracy and lays the foundation for supporting multiple fiat currencies.
  - **Dependencies**: "Modernize Currency Entity Recognition with Libraries".

### 🔧 Code Health & Minor Improvements

- **[Refactor] Centralize Configuration Values using Named Constants**
  - **Type**: Refactor
  - **Complexity**: Medium
  - **Rationale**: Hardcoded "magic numbers" (e.g., `MAX_RETRY_ATTEMPTS`, `BASE_RETRY_DELAY_MS`, alarm delays, various timeouts) are scattered throughout the codebase, reducing readability, maintainability, and making adjustments difficult. Centralizing these in `src/common/constants.ts` improves clarity and ease of configuration.
  - **Expected Outcome**: All magic numbers and configurable constants are replaced with clearly named constants imported from `src/common/constants.ts`. The codebase becomes more self-documenting and easier to adjust.

- **[Enhancement] Use Structured DOM Manipulation for Price Annotations (Interim)**
  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: If full library-based DOM annotation is deferred, this interim step improves robustness. Direct text node modification (`src/content-script/dom.ts:138,147`) is less robust than creating proper DOM elements.
  - **Expected Outcome**: Modify the DOM annotation logic to wrap the converted price text in a new `<span>` element, potentially with a specific class for styling or identification, instead of direct string concatenation with existing text nodes.
  - **Note**: May be superseded by "Implement Safe DOM Annotation with Libraries".

- **[Enhancement] Improve Logger Error Handling for Non-Error Objects**
  - **Type**: Enhancement
  - **Complexity**: Medium
  - **Rationale**: The current structured logger (`src/shared/logger.ts`) converts non-Error objects passed to `logger.error()` to simple strings (e.g., `[object Object]`), losing valuable debugging information. Preserving the original structure or key details in the logged context improves debuggability.
  - **Expected Outcome**: The logger's error handling method is updated to better serialize non-Error objects when they are passed as the `error` argument, perhaps by placing them in the `context` field or using a more sophisticated serialization that retains their structure (e.g., `JSON.stringify` with safeguards).

### ⚙️ Operational Excellence & CI/CD Enhancements

- **[Enhancement] Externalize Key Runtime Configuration Values**
  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: While most config is build-time, certain values (like API endpoints if they were to change post-build, or feature flags if introduced) benefit from being more easily adjustable. Initially, this means ensuring all such values are cleanly defined in `constants.ts`.
  - **Expected Outcome**: Key configuration values like API URLs or major feature toggles are loaded from a centralized mechanism (primarily `constants.ts` for a client-side extension). This makes them easy to find and modify.
  - **Dependencies**: "Centralize Configuration Values using Named Constants".

- **[Enhancement] Augment CI Pipeline: Add Dependency Vulnerability Scanning**
  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Automatically checks for known security vulnerabilities in project dependencies during the CI process. This is crucial for maintaining security, especially with an extension handling web content and API calls.
  - **Expected Outcome**: The CI pipeline (GitHub Actions) includes a step (e.g., using `pnpm audit --audit-level=high` or a dedicated GitHub Action like Snyk/Dependabot scan) that fails the build if high or critical severity vulnerabilities are detected in dependencies.
  - **Dependencies**: "Configure Quality Gates: Basic CI Pipeline (GitHub Actions)".

- **[Enhancement] Implement Automated Dependency Updates (e.g., Dependabot)**
  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Keeps project dependencies up-to-date automatically, reducing security risks, technical debt, and ensuring ongoing compatibility with Manifest V3 and browser changes.
  - **Expected Outcome**: A bot like Dependabot or Renovate is configured for the repository. It automatically creates pull requests for dependency updates, which are then validated by the CI pipeline before merging.
  - **Dependencies**: Robust project structure and tooling (already completed).

- **[Enhancement] Augment CI Pipeline: Enforce Test Coverage Thresholds**
  - **Type**: Enhancement
  - **Complexity**: Simple
  - **Rationale**: Ensures that a minimum level of test coverage is maintained and that new code is adequately tested. This provides confidence in code quality and stability, especially after significant refactors like the V3 migration.
  - **Expected Outcome**: The CI pipeline calculates test coverage (e.g., using Vitest's coverage reporting) and fails the build if coverage drops below predefined thresholds (e.g., 80% for lines, functions, branches).
  - **Dependencies**: Comprehensive unit and integration tests (already in place).

### 🛠️ Tooling & Local Development Configuration

- **[Configuration] Configure Playwright E2E Tests to Run Headless by Default**
  - **Type**: Configuration
  - **Complexity**: Simple
  - **Rationale**: Running E2E tests with a visible browser (headful) by default is inefficient for CI environments and local automated runs. Headless execution is faster and the standard for automated testing.
  - **Expected Outcome**: Playwright configuration (`playwright.config.ts`) is updated to run tests in headless mode by default (e.g., `headless: true` or `headless: !!process.env.CI`). Headful mode can still be enabled locally for debugging via an environment variable or command-line flag.

- **[Configuration] Relax pnpm Version Pinning in `package.json`**
  - **Type**: Configuration
  - **Complexity**: Simple
  - **Rationale**: Pinning an exact version of `pnpm` in the `package.json` (`packageManager` field) can create unnecessary friction for developers using slightly different patch versions or for future updates. A version range is generally more flexible.
  - **Expected Outcome**: The `packageManager` field in `package.json` is updated to use a more flexible version range for `pnpm` (e.g., `pnpm@^10.0.0` or a relevant major version compatible with project tooling).

## Low Priority

### 📚 Documentation & Developer Onboarding

- **[Documentation] Enhance README with Comprehensive Development Guide and Architecture Overview**
  - **Type**: Documentation
  - **Complexity**: Medium
  - **Rationale**: A well-documented project improves onboarding for new developers and serves as a reference for existing team members. Clearly outlining the V3 architecture, setup, development workflow, and testing procedures is essential for long-term maintainability.
  - **Expected Outcome**: `README.md` is updated to include:
    - Detailed setup instructions (prerequisites, installation).
    - Common development tasks and scripts (build, test, lint, run).
    - An overview of the Manifest V3 architecture (service worker, content scripts, message passing).
    - Guidelines for contributing and coding standards.

- **[Documentation] Add TSDoc Comments to All Public APIs, Functions, and Types**
  - **Type**: Documentation
  - **Complexity**: Medium
  - **Rationale**: Improves code understanding, maintainability, and enables auto-generation of API documentation. Documenting the purpose, parameters, and return values of V3-compatible code is a best practice.
  - **Expected Outcome**: TSDoc blocks are added to all exported functions, classes, types, and interfaces throughout the `src` directory, clearly explaining their usage, parameters, and return values. Code becomes more self-documenting.
  - **Dependencies**: Complete TypeScript Conversion (already completed).

### 🧹 Code Cleanup & Styling Consistency

- **[Cleanup] Remove Redundant or Obvious Code Comments**
  - **Type**: Cleanup
  - **Complexity**: Simple
  - **Rationale**: Comments that merely restate what the code clearly does (e.g., comments in `constants.ts:7-35`, verbose regex comments if regexes are simplified/replaced) add noise and can become outdated. Good code should be largely self-documenting; comments should explain the "why," not the "what."
  - **Expected Outcome**: Redundant and overly descriptive comments are removed. Only comments providing essential context, explaining non-obvious decisions, or documenting "why" something is done a certain way remain.

- **[Style] Enforce Consistent `readonly` Usage in TypeScript Types**
  - **Type**: Style
  - **Complexity**: Simple
  - **Rationale**: Inconsistent use of the `readonly` modifier for TypeScript types makes the intended mutability of data structures unclear. Consistent application improves code clarity, predictability, and helps prevent unintended mutations.
  - **Expected Outcome**: The `readonly` keyword is applied consistently to all properties of data transfer objects (DTOs), message types, configuration objects, and other types representing immutable data structures throughout the codebase.

- **[Refactor] Promote Consistent Use of Module-Specific Loggers**
  - **Type**: Refactor
  - **Complexity**: Simple
  - **Rationale**: Using the default global logger instance (`logger` from `src/shared/logger.ts`) lacks module-specific context, making it harder to trace log origins during debugging. Consistently using `createLogger("module-name")` enhances log traceability.
  - **Expected Outcome**: All modules and significant files adopt module-specific loggers by calling `createLogger("your-module-name")`. This ensures log entries automatically include the `module` field, improving log filtering and analysis capabilities.

- **[Cleanup] Review and Refine Manifest `short_name` Usage**
  - **Type**: Cleanup
  - **Complexity**: Simple
  - **Rationale**: The `short_name` in `manifest.json` might be redundant if it's not significantly different from the full `name` or if Chrome automatically truncates the full name appropriately in contexts where `short_name` would be used.
  - **Expected Outcome**: Verify if the `short_name` is necessary and provides distinct value in the browser UI. Remove it if it's redundant or not used effectively. Justify its retention if kept.

### 🛡️ Security & Permissions Hardening

- **[Refactor] Review and Minimize Extension Permissions in Manifest**
  - **Type**: Refactor
  - **Complexity**: Simple
  - **Rationale**: Ensures the extension adheres to the principle of least privilege by only requesting permissions absolutely necessary for its functionality. This is particularly important under Manifest V3's more granular permissions model and for user trust.
  - **Expected Outcome**: Permissions listed in `manifest.json` (`permissions` and `host_permissions`) are audited. Any unnecessary permissions are removed. Justifications for all retained permissions are documented (e.g., in comments within `manifest.json` or in project documentation).

### 💡 Research & Future Exploration

- **[Research] Investigate Alternative Price Data Sources and Fallback Strategies**
  - **Type**: Research
  - **Complexity**: Simple
  - **Rationale**: Relying solely on CoinGecko introduces a single point of failure. Exploring alternative price APIs can improve resilience (e.g., by implementing a fallback mechanism) and potentially offer access to more currency pairs or different data types for future features.
  - **Expected Outcome**: A documented summary of 2-3 alternative price APIs, including their pros/cons, rate limits, data availability (coins, fiat currencies), ease of integration, and reliability. Outline a potential strategy for implementing API fallbacks.
  - **Dependencies**: Abstract External API Calls (already completed).

---

## Future Considerations

- **[Feature] Support Additional Fiat Currencies**: Extend detection and conversion logic to handle EUR, GBP, JPY, etc., requiring UI for preference selection in the options page and updates to API calls.
- **[Feature] User Configuration for Target Websites/Domains**: Allow users to enable/disable the extension on specific sites or define custom selectors, potentially leveraging V3's `declarativeNetRequest` for domain-level toggles or advanced content script matching.
- **[Feature] Advanced User Options**: More granular control over display (tooltips vs inline, custom formatting), refresh rates, visual styling of annotations, and default Bitcoin units (e.g., mBTC, bits).
- **[Enhancement] Advanced Observability & Error Reporting**: Integrate with external error reporting services (e.g., Sentry) and implement performance monitoring/metrics (e.g., tracking annotation speed, API latency).
- **[Enhancement] Implement Fully Automated Release Process**: Streamline versioning (semantic versioning), packaging, changelog generation, and potentially automated submission to the Chrome Web Store via CI/CD pipelines.
- **[Research] Explore Cross-Browser Compatibility**: Investigate porting the extension to Firefox (Manifest differences, `browser` namespace polyfill) and other browsers supporting WebExtensions.
- **[Research] Advanced Performance Optimization**: Profile and optimize DOM manipulation and service worker performance on extremely large, complex, or frequently updating dynamic pages.
- **[Research] Offline Support & Enhanced Caching**: Implement more sophisticated caching strategies for displaying last known prices when offline, potentially using a "stale-while-revalidate" approach with V3's improved caching capabilities.
- **[Enhancement] E2E Visual Regression Testing**: Integrate visual diffing tools (e.g., Percy, Applitools, or Playwright's built-in capabilities) into the E2E test suite to catch unintended UI changes or annotation regressions.