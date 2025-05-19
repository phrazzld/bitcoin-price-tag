# Remaining CoinDesk References

This document lists the remaining CoinDesk references that were found during the project-wide search. These are primarily in test files and mock implementations that need to be updated as part of the larger migration effort.

## Test Files and Mocks

### Critical Test Infrastructure (Needs Immediate Updating)
- `tests/mocks/fetch.ts` - Uses `CoinDeskApiResponse` type and mocks CoinDesk API responses
- `src/service-worker/api.test.ts` - Imports `CoinDeskApiResponse` and uses CoinDesk URL
- `tests/integration/messaging.integration.test.ts` - Contains CoinDesk API URL
- `tests/integration/service-worker-persistence.test.ts` - Multiple CoinDesk references in test data
- `tests/integration/messaging-promise.test.ts` - Contains CoinDesk source reference
- `tests/utils/test-helpers.ts` - Uses CoinDesk source in test data
- `src/service-worker/index.test.ts` - Contains CoinDesk API URL
- `src/service-worker/cache.test.ts` - Uses CoinDesk source in test data

### Low Priority (Comments/Documentation)
- `src/service-worker/api.ts` - Contains a comment about switching from CoinDesk to CoinGecko (legitimate historical note)

### Legacy Files (Already Marked)
- `content.js` - Legacy Manifest V2 file (marked with comment)
- `manifest.json` - Legacy Manifest V2 file (marked with comment)

## Backlog and Planning Documents
These files legitimately reference CoinDesk as part of documenting the migration:
- `BACKLOG.md` - Documents the need to update tests from CoinDesk to CoinGecko
- `TODO.md` - Contains tasks for updating CoinDesk references
- `PLAN.md` - Describes the migration process
- `API_MIGRATION.md` - Documents the migration from CoinDesk to CoinGecko

## Summary
Most remaining references are in test files that need to be updated to use the CoinGecko API structure. This is tracked as a critical priority item in the backlog.