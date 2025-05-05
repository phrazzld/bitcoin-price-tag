# Bitcoin Price Tag Coding Standards

This document outlines the coding standards for the Bitcoin Price Tag extension.

## Development Environment

### Package Manager

- pnpm is the required package manager for this project
- Use of npm or yarn is not supported
- Node.js v18+ is required

## File Organization

- Files should be focused and have a single responsibility
- Keep file size manageable:
  - Files should not exceed 500 lines of code (warning threshold)
  - Files must not exceed 1000 lines of code (error threshold)
  - Blank lines and comments are not counted toward these limits
- Exception: Some complex utility files (error-handling.js, dom-scanner.js, etc.) have special exemptions

## Code Style

### Formatting

- Single quotes for strings
- Semicolons are required
- 2-space indentation
- 100 character line length limit
- Trailing commas in multiline structures
- Prettier is used for automatic formatting

### Naming Conventions

- Use camelCase for variables, functions, and method names
- Use PascalCase for class names
- Use UPPER_CASE for constants

### Function Guidelines

- Functions should be concise and focused
- Limit function length to 50 lines (excluding blank lines and comments)
- Maximum of 4 parameters per function
- Complexity threshold set to 10 (McCabe Complexity)
- Maximum nesting depth of 3 levels

## Error Handling

- Always provide appropriate error handling
- Use the error handling utilities from error-handling.js
- Add context to errors to help with debugging
- Log errors appropriately based on severity

## Testing

- Unit tests should be written for all functionality
- Use descriptive test names
- Structure tests with proper describe/it blocks
- Each test should have clear expectations

## ESLint Rules

The project uses ESLint with strict rules. Run `pnpm lint` to check for issues.

### Key Rules

- No console statements except warn, error, debug, and info
- No var, use const and let
- Prefer const when variables are not reassigned
- No duplicate imports
- No unused variables (except those prefixed with _)
- No parameter reassignment
- No eval statements
- Proper file and function length limits

## Exceptions

Some complex files are exempted from certain rules due to their nature:

- error-handling.js
- dom-scanner.js
- callback-utils.js
- context-provider.js
- debounce.js

These files may exceed length limits or other thresholds as they contain core utilities that 
require more complex implementation.