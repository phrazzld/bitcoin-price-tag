# API Migration: CoinDesk to CoinGecko

## Summary

The Bitcoin Price Tag extension has been migrated from using the CoinDesk API to the CoinGecko API due to reliability issues with the CoinDesk API endpoint.

## Changes Made

### 1. API Endpoint Update
- **Old**: `https://api.coindesk.com/v1/bpi/currentprice/USD.json`
- **New**: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`

### 2. Response Format Changes

#### CoinDesk Response Format (Old)
```json
{
  "time": {
    "updated": "Dec 18, 2024 13:30:00 UTC",
    "updatedISO": "2024-12-18T13:30:00+00:00",
    "updateduk": "Dec 18, 2024 at 13:30 GMT"
  },
  "disclaimer": "...",
  "bpi": {
    "USD": {
      "code": "USD",
      "rate": "103,925.1234",
      "description": "United States Dollar",
      "rate_float": 103925.1234
    }
  }
}
```

#### CoinGecko Response Format (New)
```json
{
  "bitcoin": {
    "usd": 103925
  }
}
```

### 3. Code Updates

- Updated `src/common/types.ts` to include `CoinGeckoApiResponse` interface
- Modified `src/service-worker/api.ts`:
  - Changed API URL constant
  - Rewrote `validateApiResponse()` function for simpler format
  - Updated price extraction logic in `fetchBtcPrice()`
  - Changed source field from "CoinDesk" to "CoinGecko"

### 4. Error Handling Improvements

Fixed error logging in `api.ts` where Error objects were being passed in context instead of as the second parameter to `logger.error()`, which was causing `[object Object]` to appear in logs.

## Benefits of CoinGecko API

1. **Simpler Response Format**: Less validation needed
2. **Better Reliability**: CoinDesk API was experiencing DNS resolution issues
3. **No API Key Required**: Free tier works without authentication
4. **Better Documentation**: More comprehensive API documentation

## Test Results

The extension now successfully:
- Fetches Bitcoin prices from CoinGecko
- Validates the response correctly
- Displays price conversions on web pages
- Handles errors with proper logging

## Future Considerations

If needed, we can extend this to:
- Support multiple fiat currencies
- Add more detailed price information
- Implement rate limiting to respect API limits
- Add fallback to alternative APIs if CoinGecko is unavailable