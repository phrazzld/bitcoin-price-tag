# T041 - Add TSDoc to exported functions, types, interfaces, and constants

## Task Classification: Complex

This task requires updating multiple files across the codebase to add comprehensive documentation using TSDoc format. Each module needs careful documentation of its exports.

## Implementation Strategy

Work through each file systematically, adding TSDoc comments to all exported items:

1. Types and interfaces - Document purpose and property meanings
2. Constants - Explain values and usage
3. Functions - Document parameters, return values, and behavior
4. Classes - Document class purpose, constructor, and methods

## File-by-File Implementation

### 1. src/common/types.ts
- Document all interfaces (PriceRequestMessage, PriceData, etc.)
- Explain the purpose of each type
- Document individual properties where helpful

### 2. src/common/constants.ts
- Document each constant's purpose
- Include units (e.g., milliseconds) 
- Explain usage context

### 3. src/service-worker/api.ts
- Document fetchBtcPrice function
- Document error types and codes
- Include @throws for error conditions

### 4. src/service-worker/cache.ts
- Document cache functions
- Explain TTL behavior
- Document return values and error handling

### 5. src/content-script/messaging.ts
- Document requestPriceData function
- Explain timeout behavior
- Document promise resolution/rejection

### 6. src/content-script/dom.ts
- Document DOM manipulation functions
- Explain price conversion behavior
- Document parameter expectations

### 7. src/shared/logger.ts
- Document Logger class
- Document constructor options
- Document all public methods

## TSDoc Format Guidelines

```typescript
/**
 * Brief description of the item
 * 
 * Longer description if needed, explaining behavior,
 * usage patterns, or important notes.
 * 
 * @param paramName - Description of the parameter
 * @param anotherParam - Description of another parameter
 * @returns Description of the return value
 * @throws {ErrorType} Description of when this error is thrown
 * 
 * @example
 * ```typescript
 * // Example usage
 * const result = functionName(param1, param2);
 * ```
 */
```

## Verification
- Check that all exports have documentation
- Verify IDE shows documentation on hover
- Ensure documentation is accurate and helpful