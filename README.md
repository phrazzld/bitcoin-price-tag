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

## Features

- **Live Conversion**: Real-time price conversion using current BTC/fiat exchange rates
- **Multi-Currency Support**: Works with USD, EUR, GBP, and other major currencies
- **Automatic Detection**: Finds and converts prices on any webpage without configuration
- **High Performance**: Optimized DOM scanning with low resource usage
- **Offline Mode**: Continues working with cached exchange rates when offline
- **Non-Intrusive**: Adds Bitcoin prices next to original amounts without changing page layout

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

## Under the Hood

**Bitcoin Price Tag** uses the CoinDesk API to fetch the current price of bitcoin and uses that to convert fiat-denominated prices to bitcoin.

This is a fork of the original extension published [here](https://chrome.google.com/webstore/detail/bitcoin-price-tag/phjlopbkegpphenpgimnlckfmjfanceh).

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8

### Setup

```bash
# Install dependencies
pnpm install
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

### Testing

The project uses Vitest for testing.

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

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
