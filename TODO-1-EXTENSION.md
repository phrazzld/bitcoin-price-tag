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
   - [ ] Implement caching for bitcoin price
   - [ ] Add debouncing for price updates