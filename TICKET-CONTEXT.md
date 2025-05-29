# Plan Details

# Bitcoin Price Tag Remediation Plan – Sprint 1

## Executive Summary

The bitcoin-price-tag codebase has three BLOCKER-level architectural violations that fundamentally compromise its stated quality principles. This surgical remediation plan attacks these blockers first—integration tests that mock internal collaborators, systematic type safety erosion via `as any`, and debug logging in production—followed by high-impact quick wins. By restoring architectural integrity and enforcing automated quality gates, we prevent further technical debt accumulation while establishing sustainable development practices.

## Critical Context

All remediation work must align with `DEVELOPMENT_PHILOSOPHY.md`, which explicitly states: "Internal collaborators are NEVER to be mocked." This principle is currently violated in multiple integration tests, creating false confidence in system reliability.

## Strike List

| Seq | CR-ID | Title | Effort | Impact | Owner |
|-----|-------|-------|--------|---------|--------|
| 1 | CR-B2 | Eliminate `as any` Type Assertions | S | BLOCKER | TS Lead |
| 2 | CR-B3 | Remove Debug Logging from Production | XS | BLOCKER | All Devs |
| 3 | CR-H2 | Automate Unused Import Cleanup | XS | Quick Win | Tooling |
| 4 | CR-B1 | Fix Integration Test Architecture | M | BLOCKER | Test Lead |
| 5 | CR-H4 | Document Complex DOM Algorithms | S | High | Module Owners |
| 6 | CR-H3 | Standardize Error Handling | M | High | Arch Lead |
| 7 | CR-H1 | Refactor Large Test Files | L | High | Test Lead |
| 8 | CR-M1 | Implement Quality Gates & CI | M | Medium | DevOps |

## Detailed Remediation

### CR-B2: Eliminate `as any` Type Assertions [BLOCKER]
**Problem:** Widespread `as any` usage disables TypeScript's type system, hiding design flaws and runtime errors.

**Impact:** Compile-time safety lost, IDE features degraded, refactoring becomes dangerous.

**Solution:**
1. **Audit:** Global search for `as any`, `@ts-ignore`, `@ts-expect-error`
2. **Fix Application Code:** Define precise interfaces and types
3. **Fix Test Code:** Create typed test builders using `satisfies` operator
4. **Enhance Type Guards:** Strengthen `isPriceResponseMessage` and `isValidCache`
5. **Enforce:** Add ESLint rule `@typescript-eslint/no-explicit-any` set to `error`

**Done When:** Zero type suppressions remain; `npm run typecheck` passes strict mode

### CR-B3: Remove Debug Logging from Production [BLOCKER]
**Problem:** Debug statements execute in production, degrading performance and creating noise.

**Impact:** Operational blindness to real issues, potential sensitive data exposure.

**Solution:**
1. **Configure Logger:** Leverage existing `src/shared/logger.ts` with environment-based levels
2. **Set Production Default:** `LOG_LEVEL=INFO` in webpack.config.js production build
3. **Audit & Fix:** Review all `logger.debug` calls, promote critical ones to `info`
4. **Remove Console:** Eliminate all direct `console.log` statements

**Done When:** Production builds emit only INFO/WARN/ERROR levels

### CR-H2: Automate Unused Import Cleanup [QUICK WIN]
**Problem:** Dead imports clutter codebase and slow builds.

**Solution:**
1. **Configure ESLint:** Enable `no-unused-vars` and `import/no-unused-modules`
2. **Pre-commit Hook:** Install Husky + lint-staged to run `eslint --fix` on staged files
3. **Initial Sweep:** One-time cleanup of existing unused imports

**Done When:** Pre-commit hook active; zero unused imports detected

### CR-B1: Fix Integration Test Architecture [BLOCKER]
**Problem:** Integration tests mock internal modules, violating core philosophy.

**Critical Files:**
- `tests/integration/dom-observer-annotation.test.ts` (mocks `findAndAnnotatePrices`)
- `tests/integration/content-script-initialization.test.ts` (mocks `requestPriceData`)

**Solution:**
1. **Remove Internal Mocks:** Delete all vi.mock() calls for internal modules
2. **Use Real Collaborators:** Pass actual implementations to test subjects
3. **Mock Only Boundaries:** Keep ChromeRuntimeHarness for external Chrome APIs
4. **Assert Real Behavior:** Verify actual DOM changes and message flows

**Done When:** Integration tests validate real system interactions; no internal mocks remain

### CR-H4: Document Complex DOM Algorithms
**Problem:** DOM observation and debouncing logic lacks documentation.

**Solution:**
1. **Add TSDoc:** Document all exported functions in `dom-observer.ts` and `dom.ts`
2. **Explain Why:** Focus on rationale for debouncing strategy, mutation filtering
3. **Clarify Edge Cases:** Document handling of dynamic content, infinite loops

**Done When:** Complex algorithms have clear inline documentation

### CR-H3: Standardize Error Handling
**Problem:** Inconsistent error patterns across modules.

**Solution:**
1. **Define Strategy:** Document error handling patterns in `ERROR_HANDLING.md`
2. **Create Error Classes:** Implement typed error hierarchy if needed
3. **Audit Async Code:** Ensure all promises have proper catch handlers
4. **Standardize Returns:** Consistent error shapes for API responses

**Done When:** Error handling follows documented patterns consistently

### CR-H1: Refactor Large Test Files
**Problem:** Test files >600 lines violate maintainability.

**Priority Files:**
- `src/content-script/dom-observer.test.ts` (~600 lines)
- `src/service-worker/api.test.ts` (~600 lines)

**Solution:**
1. **Split by Feature:** Break into focused test suites <150 lines each
2. **Isolate State:** Implement beforeEach/afterEach for proper cleanup
3. **Extract Helpers:** Move test utilities to shared files

**Done When:** All test files <150 lines with proper isolation

### CR-M1: Implement Quality Gates & CI
**Problem:** No automated enforcement of quality standards.

**Solution:**
1. **Git Hooks:** Enforce conventional commits via commitlint
2. **CI Pipeline:** Block PRs that fail lint/typecheck/test
3. **Coverage Gates:** Require minimum coverage for new code
4. **Documentation:** Update contribution guidelines

**Done When:** Quality violations automatically block merges

## Success Metrics

- **Zero** `as any` assertions (excluding unavoidable external library edge cases)
- **Zero** debug logs in production output
- **Zero** internal module mocks in integration tests
- **100%** of test files under 150 lines
- **100%** automated enforcement via CI/CD

## Implementation Strategy

### Phase 1: Immediate Blockers (Days 1-3)
Execute CR-B2, CR-B3, and CR-H2 in parallel. These can be done independently and provide immediate value.

### Phase 2: Test Architecture (Days 4-6)
Focus on CR-B1 exclusively. This requires careful refactoring to maintain test coverage.

### Phase 3: Quality & Documentation (Days 7-10)
Complete CR-H4, CR-H3, CR-H1, and CR-M1. These build on the clean foundation from Phases 1-2.

## Key Insight

The codebase's most critical issue is not any single violation, but the **systematic abandonment of stated architectural principles**. By fixing integration test mocking first, we restore the feedback loop that prevents architectural decay. Combined with automated enforcement, this creates a self-healing system aligned with the development philosophy.

## Task Breakdown Requirements
- Create atomic, independent tasks
- Ensure proper dependency mapping
- Include verification steps
- Follow project task ID and formatting conventions
