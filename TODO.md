# Bitcoin Price Tag Extension Tasks

This file contains all tasks for the Bitcoin Price Tag extension project, organized by category.

## Current Tasks

### Infrastructure

- [x] **Fix Git Hooks** - Make Git hooks function without bypassing
  - [x] Fix pre-commit hook errors and stop using HUSKY=0 for bypassing hooks

- [ ] **Resolve Linting Issues** - Fix all linting errors in the codebase
  - [x] Fix linting errors in browser-detect.js
  - [x] Fix linting errors in content-module.js
  - [x] Fix linting errors in content-script.js
  - [x] Fix linting errors in content.js
  - [x] Fix linting errors in dom-scanner.js
  - [x] Fix linting errors in scripts/check-image-size.js
  - [x] Fix linting errors in scripts/check-sensitive-data.js
  - [x] Fix linting errors in background.js
  - [ ] Fix linting errors in other remaining files
    - [x] Fix linting errors in content-script-fixed.js
    - [ ] Fix linting errors in bootstrap-module.js
    - [ ] Fix linting errors in cache-manager.js
    - [ ] Fix linting errors in callback-utils.js
    - [ ] Fix linting errors in test files

- [ ] **Fix Test Suite** - Resolve failing tests and testing infrastructure
  - [x] Fix ECONNREFUSED errors in tests
  - [x] Fix JSDOM import in performance tests
  - [ ] Fix Playwright configuration issues
  - [ ] Fix undefined errors in cache integration tests
  - [ ] Fix lint warnings in all test files

### Documentation

- [x] **Release Documentation**
  - [x] Create a changelog
  - [x] Document version history
  - [x] Note major feature additions and fixes

## Completed Tasks

### Extension Development

- [x] **Manifest V3 Migration**

  - [x] Update manifest.json to version 3
  - [x] Replace browser_action with action
  - [x] Replace background scripts with service workers
  - [x] Update permissions to more specific host permissions

- [x] **Testing**

  - [x] Set up a testing framework (Vitest)
  - [x] Write unit tests for currency conversion functions
  - [x] Create integration tests for DOM manipulation
  - [x] Add browser compatibility tests

- [x] **Error Handling**

  - [x] Add proper error handling for API calls
  - [x] Create fallback mechanisms when API is unavailable

- [x] **Performance**

  - [x] Optimize DOM scanning algorithm
  - [x] Implement caching for bitcoin price
  - [x] Add debouncing for price updates

- [x] **Module Architecture and Network Fixes**
  - [x] Rename existing content script to indicate module usage
  - [x] Create new non-module content script loader
  - [x] Implement dynamic module script injection in loader
  - [x] Update manifest.json content_scripts entry
  - [x] Update manifest.json web_accessible_resources
  - [x] Verify module loading fix in test environment
  - [x] Enhance logging for network fetch errors
  - [x] Add diagnostic logging for fetch operations lifecycle
  - [x] Analyze diagnostic logs to identify fetch failure patterns
  - [x] Refactor fetch logic with robust error handling and retry mechanism
  - [x] Ensure proper error propagation from fetch logic
  - [x] Implement/Verify caching mechanism for API data
  - [x] Implement/Verify fallback logic using cached data
  - [x] Write unit/integration tests for refactored fetch utility
  - [x] Verify network fetch success in test environment
  - [x] Verify detailed error logging for simulated fetch failures
  - [x] Verify caching and fallback behavior during simulated failures
  - [x] Verify correct price conversion display on target pages
  - [x] Mark original task/issue as completed

### Infrastructure

- [x] **Quality Standards**

  - [x] Set up ESLint with strict rules
  - [x] Configure Prettier for consistent formatting
  - [x] Implement file length enforcement
    - [x] Configure warning at 500 lines
    - [x] Configure error at 1000 lines
  - [x] Enforce pnpm as package manager
    - [x] Add pnpm-lock.yaml
    - [x] Configure .npmrc
    - [x] Add engine rules to package.json

- [x] **Git Hooks**

  - [x] Configure pre-commit hooks
    - [x] Install pre-commit framework
    - [x] Configure linting and formatting checks
    - [x] Add type checking
    - [x] Prevent commit of sensitive data and large files
    - [x] Enforce conventional commit format
    - [x] Re-enable ESLint in pre-commit hooks (after fixing linting issues)
  - [x] Configure post-commit hooks
    - [x] Set up `glance ./` to run async
    - [x] Generate documentation updates if needed
  - [x] Configure pre-push hooks
    - [x] Run complete test suite
    - [x] Enforce branch naming conventions

- [x] **Conventional Commits**

  - [x] Set up conventional commits
    - [x] Add commitlint configuration
    - [x] Document commit message standards

- [x] **CI/CD**

  - [x] Set up GitHub Actions CI
    - [x] Create .github/workflows directory
    - [x] Create CI workflow for running on push and pull requests
    - [x] Configure tests to run in CI
    - [x] Configure linters and type checking
    - [x] Set up test coverage reporting
    - [x] Add badge to README.md

- [x] **Versioning**
  - [x] Configure semantic versioning
    - [x] Set up automated versioning based on commits
    - [x] Configure CHANGELOG generation

### Documentation

- [x] **Basic Documentation**

  - [x] Update MIT LICENSE file
    - [x] Update year and copyright holder
  - [x] Create basic README.md
    - [x] Project description and purpose
    - [x] Installation instructions
    - [x] Basic usage information

- [x] **Development Documentation**

  - [x] Create CONTRIBUTING.md
    - [x] Document development workflow
    - [x] Explain branch and PR conventions
    - [x] Add code style and testing requirements

- [x] **Comprehensive Documentation**
  - [x] Enhance README.md
    - [x] Add detailed features list
    - [x] Include usage examples with code
    - [x] Add development setup guide
    - [x] Expand contribution guidelines

### Bug Fixes

- [x] **TBUG_AMAZON_CRASH** - Fix critical issues causing extension to fail on Amazon pages
  - [x] T020: Enhance Context Detection for Restricted Environments
  - [x] T021: Implement Early Exit in Content Script Entry Points
  - [x] T022: Implement Safe Callback Wrapping Utility
  - [x] T023: Apply Safe Callback Wrapper to Messaging Bridge Calls
  - [x] T024: Add Robust Type Checks Before Invoking Received Callbacks
  - [x] T025: Harden Messaging Bridge Availability Checks and Fallbacks
  - [x] T026: Refactor Amazon DOM Processing for Resilience and Context Awareness
  - [x] T027: Enhance Contextual Error Logging Across Key Modules
  - [x] T028: Comprehensive Testing and Verification on Amazon Pages
  - [x] T029: Mark Original Bug Task as Complete
  - ✅ Extension now properly handles restricted contexts on Amazon
  - ✅ Full verification completed (see test/T028-test-report.md)

## Implementation Strategy

Tasks are prioritized as follows:

1. Critical bug fixes
2. Extension functionality
3. Infrastructure improvements
4. Documentation enhancements

When implementing tasks:

- Focus on completing one logical group at a time
- Create focused pull requests for easier review
- Ensure tests pass for all changes
- Update documentation as you go
