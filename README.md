# Bitcoin Price Tag

Chrome extension to automatically annotate fiat prices online with their equivalents in bitcoin.

<img width="269" alt="Screen Shot 2021-10-05 at 5 10 13 PM" src="https://user-images.githubusercontent.com/3598502/138306555-d368d939-02a6-4365-8036-22e7e305fcde.png">
<img width="635" alt="Screen Shot 2021-10-05 at 5 11 49 PM" src="https://user-images.githubusercontent.com/3598502/138306557-dee94fba-1982-44a6-b208-4c8cd0490f0b.png">

## Under the Hood

**Bitcoin Price Tag** uses the CoinDesk API to fetch the current price of bitcoin and uses that to convert fiat-denominated prices to bitcoin.

Fork of the original extension published [here](https://chrome.google.com/webstore/detail/bitcoin-price-tag/phjlopbkegpphenpgimnlckfmjfanceh).

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

## License

[MIT](https://opensource.org/licenses/MIT)
