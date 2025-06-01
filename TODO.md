# Bitcoin Price Tag TODO Synthesis

*Superior synthesis of 10 AI-generated TODO lists for Sprint 1 remediation*

## Priority Legend
- **P0**: BLOCKER - Must complete immediately, blocks other work
- **P1**: HIGH - Critical for architectural integrity 
- **P2**: MEDIUM - Important quality improvements
- **P3**: LOW - Nice-to-have enhancements

## Type Safety [BLOCKER]

- [x] **T001 · Audit · P0**: Comprehensive type suppression audit
    - **Context:** CR-B2: Eliminate `as any` Type Assertions
    - **Action:**
        1. Perform global search for `as any`, `@ts-ignore`, `@ts-expect-error`
        2. Document each occurrence with file path, line number, and usage context
        3. Categorize by application code vs test code
        4. Create prioritized remediation list
    - **Done-when:**
        1. Complete audit report exists with all suppressions documented
        2. Remediation plan approved by team
    - **Verification:**
        1. Audit list attached to PR or tracked in issue system
    - **Depends-on:** none

- [x] **T002 · Refactor · P0**: Replace type suppressions in application code
    - **Context:** CR-B2: Fix Application Code
    - **Action:**
        1. Define precise TypeScript interfaces for all suppressed types
        2. Replace `as any` with specific types or `unknown` where appropriate
        3. Remove `@ts-ignore` and `@ts-expect-error` comments
    - **Done-when:**
        1. Zero type suppressions in application code
        2. `npm run typecheck` passes in strict mode
    - **Verification:**
        1. Run `tsc --noEmit --strict` with zero errors
    - **Depends-on:** [T001]

- [x] **T003 · Refactor · P0**: Create typed test builders
    - **Context:** CR-B2: Fix Test Code
    - **Action:**
        1. Implement test data builders using `satisfies` operator
        2. Replace test mocks' `as any` with properly typed objects
        3. Extract reusable test type definitions
    - **Done-when:**
        1. All test code type-safe without suppressions
        2. Test builders provide full type inference
    - **Verification:**
        1. Tests pass with strict type checking enabled
    - **Depends-on:** [T001]

- [x] **T004 · Refactor · P0**: Strengthen critical type guards
    - **Context:** CR-B2: Enhance Type Guards
    - **Action:**
        1. Enhance `isPriceResponseMessage` with deep property validation
        2. Strengthen `isValidCache` to validate all cache properties
        3. Add unit tests covering edge cases and invalid inputs
    - **Done-when:**
        1. Type guards provide exhaustive runtime validation
        2. 100% branch coverage in type guard tests
    - **Verification:**
        1. Type guards reject malformed data at runtime
    - **Depends-on:** [T001]

- [x] **T005 · Chore · P0**: Enforce no-explicit-any ESLint rule
    - **Context:** CR-B2: Prevent Regression
    - **Action:**
        1. Add `@typescript-eslint/no-explicit-any: error` to `.eslintrc`
        2. Configure additional rules: `no-unsafe-assignment`, `no-unsafe-member-access`
        3. Set ZERO exceptions - Chrome APIs have proper types via @types/chrome
        4. Update CI to fail on violations
    - **Done-when:**
        1. ESLint blocks any `any` usage with zero exceptions
        2. CI pipeline enforces rule
    - **Verification:**
        1. `npm run lint` fails if `any` is introduced
    - **Depends-on:** [T002, T003, T004]

## Production Logging [BLOCKER]

- [x] **T006 · Config · P0**: Implement environment-based log levels
    - **Context:** CR-B3: Remove Debug Logging from Production
    - **Action:**
        1. Update `src/shared/logger.ts` to read `LOG_LEVEL` environment variable
        2. Default to `INFO` if not specified
        3. Support levels: DEBUG, INFO, WARN, ERROR
        4. Keep simple in-memory logging (no rotation/sampling needed for Chrome extension)
    - **Done-when:**
        1. Logger respects environment configuration
        2. Different environments show appropriate log levels
        3. No complex log retention logic implemented
    - **Verification:**
        1. Test logger output in dev (DEBUG) and prod (INFO) modes
    - **Depends-on:** none

- [x] **T007 · Config · P0**: Configure production build for INFO logging
    - **Context:** CR-B3: Production Configuration
    - **Action:**
        1. Update `webpack.config.js` production config
        2. Set `DefinePlugin` or `EnvironmentPlugin` with `LOG_LEVEL: 'INFO'`
        3. Document in build instructions
    - **Done-when:**
        1. Production builds default to INFO level
        2. No debug logs in production output
    - **Verification:**
        1. Build production bundle and verify log output
    - **Depends-on:** [T006]

- [x] **T008 · Refactor · P0**: Audit and fix debug log statements
    - **Context:** CR-B3: Clean Up Debug Logs
    - **Action:**
        1. Search for all `logger.debug` calls across codebase
        2. Promote critical operational info to `logger.info`
        3. Remove or guard non-essential debug statements
        4. Replace all `console.*` with appropriate logger calls
    - **Done-when:**
        1. Zero `console.log` statements remain
        2. Only essential logs execute in production
    - **Verification:**
        1. Production build shows no debug output
        2. Grep confirms no direct console usage
    - **Depends-on:** [T006, T007]

## Integration Test Architecture [BLOCKER]

- [x] **T009 · Test · P0**: Remove internal mocks from dom-observer integration test
    - **Context:** CR-B1: Fix `dom-observer-annotation.test.ts`
    - **Action:**
        1. Delete `vi.mock()` calls for `findAndAnnotatePrices`
        2. Import and use real implementation
        3. Update test setup to work with actual collaborators
    - **Done-when:**
        1. Test uses zero internal mocks
        2. Tests pass with real DOM mutations
    - **Verification:**
        1. Grep shows no internal module mocks in file
    - **Depends-on:** none

- [x] **T010 · Test · P0**: Remove internal mocks from content-script integration test
    - **Context:** CR-B1: Fix `content-script-initialization.test.ts`
    - **Action:**
        1. Delete `vi.mock()` calls for `requestPriceData`
        2. Use real message flow implementation
        3. Verify actual Chrome API interactions via harness
    - **Done-when:**
        1. Test uses real internal collaborators
        2. Message flows validated end-to-end
    - **Verification:**
        1. Test passes without internal mocks
    - **Depends-on:** none

- [x] **T011 · Test · P0**: Validate integration tests use only external mocks
    - **Context:** CR-B1: Ensure Proper Boundaries
    - **Action:**
        1. Audit all integration tests for mock usage
        2. Confirm only ChromeRuntimeHarness and external APIs mocked
        3. Document approved external mock boundaries
    - **Done-when:**
        1. Integration tests mock only true external dependencies
        2. Clear documentation of mock boundaries exists
    - **Verification:**
        1. Code review confirms proper test architecture
    - **Depends-on:** [T009, T010]

## Quick Wins [HIGH]

- [x] **T012 · Chore · P1**: Configure ESLint for unused imports
    - **Context:** CR-H2: Automate Unused Import Cleanup
    - **Action:**
        1. Enable `no-unused-vars` with `argsIgnorePattern: "^_"`
        2. Enable `import/no-unused-modules` rule
        3. Configure for auto-fix capability
    - **Done-when:**
        1. ESLint detects and can fix unused imports
    - **Verification:**
        1. Test with file containing unused import
    - **Depends-on:** none

- [x] **T013 · Chore · P1**: Install pre-commit hooks
    - **Context:** CR-H2: Enforce on Commit
    - **Action:**
        1. Install `husky` and `lint-staged` as dev dependencies
        2. Configure `.husky/pre-commit` to run staged file checks
        3. Set `lint-staged` to run `eslint --fix` on `*.{ts,tsx,js,jsx}`
    - **Done-when:**
        1. Pre-commit hook automatically fixes imports
        2. Commits blocked if unfixable issues exist
    - **Verification:**
        1. Stage file with unused import, verify auto-fix on commit
    - **Depends-on:** [T012]

- [x] **T014 · Chore · P1**: Initial unused import cleanup
    - **Context:** CR-H2: One-time Cleanup
    - **Action:**
        1. Run `eslint --fix` on entire codebase
        2. Manually review any unfixable issues
        3. Commit cleanup separately from other changes
    - **Done-when:**
        1. Zero unused imports in codebase
    - **Verification:**
        1. `npm run lint` reports no unused import issues
    - **Depends-on:** [T012, T013]

## Documentation [HIGH]

- [x] **T015 · Docs · P1**: Document DOM observer algorithms
    - **Context:** CR-H4: Document Complex DOM Algorithms
    - **Action:**
        1. Add TSDoc to all exports in `src/content-script/dom-observer.ts`
        2. Document debouncing strategy rationale (why 300ms?)
        3. Explain mutation filtering logic and performance considerations
        4. Document infinite loop prevention mechanisms
    - **Done-when:**
        1. All complex logic has explanatory comments
        2. IDE shows helpful documentation on hover
    - **Verification:**
        1. Peer review confirms clarity
    - **Depends-on:** none

- [x] **T016 · Docs · P1**: Document DOM manipulation functions
    - **Context:** CR-H4: Document Complex DOM Algorithms
    - **Action:**
        1. Add TSDoc to all exports in `src/content-script/dom.ts`
        2. Document edge cases for dynamic content handling
        3. Explain price detection regex patterns
        4. Document annotation strategy to avoid re-processing
    - **Done-when:**
        1. Functions self-document their behavior
        2. Edge cases clearly explained
    - **Verification:**
        1. New developer can understand logic without deep dive
    - **Depends-on:** none

## Error Handling [HIGH]

- [ ] **T017 · Docs · P1**: Create error handling strategy document
    - **Context:** CR-H3: Standardize Error Handling
    - **Action:**
        1. Create `docs/ERROR_HANDLING.md`
        2. Define patterns for sync/async error handling
        3. Document error propagation strategy
        4. Specify logging requirements for errors
        5. Define standard error response shapes
    - **Done-when:**
        1. Comprehensive error handling guide exists
        2. Team consensus on approach
    - **Verification:**
        1. Document reviewed and approved
    - **Depends-on:** none

- [ ] **T018 · Refactor · P1**: Implement typed error classes
    - **Context:** CR-H3: Type-safe Errors
    - **Action:**
        1. Create base error classes in `src/shared/errors/`
        2. Implement specific errors: `ApiError`, `ValidationError`, `ConfigError`
        3. Include error codes and structured metadata
    - **Done-when:**
        1. Typed error hierarchy implemented
        2. Errors carry actionable information
    - **Verification:**
        1. Error instances have proper types
    - **Depends-on:** [T017]

- [ ] **T019 · Refactor · P1**: Audit async error handling
    - **Context:** CR-H3: Prevent Unhandled Rejections
    - **Action:**
        1. Search for all `async/await` and Promise usage
        2. Ensure proper try/catch or .catch() handlers
        3. Add error boundaries where appropriate
        4. Standardize error logging format
    - **Done-when:**
        1. No unhandled promise rejections possible
        2. All errors logged consistently
    - **Verification:**
        1. Add unhandled rejection monitoring in tests
    - **Depends-on:** [T017, T018]

## Test Refactoring [HIGH]

- [ ] **T020 · Refactor · P1**: Split dom-observer test file
    - **Context:** CR-H1: Refactor Large Test Files
    - **Action:**
        1. Analyze `src/content-script/dom-observer.test.ts` (~600 lines)
        2. Split by feature into files <150 lines each
        3. Create: `observer-setup.test.ts`, `mutation-handling.test.ts`, `debouncing.test.ts`
        4. Extract shared utilities to `test-utils/dom-observer-helpers.ts`
    - **Done-when:**
        1. No test file exceeds 150 lines
        2. Clear separation of concerns
    - **Verification:**
        1. All tests pass after refactor
    - **Depends-on:** none

- [ ] **T021 · Refactor · P1**: Split service worker API test file
    - **Context:** CR-H1: Refactor Large Test Files
    - **Action:**
        1. Analyze `src/service-worker/api.test.ts` (~600 lines)
        2. Split into: `api-fetch.test.ts`, `api-cache.test.ts`, `api-error.test.ts`
        3. Extract mocks to `test-utils/api-mocks.ts`
    - **Done-when:**
        1. Focused test suites under 150 lines each
    - **Verification:**
        1. Test coverage maintained
    - **Depends-on:** none

- [ ] **T022 · Refactor · P1**: Implement test isolation patterns
    - **Context:** CR-H1: Prevent Test Pollution
    - **Action:**
        1. Add `beforeEach`/`afterEach` to all test suites
        2. Reset global state, timers, and mocks between tests
        3. Ensure tests can run in any order
    - **Done-when:**
        1. Tests have zero interdependencies
        2. Random test execution succeeds
    - **Verification:**
        1. Run tests with `--randomize` flag
    - **Depends-on:** [T020, T021]

## Quality Gates [MEDIUM]

- [ ] **T023 · Chore · P2**: Enforce conventional commits
    - **Context:** CR-M1: Implement Quality Gates
    - **Action:**
        1. Install `@commitlint/cli` and `@commitlint/config-conventional`
        2. Configure commitlint in `.commitlintrc`
        3. Add commit-msg hook via Husky
    - **Done-when:**
        1. Non-conventional commits blocked locally
    - **Verification:**
        1. Test with invalid commit message format
    - **Depends-on:** [T013]

- [ ] **T024 · Chore · P2**: Configure CI quality pipeline
    - **Context:** CR-M1: Automated Enforcement
    - **Action:**
        1. Update CI workflow (GitHub Actions/etc)
        2. Add stages: lint, typecheck, test, coverage
        3. Configure to block PR merge on any failure
        4. Add status badges to README
    - **Done-when:**
        1. PRs cannot merge with quality violations
    - **Verification:**
        1. Submit PR with failing check
    - **Depends-on:** [T005, T012, T023]

- [ ] **T025 · Chore · P2**: Implement coverage gates
    - **Context:** CR-M1: Maintain Test Coverage
    - **Action:**
        1. Configure coverage reporting (jest/vitest)
        2. Set aggressive thresholds: 90% statements, 85% branches, 90% functions for NEW code
        3. Set minimum thresholds: 80% statements, 75% branches for EXISTING code
        4. Block PRs that reduce overall coverage
    - **Done-when:**
        1. Dual coverage gates enforced in CI (new vs existing code)
        2. Coverage badges show current percentages
    - **Verification:**
        1. Submit PR with reduced coverage to verify blocking
    - **Depends-on:** [T024]

## Success Metrics

- ✅ Zero `as any` assertions (no exceptions - Chrome APIs properly typed)
- ✅ Zero debug logs in production builds
- ✅ Zero internal mocks in integration tests
- ✅ All test files under 150 lines
- ✅ 90%+ coverage for new code, 80%+ for existing code
- ✅ 100% automated quality enforcement
- ✅ Clear documentation for complex algorithms
- ✅ Standardized error handling across codebase
- ✅ Simple, performant logging without complex retention

## Implementation Notes

1. **Parallel Work**: Tasks T001, T006, T009, T010, T012, T015 can start immediately in parallel
2. **Critical Path**: T001→T002→T003→T004→T005 blocks full type safety
3. **Quick Wins**: T012→T013→T014 provides immediate value with minimal effort
4. **Test Work**: Can be done independently of other streams

This synthesis provides clearer action items, better dependency tracking, and more comprehensive verification steps than any individual TODO list, while eliminating redundancy and resolving priority conflicts.