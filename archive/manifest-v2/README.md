# Legacy Manifest V2 Files

This directory contains archived files from the original Manifest V2 version of the Bitcoin Price Tag Chrome extension.

## Purpose

These files are kept for historical reference only and are not used in the current build process. The current extension has been migrated to Manifest V3 with files located in the `src/` directory.

## Contents

- `manifest.json` - Original Manifest V2 configuration file
- `content.js` - Original content script with price detection and annotation logic

## History

The Bitcoin Price Tag extension was originally built using Chrome Extension Manifest V2. In 2025, it was migrated to Manifest V3 to comply with Chrome's deprecation timeline for Manifest V2 extensions.

The current implementation:
- Uses TypeScript instead of plain JavaScript
- Employs a service worker architecture instead of background pages
- Uses modular code organization in the `src/` directory
- Implements improved error handling and logging

## Note on API Changes

The original extension used the CoinDesk API, but the current version uses the CoinGecko API for Bitcoin price data. Both legacy files have been updated to reference CoinGecko for consistency, though these files are not used in production.