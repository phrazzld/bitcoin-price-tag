# T037 - Propagate and Log RequestId for All Messaging Events

## Objective
Ensure requestId is properly propagated and logged throughout the entire messaging flow between content script and service worker.

## Implementation Approach

1. **Review Current RequestId Usage**
   - Content script generates requestId in messaging.ts
   - Service worker receives and uses it in responses
   - Need to ensure it's included in all relevant logs

2. **Files to Update**
   - src/content-script/messaging.ts - already generates requestId
   - src/content-script/index.ts - ensure requestId is passed through
   - src/service-worker/index.ts - include requestId in all service worker logs

3. **Logging Requirements**
   - All message-related logs should include the requestId
   - Service worker should log with requestId when receiving/processing messages
   - Any error logs should include the associated requestId for tracing

4. **Key Areas to Verify**
   - Content script request initiation
   - Service worker message receipt
   - Cache operations
   - API calls
   - Response generation
   - Error handling

## Testing
- Trace a full request flow through logs using requestId
- Verify all log entries for a single request can be correlated
- Check error scenarios maintain requestId