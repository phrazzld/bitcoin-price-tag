# Extension TODO

This file covers Chrome extension-specific tasks including Manifest V3 migration, error handling, and performance optimizations.

## Execution Order

1. ## Manifest V3 Migration
   - [x] Update manifest.json to version 3
   - [x] Replace browser_action with action
   - [x] Replace background scripts with service workers
   - [x] Update permissions to more specific host permissions

2. ## Testing
   - [x] Set up a testing framework (Vitest)
   - [x] Write unit tests for currency conversion functions
   - [x] Create integration tests for DOM manipulation
   - [x] Add browser compatibility tests

3. ## Error Handling
   - [x] Add proper error handling for API calls
   - [x] Create fallback mechanisms when API is unavailable

4. ## Performance
   - [x] Optimize DOM scanning algorithm
   - [x] Implement caching for bitcoin price
   - [x] Add debouncing for price updates

5. ## Module Architecture and Network Fixes
   - [x] Rename existing content script to indicate module usage
   - [x] Create new non-module content script loader
   - [x] Implement dynamic module script injection in loader
   - [x] Update manifest.json content_scripts entry
   - [x] Update manifest.json web_accessible_resources
   - [x] Verify module loading fix in test environment
   - [x] Enhance logging for network fetch errors
   - [x] Add diagnostic logging for fetch operations lifecycle
   - [x] Analyze diagnostic logs to identify fetch failure patterns
   - [x] Refactor fetch logic with robust error handling and retry mechanism
   - [x] Ensure proper error propagation from fetch logic
   - [x] Implement/Verify caching mechanism for API data
   - [x] Implement/Verify fallback logic using cached data
   - [x] Write unit/integration tests for refactored fetch utility
   - [x] Verify network fetch success in test environment
   - [x] Verify detailed error logging for simulated fetch failures
   - [x] Verify caching and fallback behavior during simulated failures
   - [x] Verify correct price conversion display on target pages
   - [x] Mark original task/issue as completed