# Bitcoin Price Tag

[![CI](https://github.com/username/bitcoin-price-tag/actions/workflows/ci.yml/badge.svg)](https://github.com/username/bitcoin-price-tag/actions/workflows/ci.yml)
[![Browser Tests](https://github.com/username/bitcoin-price-tag/actions/workflows/browser-tests.yml/badge.svg)](https://github.com/username/bitcoin-price-tag/actions/workflows/browser-tests.yml)
[![codecov](https://codecov.io/gh/username/bitcoin-price-tag/branch/master/graph/badge.svg)](https://codecov.io/gh/username/bitcoin-price-tag)

**Bitcoin Price Tag** is a browser extension that automatically converts fiat currency prices on websites to their Bitcoin equivalent. Instead of seeing prices in dollars, euros, or other government currencies, you'll instantly see how much that item costs in bitcoin (BTC).

This extension helps:
- Visualize the value of products in a hard, sound money
- Think in bitcoin terms rather than inflationary currencies
- Understand comparative pricing across sites without currency conversion
- Build bitcoin-native intuition as we transition to a Bitcoin standard

<img width="269" alt="Screen Shot 2021-10-05 at 5 10 13 PM" src="https://user-images.githubusercontent.com/3598502/138306555-d368d939-02a6-4365-8036-22e7e305fcde.png">
<img width="635" alt="Screen Shot 2021-10-05 at 5 11 49 PM" src="https://user-images.githubusercontent.com/3598502/138306557-dee94fba-1982-44a6-b208-4c8cd0490f0b.png">

## Table of Contents

- [Features](#features)
- [Technical Features](#technical-features)
- [Installation](#installation)
- [Usage](#usage)
- [Advanced Usage & Examples](#advanced-usage--examples)
- [Under the Hood](#under-the-hood)
- [Development](#development)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [CI/CD](#cicd)
- [Versioning](#versioning)
- [License](#license)

## Features

- **Live Conversion**: Real-time price conversion using current BTC/fiat exchange rates
- **Multi-Currency Support**: Works with USD, EUR, GBP, and other major currencies
- **Automatic Detection**: Finds and converts prices on any webpage without configuration
- **High Performance**: Optimized DOM scanning with low resource usage
- **Offline Mode**: Continues working with cached exchange rates when offline
- **Non-Intrusive**: Adds Bitcoin prices next to original amounts without changing page layout
- **Smart Unit Selection**: Automatically selects the most appropriate unit (sats or BTC) based on price magnitude
- **Broad Format Support**: Recognizes various price formats including 1.2k, 5M, $10.99, etc.

## Technical Features

### Advanced DOM Scanning

The extension uses a sophisticated DOM scanning algorithm that efficiently traverses the page's content to identify and convert prices:

- **Two-pass scanning**: First identifies candidate elements, then performs detailed parsing
- **Tree pruning**: Skips irrelevant DOM subtrees for better performance
- **Mutation observer**: Detects when new content is loaded dynamically
- **Pattern recognition**: Uses regex patterns to identify various price formats

### Multi-layered Caching System

The extension implements a sophisticated caching system to ensure data availability and minimize API calls:

- **In-memory cache**: Fastest access for the current browsing session
- **Chrome storage cache**: Persists between browser restarts
- **LocalStorage backup**: Fallback for non-Chrome browsers
- **Cache freshness levels**: 
  - Fresh (< 5 min): Use directly
  - Stale (5 min - 1 hour): Use but refresh in background
  - Very stale (1 hour - 24 hours): Use but refresh immediately
  - Expired (> 24 hours): Only use if offline

### Advanced Currency Detection

The extension can identify and convert various price formats:

- **Symbol-first format**: $100, €50, £25
- **Symbol-last format**: 100$, 50€, 25£
- **Abbreviations**: $1.2k, $5M, $10B
- **Words**: $1.2 thousand, $5 million, $10 billion
- **Multi-currency support**: USD, EUR, GBP and other major currencies

### Dynamic Unit Selection

The extension automatically selects the most appropriate unit for displaying Bitcoin prices:

- **Satoshis**: For smaller amounts (e.g., "$5.99 (15,975 sats)")
- **Kilosats**: For medium amounts (e.g., "$599 (1.59k sats)")
- **Bitcoin**: For larger amounts (e.g., "$59,999 (1.0 BTC)")
- **Smart rounding**: Ensures readable values while maintaining precision

## Installation

### Chrome Web Store (Recommended)

1. Visit the [Bitcoin Price Tag extension page](https://chrome.google.com/webstore/detail/bitcoin-price-tag/phjlopbkegpphenpgimnlckfmjfanceh) in Chrome Web Store
2. Click "Add to Chrome"
3. Confirm the installation when prompted

### Manual Installation (Development Version)

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked"
5. Select the repository folder you cloned

### Browser Compatibility

- Google Chrome (primary support)
- Microsoft Edge (Chromium-based versions)
- Opera (Chromium-based versions)
- Firefox (with some limitations)

## Usage

1. After installation, the extension automatically activates on all websites
2. Browse any site with prices (e-commerce, news, etc.)
3. Fiat prices will be annotated with their Bitcoin equivalent

No configuration is needed - the extension works out of the box. A small Bitcoin symbol (₿) appears next to each converted price.

### Troubleshooting

- If prices aren't being converted, try refreshing the page
- The extension requires internet access for the initial exchange rate fetch
- Some dynamically loaded content may require scrolling or interaction before conversion occurs

## Advanced Usage & Examples

### How Price Conversion Works

The extension processes prices on a webpage using a multi-step approach:

1. **DOM Scanning**: Traverses the page to find text nodes containing potential price patterns
2. **Pattern Matching**: Uses regular expressions to identify currency formats
3. **Value Extraction**: Extracts the numeric value and determines the multiplier
4. **Conversion**: Converts the fiat value to BTC or satoshis
5. **Display**: Adds the converted value beside the original price

Here's a simplified example of how the conversion process works:

```javascript
// 1. Find price patterns on the page
const priceRegex = buildPrecedingMatchPattern(); // e.g. $100, $5.5k
const matches = document.body.innerText.match(priceRegex);

// 2. Extract numeric value from a matched price string
const numericValue = extractNumericValue("$1,299.99"); // Returns 1299.99

// 3. Detect multiplier for abbreviated values
const multiplier = getMultiplier("$5k"); // Returns 1000 for 'k'

// 4. Calculate the actual value
const actualValue = numericValue * multiplier; // 5000 for "$5k"

// 5. Convert to bitcoin (assuming btcPrice = 60000)
const btcValue = valueInBtc(actualValue, 60000); // Returns "0.0833"

// 6. Or convert to satoshis
const satsValue = valueInSats(actualValue, 0.0006); // Returns "8,333,333"

// 7. Create the display string
const displayValue = makeSnippet("$5k", actualValue, 60000, 0.0006); // Returns "$5k (8,333k sats) "
```

### Example: Smart Unit Selection

The extension automatically selects the most appropriate unit based on the price magnitude:

```javascript
// For small amounts (e.g., coffee)
const coffeePrice = valueFriendly(4.99, 0.0004); // Returns "12,475 sats"

// For medium amounts (e.g., headphones)
const headphonesPrice = valueFriendly(349.99, 0.0004); // Returns "874.9k sats"

// For large amounts (e.g., laptop)
const laptopPrice = valueFriendly(1999.99, 0.0004); // Returns "0.0083 BTC"
```

### Example: Using the Cache System

The extension uses a multi-layered cache to ensure price data availability:

```javascript
// Check if cache needs refreshing
const cacheStatus = shouldRefreshCache(cachedData);
if (cacheStatus.shouldRefresh) {
  if (cacheStatus.immediately) {
    // Fetch new data immediately
    fetchBitcoinPrice().then(cachePriceData);
  } else {
    // Use cache but refresh in background
    setTimeout(() => fetchBitcoinPrice().then(cachePriceData), 1000);
  }
}

// Use cached data if offline
if (isOffline()) {
  const cachedPrice = await getCachedPriceData();
  if (cachedPrice) {
    // Use cached price even if expired when offline
    return cachedPrice;
  }
}
```

## Under the Hood

**Bitcoin Price Tag** uses the CoinDesk API to fetch the current price of bitcoin and uses that to convert fiat-denominated prices to bitcoin. Key components include:

- **conversion.js**: Handles all price conversion logic and unit selection
- **cache-manager.js**: Implements the multi-layered caching system
- **dom-scanner.js**: Efficiently scans the DOM for price patterns
- **content-module.js**: Orchestrates the entire conversion process
- **error-handling.js**: Provides robust error handling and logging

This is a fork of the original extension published [here](https://chrome.google.com/webstore/detail/bitcoin-price-tag/phjlopbkegpphenpgimnlckfmjfanceh).

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8

### Development Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/username/bitcoin-price-tag.git
   cd bitcoin-price-tag
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Load the extension in Chrome for development:
   ```bash
   # No build step required for development
   # 1. Open Chrome and navigate to chrome://extensions/
   # 2. Enable "Developer mode" in the top-right corner
   # 3. Click "Load unpacked" and select the project directory
   ```

4. Make changes to the code and reload the extension in Chrome to see changes:
   ```bash
   # In Chrome extensions page (chrome://extensions/)
   # Click the refresh icon on the extension card
   ```

### Project Structure

The extension is organized into the following key files and modules:

- **manifest.json**: Extension configuration (permissions, entry points)
- **background.js**: Background service worker for fetch operations and alarms
- **content-script.js**: Entry point that injects the module-based functionality
- **content-module.js**: Core functionality loaded as a module
- **conversion.js**: Currency conversion utilities
- **cache-manager.js**: Multi-layered caching system
- **dom-scanner.js**: DOM traversal and price detection
- **error-handling.js**: Robust error handling and reporting
- **browser-detect.js**: Browser detection for cross-browser compatibility

### Development Workflow

1. **Local Development**:
   ```bash
   # Make changes to code files
   # Reload extension in Chrome extensions page
   # Test in relevant web pages
   ```

2. **Building for Production**:
   ```bash
   # Verify tests pass
   pnpm test

   # Verify linting
   pnpm lint
   
   # Package extension (creates a zip file for store submission)
   # Note: Manual packaging is required - see browser store documentation for packaging requirements
   ```

3. **Cross-browser Testing**:
   ```bash
   # Run browser-specific tests
   pnpm test:browser:chrome
   pnpm test:browser:firefox
   pnpm test:browser:webkit
   ```

### Code Quality

The project uses ESLint, Prettier, and Git hooks to ensure code quality.

```bash
# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code with Prettier
pnpm format
```

See [Git Hooks documentation](docs/GIT-HOOKS.md) for details on the pre-commit, commit-msg, and pre-push hooks.

### Debugging Tips

1. **Extension Debugging**:
   - Use `console.debug()` statements in your code
   - Open Chrome DevTools for the extension by:
     - Right-click extension icon → Inspect popup
     - Or visit chrome://extensions, click "background page" for background script

2. **Content Script Debugging**:
   - Open DevTools on any page where the extension is running
   - Check the Console tab for logs
   - Examine the Elements tab to see how price conversions are injected

3. **Common Issues**:
   - Network requests failing: Check CORS and permissions
   - DOM scanning not working: Verify selectors and patterns
   - Cache issues: Check storage permissions and cache lifetime

### Testing

The project uses Vitest for unit tests and Playwright for browser testing.

```bash
# Run unit tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run browser tests
pnpm test:browser
```

## Contributing

We welcome contributions to Bitcoin Price Tag! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) file for detailed guidelines.

### Getting Started with Contributions

1. **Find an issue to work on**:
   - Check the [GitHub Issues](https://github.com/username/bitcoin-price-tag/issues) for open tasks
   - Look for issues tagged with "good first issue" or "help wanted"

2. **Set up your development environment**:
   - Follow the [Development Environment Setup](#development-environment-setup) guide

3. **Create a branch following our naming conventions**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/issue-you-are-fixing
   ```

4. **Make your changes and follow quality guidelines**:
   - Ensure all tests pass
   - Follow the code style guidelines
   - Add tests for new functionality
   - Update documentation as needed

5. **Submit a pull request**:
   - Fill out the PR template completely
   - Link to any related issues
   - Wait for review and address feedback

### Code Review Process

All contributions go through a code review process:

1. At least one core maintainer must approve changes
2. All automated checks must pass (tests, linting, etc.)
3. Documentation must be updated for significant changes
4. Breaking changes require additional scrutiny

For more details, see our [CONTRIBUTING.md](CONTRIBUTING.md).

### CI/CD

The project uses GitHub Actions for continuous integration. The CI pipeline includes:

- Code linting and formatting checks
- Unit tests with code coverage reporting
- Browser tests for Chrome, Firefox, and WebKit
- Automated dependency updates via Dependabot
- Semantic versioning and automatic releases

CI checks run automatically on pull requests and pushes to the main branch. See the [workflows directory](.github/workflows) for details on the CI setup.

### Versioning

This project follows [Semantic Versioning](https://semver.org/) with automatic versioning based on commit messages:

- `fix:` commits trigger PATCH version increments (e.g., 1.0.0 → 1.0.1)
- `feat:` commits trigger MINOR version increments (e.g., 1.0.0 → 1.1.0)
- Commits with `BREAKING CHANGE:` in the body trigger MAJOR version increments (e.g., 1.0.0 → 2.0.0)

When commits are pushed to the main branch, the version is automatically updated, a changelog is generated, and a GitHub release is created.

## License

[MIT](https://opensource.org/licenses/MIT)
