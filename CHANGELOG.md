# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

This file will be automatically updated by semantic-release based on commit messages.

## Key Features and Improvements

| Feature                   | Description                                            | Version |
| ------------------------- | ------------------------------------------------------ | ------- |
| Manifest V3 Support       | Complete migration to Chrome's Manifest V3 format      | 0.6.0   |
| Amazon Compatibility      | Fixed critical issues causing failures on Amazon sites | 0.6.0   |
| Robust Error Handling     | Comprehensive error handling with fallbacks            | 0.6.0   |
| Module Architecture       | Refactored to use modern module architecture           | 0.5.0   |
| Multi-layered Caching     | Improved caching for offline operation                 | 0.4.0   |
| DOM Scanning Optimization | Enhanced performance for price detection               | 0.4.0   |

## Version History

### [0.6.0] - 2025-05-06

Bitcoin Price Tag extension has been upgraded to Manifest V3 with significantly improved error handling, Amazon compatibility, and development infrastructure.

#### Features

- Implemented Manifest V3 migration with improved error handling
- Added safe callback wrapping utility for robust messaging
- Enhanced context detection for restricted environments
- Implemented early exit points in content script
- Configured post-commit hooks for automation
- Re-enabled ESLint in pre-commit hooks with limited scope

#### Bug Fixes

- Fixed critical issues causing extension failure on Amazon pages
- Hardened messaging bridge with availability checks and fallbacks
- Added robust type checks before invoking received callbacks
- Applied safe callback wrappers to all messaging bridge calls
- Refactored Amazon DOM processing for resilience

#### Documentation

- Enhanced README.md with comprehensive documentation
- Enhanced CONTRIBUTING.md with complete development guidelines
- Updated LICENSE with current year
- Consolidated all TODO files into a single TODO.md
- Updated README with code quality and Git hooks information

#### Infrastructure & CI

- Configured semantic versioning and release automation
- Set up GitHub Actions CI workflows
- Configured git hooks for quality enforcement
- Enforced pnpm as package manager
- Implemented file length enforcement
- Configured Prettier for consistent formatting

### [0.5.0] - 2025-04-15

#### Features

- Implemented module-based architecture
- Added dynamic module script injection
- Enhanced bridge messaging system

#### Bug Fixes

- Fixed CSP violations in content scripts
- Resolved iframe access issues
- Improved error detection and reporting

### [0.4.0] - 2025-03-01

#### Features

- Optimized DOM scanning algorithm
- Implemented multi-layered caching for Bitcoin price
- Added debouncing for price updates
- Improved price format detection

#### Bug Fixes

- Fixed memory leaks in DOM walker
- Resolved race conditions in price updates
- Improved error handling for API failures

### [0.3.0] - 2025-02-01

#### Features

- Added support for more currencies
- Enhanced price formatting options
- Implemented mutation observer for dynamic content

#### Bug Fixes

- Fixed issues with decimal formatting
- Resolved DOM mutation conflicts
- Improved initialization sequence

### [0.2.0] - 2025-01-15

#### Features

- Added support for satoshi unit display
- Implemented smart unit selection based on price
- Added caching of exchange rates

#### Bug Fixes

- Fixed issues with price detection
- Improved handling of currency symbols
- Resolved initialization errors

### [0.1.0] - 2025-01-01

#### Initial Release

- Basic price conversion functionality
- Support for USD to Bitcoin conversion
- Price detection and annotation
- Extension popup with basic settings
