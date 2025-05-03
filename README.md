# Bitcoin Price Tag

Automatically annotate fiat prices online with their equivalents in bitcoin. Download the Chrome extension [here](https://chrome.google.com/webstore/detail/bitcoin-price-tag/phjlopbkegpphenpgimnlckfmjfanceh).

## Under the Hood

**Bitcoin Price Tag** uses the CoinDesk API to fetch the current price of bitcoin and uses that to convert fiat-denominated prices to bitcoin.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8

### Setup

```bash
# Install dependencies
pnpm install
```

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

## License

[MIT](https://opensource.org/licenses/MIT)
