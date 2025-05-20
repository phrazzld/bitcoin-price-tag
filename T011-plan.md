# T011 Implementation Plan: Update legacy content.js file to use CoinGecko API

## Overview

The task is to update the legacy `content.js` file to use the CoinGecko API instead of the CoinDesk API. However, after analyzing the codebase, I've discovered that:

1. The `content.js` file is explicitly marked as legacy and not used in the current build
2. The first comment in the file states: "This file is kept for reference but is not used in the current build"
3. The current extension uses Manifest V3 with TypeScript modules in `src/content-script/`
4. The webpack configuration only includes the new TypeScript files
5. The new implementation already uses CoinGecko API via the service worker

## Implementation Approach

Given that the file is only kept for reference purposes, I have two options:

### Option 1: Update the file for consistency
Even though the file is not used in builds, update it to use the CoinGecko API for consistency and to avoid confusion for future developers:

1. Replace the CoinDesk API URL with the CoinGecko equivalent
2. Update the JSON parsing logic to work with CoinGecko's response format
3. Keep all comments indicating this is legacy code not used in current builds

### Option 2: Remove the file
Since the file is explicitly not used and could cause confusion, remove it and reference it in documentation if needed.

## Recommended Approach

After consideration, I recommend **Option 1**: Update the file for consistency. This ensures that:

1. All code in the repository is consistent in using CoinGecko
2. The file remains available for reference purposes
3. The reference code is still functionally correct if someone were to use it

## Implementation Steps

1. Update line 199 from:
   ```javascript
   fetch("https://api.coindesk.com/v1/bpi/currentprice/USD.json")
   ```
   to:
   ```javascript
   fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
   ```

2. Update the JSON parsing logic in lines 202-204 from:
   ```javascript
   btcPrice = parseFloat(data["bpi"]["USD"]["rate"].replace(",", ""));
   satPrice = btcPrice / 100000000;
   ```
   to:
   ```javascript
   btcPrice = data["bitcoin"]["usd"];
   satPrice = btcPrice / 100000000;
   ```

3. Update the comment on line 197 to reflect CoinGecko instead of CoinDesk

All other functionality of the file can remain unchanged since it only depends on the BTC and sat prices being correctly set.