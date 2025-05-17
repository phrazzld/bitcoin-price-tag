# Service Worker Persistence Integration Tests

This directory contains integration tests that verify service worker state persistence across restarts for the Bitcoin Price Tag extension.

## Test Coverage

### Chrome Storage Persistence
- Verifies price data persists to chrome.storage.local
- Tests retrieval of persisted data after restart
- Validates handling of multiple storage entries

### Chrome Alarms Persistence
- Tests alarm creation on installation
- Verifies alarms persist across service worker restarts
- Validates alarm triggers work correctly after restart

### Service Worker Lifecycle
- Tests cache rehydration on startup
- Verifies message passing functionality after restart
- Validates proper lifecycle event handling

### Edge Cases
- Tests graceful handling of corrupted storage data
- Verifies behavior when alarms are missing
- Tests concurrent storage operations

## Key Features Tested

1. **State Persistence**: Ensures all data stored in chrome.storage.local survives service worker restarts
2. **Alarm Functionality**: Validates that Chrome alarms persist and continue to function after restarts
3. **Message Passing**: Confirms extension messaging works correctly across restarts
4. **Error Handling**: Tests graceful degradation when encountering corrupted or missing data

## Implementation Notes

These tests mock Chrome Extension APIs to simulate:
- Service worker installation and startup events
- Chrome storage operations
- Alarm creation and triggering
- Message passing between components

The tests focus on integration scenarios rather than unit testing individual functions, providing confidence that the extension's persistence mechanisms work correctly in real-world conditions.