# BACKLOG

## Critical Priority (Must Do First)

### 🛑 Migration & Immediate Requirements

- **[Refactor] Migrate Chrome Extension to Manifest V3**
  - **Complexity**: Medium
  - **Rationale**: URGENT - Required for continued compatibility and distribution on the Chrome Web Store. Google has set deadlines for Manifest V2 deprecation, making this time-sensitive.
  - **Expected Outcome**: `manifest.json` is updated to V3 schema, any background scripts are migrated to a Service Worker, and related API calls are updated. Extension functions correctly under V3.
  - **Dependencies**: Minimal TypeScript setup (can be done with a lightweight configuration first)
  - **Timeline Constraint**: Critical due to Chrome's deprecation timeline

### 🚨 Critical Test Infrastructure Issues (From Code Review)

- **[Bug] Update Tests and Mocks to Use CoinGecko API Instead of CoinDesk**
  - **Complexity**: Medium
  - **Rationale**: CRITICAL - Tests are using CoinDesk API structures while production uses CoinGecko. This creates a false sense of security and could lead to undetected bugs.
  - **Expected Outcome**: All tests, mocks, and related documentation use the correct CoinGecko API URL and response format.
  - **Affected Files**: 
    - `src/service-worker/api.test.ts`
    - `tests/mocks/fetch.ts`
    - `README.md` (line 160)
    - `verify-build.js` (line 69)
    - `MANIFEST_V3_APPROACHES.md`
  
- **[Bug] Fix Manifest Host Permissions Check in Build Script**
  - **Complexity**: Simple
  - **Rationale**: BLOCKER - Build verification script checks for CoinDesk but manifest uses CoinGecko, causing false negatives.
  - **Expected Outcome**: `verify-build.js` correctly validates CoinGecko host permissions.
  - **Fix**: Change line 69 in `verify-build.js` from `*://api.coindesk.com/*` to `*://api.coingecko.com/*`

- **[Enhancement] Minimal TypeScript Setup for V3 Migration**
  - **Complexity**: Simple
  - **Rationale**: Provides just enough TypeScript infrastructure to support the V3 migration efficiently without overinvesting in tooling that might need adjustment post-migration.
  - **Expected Outcome**: Basic `tsconfig.json`, TypeScript installed, minimal build script configured, enough to compile TS files for the V3 migration.
  - **Dependencies**: None
  - **Note**: This is a streamlined version of the full tooling setup that will follow

- **[Refactor] [GORDIAN] Implement Service Worker Architecture for State & API Management**
  - **Complexity**: Complex
  - **Rationale**: Directly tied to Manifest V3 migration as V3 requires service workers. Centralizes state (price data), API calls, and caching logic in the Service Worker, eliminating global state in content scripts.
  - **Expected Outcome**: Price fetching logic moves to the Service Worker. Content scripts request price data via message passing. Global variables are removed from content scripts.
  - **Dependencies**: Migrate Chrome Extension to Manifest V3
  - **Note**: This combines V3 migration with the Gordian approach to state management

## High Priority

### 🐛 Significant Issues from Code Review

- **[Refactor] Replace Fragile Content Script Initialization Delay**
  - **Complexity**: High
  - **Rationale**: Using a fixed 2500ms setTimeout is unreliable and can miss price annotations on dynamic/slow-loading pages.
  - **Expected Outcome**: Replace setTimeout with MutationObserver or more robust DOM change detection.
  - **Location**: `src/content-script/index.ts:30`

- **[Security] Enhance Type Guards for Chrome API Messages**
  - **Complexity**: High  
  - **Rationale**: Current type guards only perform shallow validation, risking runtime errors from malformed messages.
  - **Expected Outcome**: Deep validation of all message fields including nested objects.
  - **Affected**: `isPriceResponseMessage`, `isPriceRequestMessage`

- **[Refactor] Simplify Complex Price Pattern Regexes**
  - **Complexity**: High
  - **Rationale**: Current regex patterns are overly complex, duplicated, and brittle. Hard to maintain and extend.
  - **Expected Outcome**: Simplified, consolidated regex logic with comprehensive test coverage.
  - **Location**: `src/content-script/dom.ts:11-44`

- **[Refactor] Extract Amazon-Specific Logic to Separate Module**
  - **Complexity**: High
  - **Rationale**: Hardcoded Amazon selectors are brittle and clutter generic DOM parsing logic.
  - **Expected Outcome**: Isolated Amazon adapter with error handling that doesn't break generic annotations.
  - **Location**: `src/content-script/dom.ts:168-205`

- **[Refactor] Replace Magic Numbers with Named Constants**
  - **Complexity**: Medium
  - **Rationale**: Hardcoded values make code harder to understand and maintain.
  - **Expected Outcome**: All configuration values moved to `constants.ts`.
  - **Examples**: `MAX_RETRY_ATTEMPTS`, `BASE_RETRY_DELAY_MS`, alarm delays

- **[Bug] Fix Service Worker Memory Cache Versioning**
  - **Complexity**: High
  - **Rationale**: Memory cache doesn't validate version against `CACHE_VERSION`, potentially serving stale data.
  - **Expected Outcome**: Proper version checking in memory cache operations.
  - **Location**: `src/service-worker/cache.ts`

- **[Testing] Mock Logger Instead of Console in Tests**
  - **Complexity**: High
  - **Rationale**: Tests that mock console methods are too low-level and brittle.
  - **Expected Outcome**: Tests mock logger methods directly, not console output.

- **[Dependencies] Update @types/chrome to Latest Version**
  - **Complexity**: Medium
  - **Rationale**: Version 0.0.322 is significantly outdated for Manifest V3 development.
  - **Expected Outcome**: Update to latest stable version and fix any resulting type errors.

- **[Dependencies] Clarify/Fix Vitest Version**
  - **Complexity**: Medium
  - **Rationale**: Version 3.1.3 appears incorrect (current stable is 1.x).
  - **Expected Outcome**: Use correct, documented Vitest version.

### 🏗️ Project Foundations (Post-V3 Migration)

- **[Enhancement] Complete Robust Project Structure and Tooling**
  - **Complexity**: Medium
  - **Rationale**: Now that V3 migration is complete, establish a comprehensive development environment with full tooling configured to project needs.
  - **Expected Outcome**: Project fully configured with `pnpm`, complete `tsconfig.json` with strict settings, `.eslintrc.js` (with TS rules), `.prettierrc.js`, and comprehensive build/lint/format scripts.
  - **Dependencies**: Minimal TypeScript Setup, Manifest V3 Migration

- **[Enhancement] Configure Quality Gates: Pre-commit Hooks**
  - **Complexity**: Simple
  - **Rationale**: Enforces code quality standards automatically *before* code enters the repository, preventing errors and ensuring consistency.
  - **Expected Outcome**: Pre-commit hooks (e.g., using Husky/Lefthook + lint-staged) are configured to run ESLint, Prettier, and `tsc --noEmit` on staged files.
  - **Dependencies**: Complete Robust Project Structure and Tooling

- **[Enhancement] Configure Quality Gates: Basic CI Pipeline (GitHub Actions)**
  - **Complexity**: Medium
  - **Rationale**: Provides automated verification of code quality on pushes/PRs, ensuring standards are met before merging. Works alongside V3 architecture.
  - **Expected Outcome**: A GitHub Actions workflow is configured to run on pushes/PRs, executing linting, formatting checks, type checking, and build steps.
  - **Dependencies**: Complete Robust Project Structure and Tooling

- **[Refactor] Complete TypeScript Conversion with Strict Settings**
  - **Complexity**: Medium
  - **Rationale**: Builds on the minimal TypeScript setup to apply strong typing across the entire codebase, improving maintenance and enabling better tooling.
  - **Expected Outcome**: All JavaScript files (`.js`) are converted to TypeScript (`.ts`), code compiles successfully under strict `tsconfig.json` settings.
  - **Dependencies**: Complete Robust Project Structure and Tooling

### 🏛️ Core Architecture (Leveraging V3)

- **[Refactor] [GORDIAN] Extract Core Logic into Pure, Testable Functions**
  - **Complexity**: Medium
  - **Rationale**: Decouples business logic from side effects for better testability and maintenance. Takes advantage of the V3 service worker architecture.
  - **Expected Outcome**: Core logic related to identifying price strings, converting values, and formatting output exists as pure functions with clear inputs/outputs.
  - **Dependencies**: Manifest V3 Migration, Service Worker Architecture

- **[Refactor] Abstract External API Calls (CoinDesk) into a Dedicated Module**
  - **Complexity**: Simple
  - **Rationale**: Isolates external service interaction, making it easier to manage, test (by mocking), and swap providers. Integrates with V3 service worker.
  - **Expected Outcome**: A dedicated module with a clear interface responsible for calling the CoinDesk API, all `fetch` logic contained within.
  - **Dependencies**: Manifest V3 Migration, Service Worker Architecture

- **[Enhancement] [GORDIAN] Implement Currency Detection & DOM Replacement via Libraries**
  - **Complexity**: Complex
  - **Rationale**: Replaces custom regex/DOM walking with sophisticated libraries. Designed to work with the new V3 architecture from the start.
  - **Expected Outcome**: Microsoft Recognizers Text identifies currency entities, `mark.js` (or similar) handles DOM replacement safely.
  - **Dependencies**: Extract Core Logic into Pure Functions, Service Worker Architecture

### 🔬 Testing & Reliability

- **[Enhancement] Set Up Testing Framework and Basic Configuration**
  - **Complexity**: Simple
  - **Rationale**: Establishes infrastructure for automated testing that works with the V3 architecture, crucial for ensuring code correctness.
  - **Expected Outcome**: Testing framework (Vitest preferred or Jest) configured, basic test scripts added to `package.json`, CI integration.
  - **Dependencies**: Complete Robust Project Structure and Tooling

- **[Enhancement] Implement Initial Unit Tests for Core Pure Functions**
  - **Complexity**: Medium
  - **Rationale**: Verifies the correctness of the extracted core logic in isolation, providing a safety net for V3-related changes.
  - **Expected Outcome**: Unit tests for pure functions responsible for price conversion and formatting, covering various inputs and edge cases.
  - **Dependencies**: Set Up Testing Framework, Extract Core Logic into Pure Functions

- **[Enhancement] Implement Consistent Error Handling Strategy**
  - **Complexity**: Medium
  - **Rationale**: Ensures errors are handled gracefully and predictably within the new V3 architecture, improving reliability.
  - **Expected Outcome**: Key operations wrapped in appropriate error handling, consistent logging, and user feedback where applicable.
  - **Dependencies**: Service Worker Architecture, Abstract External API Calls

### 🚀 Development Workflow

- **[Enhancement] Implement Conventional Commits Enforcement**
  - **Complexity**: Simple
  - **Rationale**: Standardizes commit messages, enabling automated versioning and changelog generation to help track V3 migration changes.
  - **Expected Outcome**: `commitlint` (or similar) configured with pre-commit hooks to enforce Conventional Commits specification.
  - **Dependencies**: Configure Quality Gates: Pre-commit Hooks

## Medium Priority

### 🔧 Minor Improvements from Code Review

- **[Enhancement] Use Structured DOM Manipulation for Price Annotations**
  - **Complexity**: Medium
  - **Rationale**: Direct text node modification is less robust than creating proper DOM elements.
  - **Expected Outcome**: Create span elements for annotations instead of string concatenation.
  - **Location**: `src/content-script/dom.ts:138,147`

- **[Enhancement] Improve Logger Error Handling for Non-Error Types**
  - **Complexity**: Medium
  - **Rationale**: Converting non-Error objects to strings loses debugging information.
  - **Expected Outcome**: Preserve original values in context when logging non-Error objects.

- **[Configuration] Make Playwright Tests Run Headless by Default**
  - **Complexity**: Simple
  - **Rationale**: Running headful by default is inefficient for CI.
  - **Expected Outcome**: Set `headless: true` or `headless: !!process.env.CI`.

- **[Configuration] Relax pnpm Version Requirement**
  - **Complexity**: Simple
  - **Rationale**: Exact version pinning creates friction for developers.
  - **Expected Outcome**: Use version range like `pnpm@^10.10.0`.

### 🛠️ Library Integration & Enhancements

- **[Enhancement] Integrate `money.js` (or similar) for Currency Handling**
  - **Complexity**: Medium
  - **Rationale**: Leverages a dedicated library for parsing and handling currency formats, improving robustness of V3-compatible code.
  - **Expected Outcome**: `money.js` (or equivalent) integrated to parse fiat values, handle calculations, and format currency consistently.
  - **Dependencies**: Implement Currency Detection & DOM Replacement via Libraries

### ⚙️ Operational Excellence

- **[Enhancement] Implement Structured Logging**
  - **Complexity**: Medium
  - **Rationale**: Replaces inconsistent `console.log` calls with structured logs, especially important for monitoring service worker behavior in V3.
  - **Expected Outcome**: Lightweight logging library integrated, `console.log`/`error` calls replaced with structured logger calls including context.
  - **Dependencies**: Implement Consistent Error Handling

- **[Enhancement] Externalize Configuration (API Endpoint, Feature Flags)**
  - **Complexity**: Simple
  - **Rationale**: Removes hardcoded values from the codebase, facilitating easier configuration in V3's service worker architecture.
  - **Expected Outcome**: Configuration values like API URLs loaded from a centralized mechanism instead of being hardcoded inline.
  - **Dependencies**: Abstract External API Calls

- **[Enhancement] Enhance CI Pipeline: Add Dependency Vulnerability Scanning**
  - **Complexity**: Simple
  - **Rationale**: Checks for known security vulnerabilities in dependencies, important for maintaining security under V3.
  - **Expected Outcome**: CI pipeline includes a step that fails the build if high or critical severity vulnerabilities are detected.
  - **Dependencies**: Configure Quality Gates: Basic CI Pipeline

- **[Enhancement] Set Up Automated Dependency Updates**
  - **Complexity**: Simple
  - **Rationale**: Keeps dependencies up-to-date automatically, reducing security risks and technical debt while ensuring V3 compatibility.
  - **Expected Outcome**: Dependabot or Renovate bot configured to create PRs for dependency updates automatically.
  - **Dependencies**: Complete Robust Project Structure and Tooling

### 🧪 Testing & Reliability Enhancements

- **[Enhancement] Implement Integration Tests for Key Workflows**
  - **Complexity**: Medium
  - **Rationale**: Verifies the interaction between different parts of the system under the new V3 architecture.
  - **Expected Outcome**: Integration tests covering workflows like content script to service worker message passing and DOM updates.
  - **Dependencies**: Service Worker Architecture, Set Up Testing Framework

- **[Enhancement] Enhance CI Pipeline: Enforce Test Coverage Thresholds**
  - **Complexity**: Simple
  - **Rationale**: Ensures minimum level of test coverage is maintained, providing confidence in the refactored V3-compatible code.
  - **Expected Outcome**: CI pipeline calculates test coverage and fails if coverage drops below predefined thresholds.
  - **Dependencies**: Implement Initial Unit Tests, Implement Integration Tests

### ✨ User Experience Foundation

- **[Feature] Add Basic User Options Page**
  - **Complexity**: Medium
  - **Rationale**: Provides users with control over the extension's behavior, leveraging V3's improved options page integration.
  - **Expected Outcome**: Simple options page for enabling/disabling the extension and choosing display formats, using `chrome.storage`.
  - **Dependencies**: Manifest V3 Migration

## Low Priority

### 📝 Code Quality Improvements from Code Review

- **[Cleanup] Remove Excessive Comments**
  - **Complexity**: Simple
  - **Rationale**: Comments explaining obvious code add noise. Good code should be self-documenting.
  - **Expected Outcome**: Remove redundant comments, keep only those explaining "why".
  - **Examples**: `constants.ts:7-35`, regex comments in `dom.ts`

- **[Style] Apply readonly Consistently in TypeScript Types**
  - **Complexity**: Simple
  - **Rationale**: Inconsistent use of readonly makes mutability unclear.
  - **Expected Outcome**: Apply readonly consistently to all data-transfer objects.

- **[Refactor] Encourage Module-Specific Loggers**
  - **Complexity**: Simple
  - **Rationale**: Default logger lacks module context.
  - **Expected Outcome**: Use `createLogger("module-name")` everywhere.

- **[Cleanup] Review Manifest short_name Usage**
  - **Complexity**: Simple
  - **Rationale**: Generic short_name might be redundant.
  - **Expected Outcome**: Verify if needed, remove or make more distinct.

### 📚 Documentation & Developer Experience

- **[Documentation] Enhance README with Development Guide and Architecture Overview**
  - **Complexity**: Simple
  - **Rationale**: Improves onboarding for new developers, detailing the V3 architecture and development workflow.
  - **Expected Outcome**: Updated `README.md` with setup instructions, commands, and architecture overview reflecting V3 structure.
  - **Dependencies**: Manifest V3 Migration (best done after core architecture stabilizes)

- **[Documentation] Add TSDoc Comments to Public APIs/Functions/Types**
  - **Complexity**: Medium
  - **Rationale**: Improves code understanding by documenting the purpose, parameters, and return values of V3-compatible code.
  - **Expected Outcome**: TSDoc blocks added to exported functions, classes, types, and interfaces, explaining their usage.
  - **Dependencies**: Complete TypeScript Conversion

### 🔒 Security & Maintenance

- **[Refactor] Review and Refine Extension Permissions in Manifest**
  - **Complexity**: Simple
  - **Rationale**: Ensures the extension only requests minimum permissions necessary, important given V3's more granular permissions model.
  - **Expected Outcome**: Permissions in `manifest.json` reviewed and unnecessary ones removed, with justifications documented.
  - **Dependencies**: Manifest V3 Migration

### 🚀 Future Feature Preparation

- **[Research] Investigate Alternative Price Data Sources**
  - **Complexity**: Simple
  - **Rationale**: Explores options beyond CoinDesk to improve resilience and potentially access more currency pairs for the V3 extension.
  - **Expected Outcome**: Documented summary of alternative price APIs with their pros/cons, rate limits, and data availability.
  - **Dependencies**: Abstract External API Calls

---

## Future Considerations

- **[Feature] Support Additional Fiat Currencies**: Extend detection and conversion logic to handle EUR, GBP, JPY, etc., potentially requiring UI for preference selection.
- **[Feature] User Configuration for Target Websites/Domains**: Allow users to enable/disable the extension on specific sites, leveraging V3's declarativeNetRequest.
- **[Feature] Advanced User Options**: More granular control over display (tooltips vs inline), refresh rates, visual styling.
- **[Enhancement] Advanced Observability**: Integrate with error reporting services and implement performance monitoring/metrics.
- **[Enhancement] Implement Automated Release Process**: Streamline versioning, packaging, changelog generation, and store submission via CI/CD.
- **[Research] Explore Browser Compatibility**: Investigate Firefox support (Manifest differences, `browser` namespace).
- **[Research] Performance Optimization**: Profile and optimize DOM manipulation on complex/dynamic pages.
- **[Research] Offline Support**: Caching strategies for displaying last known prices when offline, using V3's improved caching capabilities.