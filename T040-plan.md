# T040 - Review and minimize permissions and content script matches in manifest

## Task Details
- **Title**: Review and minimize permissions and content script matches in manifest
- **Category**: Refactor
- **Priority**: P1

## Analysis

### Current State
1. **Permissions**: `["storage", "alarms"]`
   - `storage`: Used by service worker to cache price data
   - `alarms`: Used for periodic price refresh

2. **Host Permissions**: `["*://api.coindesk.com/*"]`
   - Used for fetching bitcoin price from CoinDesk API

3. **Content Script Matches**: `["*://*/*"]`
   - Currently matches ALL urls (extremely broad)

4. **Browser Action**: Old manifest v2 syntax, should be migrated to `action` for v3

### Issues to Address
1. Content script matching `*://*/*` is too broad - runs on every single website
2. `browser_action` is deprecated in manifest v3, should use `action`
3. Need to determine if we really need storage/alarms permissions at the extension level

### Proposed Changes
1. Narrow content script matches to specific domains where price annotation is most useful
2. Migrate `browser_action` to `action` for manifest v3 compatibility
3. Keep storage and alarms permissions as they are necessary for core functionality
4. Keep host_permissions as is - required for API access

## Implementation Plan

1. **Research Common Shopping/Financial Sites**
   - Identify high-priority websites where price annotation is most valuable
   - Start with major e-commerce and financial sites

2. **Update manifest.json**
   - Change `browser_action` to `action`
   - Narrow content script matches to specific domains
   - Keep necessary permissions

3. **Create fallback mechanism**
   - Consider adding ability to enable extension on additional sites via browser action

4. **Test Changes**
   - Verify extension still works on targeted sites
   - Ensure permissions are minimal but sufficient

## Expected Outcome
- More secure extension with minimal permissions
- Better performance (content script only runs where needed)
- Manifest v3 compliant action definition
- Clear documentation of permission requirements