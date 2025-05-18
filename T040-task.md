# T040 - Review and minimize permissions and content script matches in manifest

## Task Classification: Simple

This is a straightforward configuration update task that involves modifying the manifest.json file to follow security best practices and manifest v3 standards.

## Implementation

### 1. Update browser_action to action (Manifest V3 compatibility)

The current manifest uses deprecated `browser_action` which should be migrated to `action` for manifest v3.

### 2. Narrow content script matches

Instead of matching all URLs (`*://*/*`), we should limit the content script to domains where price annotation is most useful:

**Priority domains for price annotation:**
- E-commerce: Amazon, eBay, Etsy, Walmart, Target, Best Buy
- Financial: Coinbase, Binance, Kraken, Yahoo Finance, Google Finance
- Marketplaces: Craigslist, Facebook Marketplace
- Tech retailers: Newegg, B&H Photo, Adorama
- General shopping: Shopping.google.com

**Pattern format:**
```json
"matches": [
  "*://*.amazon.com/*",
  "*://*.amazon.co.uk/*",
  "*://*.amazon.ca/*",
  "*://*.amazon.de/*",
  "*://*.amazon.fr/*",
  "*://*.amazon.es/*",
  "*://*.amazon.it/*",
  "*://*.ebay.com/*",
  "*://*.ebay.co.uk/*",
  "*://*.ebay.ca/*",
  "*://*.etsy.com/*",
  "*://*.walmart.com/*",
  "*://*.target.com/*",
  "*://*.bestbuy.com/*",
  "*://*.coinbase.com/*",
  "*://*.binance.com/*",
  "*://*.kraken.com/*",
  "*://*.finance.yahoo.com/*",
  "*://*.google.com/finance/*",
  "*://*.craigslist.org/*",
  "*://*.facebook.com/marketplace/*",
  "*://*.newegg.com/*",
  "*://*.bhphotovideo.com/*",
  "*://*.adorama.com/*",
  "*://shopping.google.com/*"
]
```

### 3. Permission Analysis

- `storage`: KEEP - Required for caching price data
- `alarms`: KEEP - Required for periodic price updates
- `host_permissions`: KEEP - Required for CoinDesk API access

These permissions are already minimal and necessary for core functionality.

## Files to Modify

1. `src/manifest.json` - Update browser_action to action and narrow content_scripts matches