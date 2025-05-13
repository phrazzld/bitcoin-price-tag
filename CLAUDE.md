# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bitcoin Price Tag is a Chrome extension that automatically annotates fiat prices on web pages with their equivalent values in bitcoin. The extension uses the CoinDesk API to fetch the current price of bitcoin and converts detected USD prices to both BTC and satoshi units.

## Repository Structure

- `content.js`: Main script that performs price detection and conversion
- `manifest.json`: Chrome extension manifest file
- `images/`: Directory containing extension icons
- `styles.css`: CSS styles for the extension (currently empty)
- `docs/`: Documentation directory

## Development Guidelines

### Key Technologies

- Chrome Extension API (manifest v2)
- JavaScript for price detection and conversion
- CoinDesk API for BTC price data

### Development Notes

1. The extension uses regex patterns to detect USD prices in various formats on web pages
2. Special handling exists for Amazon-specific price elements
3. Price conversion offers multiple formats:
   - BTC for larger amounts
   - Satoshis for smaller amounts
   - "Friendly" format with appropriate units (sats, k sats, M sats, BTC, etc.)

## Future Development (from BACKLOG.md)

- Migrate to manifest v3
- Implement Microsoft Recognizers Text library for better price detection
- Implement money.js for currency conversion
- Use mark.js or findandreplacedomtext for DOM manipulation
- Configure quality gates in git hooks
- Set up GitHub Actions CI
- Add effective tests

## Documentation

Refer to the `docs/` directory for technical documentation, including:
- Coding standards
- Git hooks configuration
- Project overview

## Development Requirements

According to the documentation:
- Node.js version 18 or higher is required
- Project should use pnpm as the package manager
- Conventional Commits format should be used for commit messages