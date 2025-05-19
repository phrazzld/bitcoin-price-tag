# Bitcoin Price Tag Extension - Testing Instructions

## Prerequisites
- Google Chrome browser (latest version recommended)
- Internet connection
- Built extension in `dist/` directory (run `pnpm build` if needed)

## Loading the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle in the top right
3. Click "Load unpacked" button
4. Navigate to this project's `dist/` directory and select it
5. The extension should now appear in your extensions list

## Testing Checklist

### 1. Initial Setup Verification
- [ ] Extension loads without errors
- [ ] Extension icon appears in Chrome toolbar
- [ ] Open the Service Worker console (click "Inspect views: service worker" in extension details)
- [ ] Verify initialization logs appear

### 2. Basic Functionality Test
- [ ] Navigate to any website with USD prices (e.g., Amazon, eBay, shopping sites)
- [ ] Wait ~3 seconds for content script to initialize
- [ ] USD prices should now show Bitcoin equivalents in parentheses
- [ ] Open browser console (F12) and check for "Bitcoin Price Tag" logs

### 3. Cache Testing
- [ ] Open a new tab and visit another page with prices
- [ ] Prices should be annotated immediately (using cached data)
- [ ] Check Service Worker console - should see "Price found in cache"

### 4. API and Alarm Testing
- [ ] Wait 1 minute after installation for first alarm
- [ ] Check Network tab in Service Worker DevTools for API call to api.coingecko.com
- [ ] Wait 15 minutes for periodic refresh alarm
- [ ] Verify new API call is made

### 5. Error Scenarios
- [ ] Disconnect from internet
- [ ] Try loading a page - should see error handling in console
- [ ] Reconnect and verify extension recovers

### 6. Storage Inspection
- [ ] In extension details, click "Inspect views: service worker"
- [ ] Go to Application tab → Storage → Local Storage
- [ ] Verify `btc_price_data` key exists with cached price data

## Common Issues and Solutions

### Extension doesn't load
- Check for errors in chrome://extensions/
- Verify all files in dist/ directory
- Try rebuilding with `pnpm build`

### Prices not annotating
- Check browser console for errors
- Verify content script is injecting (look for "Bitcoin Price Tag: Content script loaded")
- Wait full 3 seconds after page load

### API calls failing
- Check network connectivity
- Verify CoinGecko API is accessible
- Check for CORS errors in console

## Logging Issues
If you find bugs or issues during testing:
1. Document in TEST-RESULTS.md
2. Include:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Console errors (if any)
   - Chrome version and OS

## Debug Tips
- Keep Service Worker console open for background activity
- Use Network tab to monitor API calls
- Check Application → Storage for cache inspection
- Enable verbose logging in console settings