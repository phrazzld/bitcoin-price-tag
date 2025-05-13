# BACKLOG

## Critical Priority (Must Do First)

### 🛑 Migration & Immediate Requirements

- **[Refactor] Migrate Chrome Extension to Manifest V3**
  - **Complexity**: Medium
  - **Rationale**: URGENT - Required for continued compatibility and distribution on the Chrome Web Store. Google has set deadlines for Manifest V2 deprecation, making this time-sensitive.
  - **Expected Outcome**: `manifest.json` is updated to V3 schema, any background scripts are migrated to a Service Worker, and related API calls are updated. Extension functions correctly under V3.
  - **Dependencies**: Minimal TypeScript setup (can be done with a lightweight configuration first)
  - **Timeline Constraint**: Critical due to Chrome's deprecation timeline

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