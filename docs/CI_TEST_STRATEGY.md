# CI Test Strategy

## Problem Solved

The project's comprehensive test suite (500+ tests) was causing CI timeouts, preventing reliable continuous integration. This document outlines the **test stratification strategy** implemented to resolve CI performance issues while maintaining thorough test coverage.

## Solution: Test Stratification

We've implemented a three-tier test strategy that intelligently selects the appropriate test suite based on context:

### 🚀 Smoke Tests (1.1 seconds, 246 tests)
**Command:** `npm run test:ci:smoke`

- **Purpose:** Fast core functionality validation
- **When to use:** Pre-commit hooks, quick feedback, development workflow
- **Coverage:** Essential functionality only
  - Schema validation and security
  - Core service worker API
  - Basic content script functionality  
  - Critical error handling

### ⚖️ CI Tests (2.5 seconds, 469 tests)
**Command:** `npm run test:ci`

- **Purpose:** Balanced test suite for CI environments
- **When to use:** PR validation, CI pipelines, automated testing
- **Coverage:** Core functionality + essential integration tests
- **Excludes:** Heavy integration tests that cause timeouts

### 🔬 Full Tests (5+ minutes, 500+ tests)
**Command:** `npm run test:ci:full`

- **Purpose:** Comprehensive validation
- **When to use:** Local development, pre-release validation, thorough testing
- **Coverage:** All tests including heavy integration and E2E tests

## Smart Test Runner

The `scripts/smart-test.js` automatically selects the appropriate test suite:

```bash
# Manual selection
npm run test:smart -- --smoke    # Force smoke tests
npm run test:smart -- --ci       # Force CI tests  
npm run test:smart -- --full     # Force full tests

# Automatic selection
npm run test:smart               # Auto-detects based on context
```

**Auto-detection logic:**
- **CI environment + main branch:** Full tests
- **CI environment + PR:** CI tests
- **Pre-commit hooks:** Smoke tests
- **Local development:** CI tests (default)

## Configuration Files

### `vitest.smoke.config.ts`
- Minimal test suite for fast feedback
- Aggressive performance optimizations
- Fail-fast on first error
- No coverage collection

### `vitest.ci.config.ts`
- Balanced performance vs coverage
- Excludes heavy integration tests
- CI-optimized timeouts and parallelism
- Essential coverage reporting

### `vitest.config.ts` (Full)
- Original comprehensive configuration
- All tests including heavy integration
- Full coverage reporting

## Benefits

1. **Fast Feedback:** Smoke tests provide instant validation (1.1s vs 5+ minutes)
2. **CI Reliability:** No more timeout failures in CI
3. **Maintained Quality:** Full test coverage still available when needed
4. **Developer Experience:** Pre-commit hooks are fast and reliable
5. **Flexibility:** Easy to run appropriate test level for the context

## Usage Guidelines

### For Developers
- **Development workflow:** Use smoke tests for quick feedback
- **Before commits:** Automatic smoke tests via pre-commit hook
- **Before PRs:** Run CI tests manually if needed

### For CI/CD
- **PR validation:** Automatic CI tests
- **Main branch:** Automatic full tests
- **Deployments:** Full tests required

### For QA/Testing
- **Feature testing:** Full test suite
- **Regression testing:** CI tests minimum
- **Quick validation:** Smoke tests

## Troubleshooting

### If smoke tests fail:
```bash
npm run test:ci:smoke
# Fix core functionality issues first
```

### If CI tests fail:
```bash
npm run test:ci
# Address integration issues
```

### For comprehensive debugging:
```bash
npm run test:ci:full
# Full test suite with detailed output
```

## Migration Notes

- **Old:** `npm test` (ran all tests, caused timeouts)
- **New:** `npm run test:smart` (intelligent test selection)
- **CI:** Now uses `npm run test:ci` instead of `npm test`
- **Pre-commit:** Now uses smoke tests for fast feedback

This strategy ensures reliable CI while maintaining comprehensive test coverage when needed.