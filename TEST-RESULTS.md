# Bitcoin Price Tag Extension - Test Results

## Testing Date: [Current Date]
## Build Version: 1.0.0 (Manifest V3)

## Test Environment
- Chrome Version: [To be filled by tester]
- OS: [To be filled by tester]
- Network: Connected to Internet

## Test Scenarios and Results

### 1. Extension Installation
**Expected:** Extension installs successfully, service worker initializes
**Test Steps:**
1. Open chrome://extensions/
2. Enable Developer mode
3. Click "Load unpacked" and select the dist/ directory
4. Check service worker console for initialization logs

**Expected Logs:**
- "Extension installed/updated: install"
- "Alarm "btc_price_refresh" created successfully"
- "Service worker starting up"
- "Cache successfully rehydrated"

**Result:** [To be filled by tester]
**Issues Found:** [To be filled by tester]

### 2. Initial Price Fetch
**Expected:** Price data is fetched after 1 minute (initial alarm delay)
**Test Steps:**
1. Wait 1 minute after installation
2. Monitor Network tab for API calls to api.coindesk.com
3. Check console logs for price fetch confirmation

**Expected Logs:**
- "Alarm fired: btc_price_refresh"
- "Starting price refresh..."
- "Price data fetched successfully: {data}"
- "Price data cached successfully"

**Result:** [To be filled by tester]
**Issues Found:** [To be filled by tester]

### 3. Content Script Injection
**Expected:** Content script loads on web pages and annotates prices
**Test Steps:**
1. Navigate to a page with USD prices (e.g., shopping site)
2. Wait 2.5 seconds (content script delay)
3. Check if prices are annotated with Bitcoin equivalents

**Expected Behavior:**
- Prices like "$100" should show "$100 (X sats)" or "$100 (X BTC)"
- Console should show:
  - "Bitcoin Price Tag: Content script loaded"
  - "Bitcoin Price Tag: Requesting price data..."
  - "Bitcoin Price Tag: Price data received"
  - "Bitcoin Price Tag: Price annotation completed"

**Result:** [To be filled by tester]
**Issues Found:** [To be filled by tester]

### 4. Cache Functionality
**Expected:** Price data is cached and reused for subsequent requests
**Test Steps:**
1. Open a new tab and navigate to a page with prices
2. Check if price annotation happens without new API call
3. Inspect chrome.storage.local for cached data

**Expected Behavior:**
- No new API call for 15 minutes (cache TTL)
- Console shows: "Price found in cache"
- chrome.storage.local contains "btc_price_data" key

**Result:** [To be filled by tester]
**Issues Found:** [To be filled by tester]

### 5. Periodic Refresh
**Expected:** Price refreshes every 15 minutes via alarm
**Test Steps:**
1. Wait 15 minutes
2. Monitor for alarm trigger and API call
3. Verify cache is updated

**Expected Behavior:**
- Alarm fires every 15 minutes
- New API call is made
- Cache is updated with fresh data

**Result:** [To be filled by tester]
**Issues Found:** [To be filled by tester]

### 6. Error Handling - Network Offline
**Expected:** Extension handles network errors gracefully
**Test Steps:**
1. Disconnect from network
2. Reload a page
3. Check console for error handling

**Expected Behavior:**
- Error logged: "Failed to refresh price data"
- Content script shows: "Request failed" or timeout error
- No crashes or unhandled exceptions

**Result:** [To be filled by tester]
**Issues Found:** [To be filled by tester]

### 7. Amazon Price Handling
**Expected:** Special Amazon price elements are handled correctly
**Test Steps:**
1. Navigate to Amazon product page
2. Check if prices are properly detected and annotated

**Expected Behavior:**
- Amazon's split price format is handled
- Price annotations appear correctly

**Result:** [To be filled by tester]
**Issues Found:** [To be filled by tester]

## Critical Issues Found
[To be documented after testing]

## Non-Critical Issues / Improvements
[To be documented after testing]

## Overall Assessment
[To be filled after all tests complete]