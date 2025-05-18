# T036 - Add Structured Logging to Content Script Modules

## Objective
Add structured logging to content script modules (index.ts and messaging.ts) using the existing logger utility.

## Implementation Approach

1. **Import Logger**: Import the shared logger utility in both content script modules
2. **Add Log Statements**: Add structured logging for key events as per the logging strategy
3. **Include Context Fields**: Ensure all required context fields are included (e.g., requestId for messaging)

## Log Events to Add

### content-script/index.ts
- Content script initialization
- Price request initiation
- Price data received
- DOM annotation completed
- Error handling scenarios

### content-script/messaging.ts
- Message request sent (with requestId)
- Response received (with requestId)
- Timeout occurred
- Error scenarios

## Structured Fields
- timestamp (handled by logger)
- level (INFO, ERROR, WARN)
- service_name: "content-script"
- function_name/module_name
- correlation_id/requestId (for messaging)
- Additional context (url, priceData, error details)

## Testing
- Verify logs appear in browser console
- Ensure all key events are logged
- Confirm requestId is properly propagated in messaging logs