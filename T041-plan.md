# T041 - Add TSDoc to exported functions, types, interfaces, and constants

## Task Details
- **Title**: Add TSDoc to exported functions, types, interfaces, and constants
- **Category**: Chore
- **Priority**: P2

## Analysis

### Current State
The codebase has many exported functions, types, interfaces, and constants without documentation. This makes it harder for developers to understand the purpose and usage of these exports.

### Files to Document
1. `src/common/types.ts` - All interfaces and types
2. `src/common/constants.ts` - All exported constants
3. `src/service-worker/api.ts` - Exported functions and errors
4. `src/service-worker/cache.ts` - Exported functions  
5. `src/content-script/messaging.ts` - Exported functions
6. `src/content-script/dom.ts` - Exported functions
7. `src/shared/logger.ts` - Exported class and functions

### TSDoc Standards
- Use `/** */` format for TSDoc comments
- Include `@param` for function parameters
- Include `@returns` for function return values
- Include `@throws` for potential errors
- Add clear descriptions explaining purpose and behavior

## Implementation Plan

1. **Document Types and Interfaces** (`src/common/types.ts`)
   - Add descriptions for each interface
   - Document individual properties where clarification is helpful

2. **Document Constants** (`src/common/constants.ts`)
   - Explain the purpose and usage of each constant
   - Include units or format information where applicable

3. **Document Service Worker Modules**
   - `api.ts`: Document API functions, error types, and error codes
   - `cache.ts`: Document cache functions and their behavior

4. **Document Content Script Modules**
   - `messaging.ts`: Document messaging functions and timeout behavior
   - `dom.ts`: Document DOM manipulation functions

5. **Document Shared Modules**
   - `logger.ts`: Document the Logger class and its methods

## Expected Outcome
- All exported items have clear TSDoc documentation
- Developers can understand the purpose and usage of each export
- IDE support improves with hover documentation
- Code is more maintainable and self-documenting