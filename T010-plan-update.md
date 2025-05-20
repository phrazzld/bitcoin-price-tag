# Updated Plan for T010: Address Test Failures After CoinGecko Migration

## Current Status

All test files have been updated to reference CoinGecko instead of CoinDesk, but two key test files are still failing:

1. **src/service-worker/index.test.ts**
2. **tests/integration/messaging-promise.test.ts**

## Issues and Solutions

### 1. src/service-worker/index.test.ts

**Issue**: The tests are failing because the service worker now uses structured logging (JSON format), but the test assertions are still expecting plain string logs.

**Solution**:

1. Update the test assertions to check for structured logs:
   - Create a helper function to verify log content without exact string matching
   - Check that logs contain the expected data rather than exact strings
   - Update assertions to parse the JSON logs and check for key properties

2. Fix the `handleMessage` test case that still expects a CoinDesk BPI response format:
   ```js
   // Line 305-309 - CoinDesk format that needs updating
   const apiResponse = {
     bpi: {
       USD: {
         rate_float: 46000
       }
     }
   };
   ```

### 2. tests/integration/messaging-promise.test.ts

**Issue**: The test is failing with a timeout, which could be due to:
- Timing issues in the asynchronous test setup
- Incorrect message handling in the mocked Chrome runtime

**Solution**:

1. Increase the timeout value from 1000ms to 5000ms to give more time for test completion
2. Fix potential race conditions in the mock message handling:
   - Ensure that the response promise resolves correctly
   - Verify that the message listeners are being called in the right order
   - Add additional debugging to identify where the timeout is occurring

## Implementation Steps

1. Update src/service-worker/index.test.ts:
   - Create helper functions to match JSON log structures
   - Update test assertions to parse and check log content
   - Fix all CoinDesk references and update to CoinGecko format

2. Fix tests/integration/messaging-promise.test.ts:
   - Increase timeout value
   - Fix async handling in the test
   - Ensure mock Chrome message routing works correctly

3. Run tests to verify fixes:
   - Run individual tests: 
     ```
     pnpm test src/service-worker/index.test.ts
     pnpm test tests/integration/messaging-promise.test.ts
     ```
   - Run full test suite: `pnpm test`

4. Update TODO.md to reflect progress and completion