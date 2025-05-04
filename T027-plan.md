# T027: Enhance Contextual Error Logging Across Key Modules

## Task Description
Implement structured, context-aware logging (following project standards) in modules modified by T020, T021, T023, T024, T025, T026. Logs should capture context (e.g., URL, detected context type), decision points (e.g., early exit triggered), and specific error details to facilitate debugging, especially on Amazon.

## Current State Analysis

The project already has a robust error-handling.js module with:
- Structured error categorization via ErrorTypes
- Severity levels via ErrorSeverity
- logError function for unified error logging
- logContextDetection for context-aware logging
- Callback safety utilities in callback-utils.js

Recent improvements in T020-T026 have added enhanced context detection and error handling, but there are opportunities to standardize the logging approach and ensure all modules use the same structured logging patterns.

## Implementation Plan

### 1. Standardize Contextual Logging Format

Create a consistent logging structure with the following information:
- Context type (which module, operation, feature)
- URL and page information (origin, pathname, Amazon detection)
- Extension environment info (browser, version, extension state)
- Detailed error categorization and trace information
- Decision points with rationale
- Correlation ID for cross-module tracing
- Performance metrics (timing, success status)

### 2. Enhance error-handling.js with Extended Context Support

Extend the existing error handling module with:
- Add a correlation ID generator and tracking
- Add page context enrichment function 
- Create structured log format helpers
- Add verbosity level settings
- Implement diagnostic mode toggle
- Add throttling for repetitive errors

### 3. Update DOM Scanner Error Reporting

Enhance dom-scanner.js with:
- Add structured context to all error logs
- Enhanced Amazon-specific context in error reports
- Node processing statistics in error reports
- Performance metrics when operations fail
- Error categorization standards

### 4. Update Content Script Context Awareness

Improve content-module.js and content-script.js with:
- Complete URL and page info in all logs
- Environment detection in error context
- Bridge state information for debugging
- Execution context decision reporting
- Consistent error structure across modules

### 5. Update Callback Wrapper Error Reporting

Enhance callback-utils.js with:
- Add correlation ID to callback traces
- Include callback source context
- Extended timing information
- Chrome API error detailed reporting
- Context propagation across callback chains

### 6. Update Cache Manager Error Context

Enhance cache-manager.js with:
- Cache state reporting in errors
- Cache timing and freshness metrics
- Consistent error structure
- Detailed offline mode reporting

### 7. Add Comprehensive Context Logging to Background Script

Update background.js with:
- Complete extension state in error logs
- API status information
- Request lifecycle tracking
- Performance metrics

### 8. Standardize Amazon-Specific Error Reporting

Implement standardized Amazon-specific error context:
- Detection of Amazon environment type
- Amazon page type classification
- Detailed Amazon DOM structure in reports
- Amazon iframe chain reporting
- Amazon-specific error codes

### 9. Create a Centralized Context Provider

Implement a new context-provider.js module to:
- Gather standardized context information
- Provide consistent context objects for logging
- Cache context that doesn't change frequently
- Add page-specific context enrichment
- Support correlation ID propagation

## Implementation Details

1. Create or enhance context-provider.js with standardized context gathering
2. Update error-handling.js to use the context provider
3. Modify all key modules to use the enhanced contextual logging
4. Ensure all early exits and decision points are properly logged
5. Standardize error categorization across all modules
6. Add correlation ID tracking throughout the module lifecycle
7. Ensure performance metrics are consistently captured

## Testing Plan

1. Verify logs contain required context information
2. Test on various Amazon pages to validate Amazon-specific context
3. Check for correlation ID consistency across module boundaries
4. Verify early exit logging captures sufficient context
5. Ensure error categorization is correct across different error types
6. Test with verbosity levels to ensure appropriate log detail
7. Check for consistent log format across all components