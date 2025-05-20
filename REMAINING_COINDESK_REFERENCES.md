# Remaining CoinDesk References

This document lists all the remaining CoinDesk references found during our project-wide search as of May 19, 2025. These references need to be updated as part of the CoinGecko API migration.

## Core Files 

1. **content.js** - This file contains two CoinDesk-specific references:
   - Line containing `// LEGACY: This used the CoinDesk API directly`
   - Line containing `fetch("https://api.coindesk.com/v1/bpi/currentprice/USD.json")`
   - This is the legacy content script that should no longer be in use

## Test Files

1. **src/service-worker/cache.test.ts** - Contains references to 'CoinDesk' as the source in test data

2. **src/service-worker/index.test.ts** - Contains:
   - The CoinDesk API URL `'https://api.coindesk.com/v1/bpi/currentprice/USD.json'`
   - References to the `bpi` field structure from the CoinDesk API

3. **tests/integration/messaging-promise.test.ts** - Contains:
   - Reference to 'CoinDesk' as the source in test data

4. **tests/integration/service-worker-persistence.test.ts** - Contains multiple CoinDesk references:
   - References to 'CoinDesk' as the source in test data
   - String `disclaimer: 'This data was produced from the CoinDesk Bitcoin Price Index'`
   - Assertion expecting URL to contain 'coindesk.com'
   - Multiple test data objects using CoinDesk format

5. **tests/utils/test-helpers.ts** - Contains:
   - References to 'CoinDesk' as the source in test helpers

## Documentation Files

The following files contain legitimate references to CoinDesk as part of documenting the migration:

1. **API_MIGRATION.md** - Documents the migration from CoinDesk to CoinGecko (references are appropriate)
2. **BACKLOG.md** - Documents the need to update tests from CoinDesk to CoinGecko (references are appropriate)
3. **TODO.md** - Contains tasks for updating CoinDesk references (references are appropriate)
4. **CLAUDE.md** - Contains references to CoinDesk that should be updated

## Next Steps

1. Update all test files to use CoinGecko API structure and URLs
2. Remove or update the legacy content.js file
3. Update documentation files (especially CLAUDE.md) to reflect the current API usage