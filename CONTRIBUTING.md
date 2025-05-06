# Contributing to Bitcoin Price Tag

Thank you for considering contributing to Bitcoin Price Tag! This document outlines the guidelines for contributing to the project.

## Table of Contents

1. [Development Workflow](#development-workflow)
2. [Commit Message Format](#commit-message-format)
3. [Branch and Pull Request Conventions](#branch-and-pull-request-conventions)
4. [Code Style and Testing Requirements](#code-style-and-testing-requirements)
5. [Pull Request Process](#pull-request-process)
6. [Versioning](#versioning)
7. [Troubleshooting](#troubleshooting)

## Development Workflow

### Setting Up the Development Environment

1. Ensure you have the required prerequisites:

   - Node.js >= 18
   - pnpm >= 8 (npm and yarn are not supported)

2. Clone the repository:

   ```bash
   git clone https://github.com/username/bitcoin-price-tag.git
   cd bitcoin-price-tag
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Set up Git hooks (if not automatically installed):
   ```bash
   pnpm exec husky init
   ```

### Development Cycle

1. **Create or select an issue**

   - For new features or bug fixes, create an issue describing the change
   - For existing issues, assign yourself to the issue

2. **Create a feature branch**

   - Branch off from `master` (or `main`) branch
   - Follow the branch naming convention (see [Branch and PR Conventions](#branch-and-pull-request-conventions))

3. **Develop and test locally**

   - Make your changes
   - Write or update tests
   - Run tests with `pnpm test`
   - Run linting with `pnpm lint`
   - Format code with `pnpm format`

4. **Commit your changes**

   - Follow the [Commit Message Format](#commit-message-format)
   - Pre-commit hooks will automatically check for issues

5. **Push your branch and create a pull request**

   - Push to your feature branch
   - Create a PR against the `master` (or `main`) branch
   - Fill out the PR template thoroughly

6. **Code review process**

   - Address feedback from reviewers
   - Make necessary changes
   - Ensure CI checks pass

7. **Merge**
   - Once approved and all checks pass, the PR can be merged
   - The project maintainer will merge the PR

### Local Testing

1. **Unit and integration tests**

   ```bash
   # Run tests once
   pnpm test

   # Run tests in watch mode (during development)
   pnpm test:watch

   # Run tests with coverage report
   pnpm test:coverage
   ```

2. **Manual testing in browsers**

   - Load the extension in Chrome for development:
     1. Go to `chrome://extensions/`
     2. Enable "Developer mode"
     3. Click "Load unpacked" and select the project directory
   - Test on other browsers if applicable (Firefox, Edge)

3. **Running linters and formatters**

   ```bash
   # Check code with ESLint
   pnpm lint

   # Fix linting issues automatically (where possible)
   pnpm lint:fix

   # Format code with Prettier
   pnpm format
   ```

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages to ensure a consistent history and enable automatic versioning.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type

The type must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files

#### Scope

The scope is optional and should be the name of the module affected (e.g., `browser`, `pricing`, `ui`).

#### Subject

The subject should be a short description of the change:

- Use the imperative, present tense: "change" not "changed" nor "changes"
- Don't capitalize the first letter
- No period (.) at the end

#### Body

The body is optional and should include the motivation for the change and contrast it with previous behavior.

#### Footer

The footer is optional and should contain information about breaking changes. Breaking changes should start with `BREAKING CHANGE:` followed by a space or a newline.

### Examples

```
feat(pricing): add support for euro currency

fix(browser): resolve issue with price scanning on dynamic pages

docs: update README with new API instructions

refactor(dom): simplify price extraction logic

BREAKING CHANGE: removed deprecated browserAction API
```

## Branch and Pull Request Conventions

### Branch Naming Conventions

Branches should follow this naming pattern:

```
<type>/<description>
```

Where:

- `<type>` is one of:

  - `feature` - for new features
  - `bugfix` - for bug fixes
  - `hotfix` - for critical fixes to production
  - `release` - for release branches
  - `docs` - for documentation updates
  - `refactor` - for code refactoring
  - `chore` - for maintenance tasks

- `<description>` is a brief, hyphenated description of the change

Examples:

```
feature/add-euro-support
bugfix/fix-price-detection
docs/update-readme
refactor/simplify-dom-scanning
```

### Branch Strategy

1. **Main Branch**: `master` (or `main`) is the main development branch
2. **Feature Branches**: Create feature branches for all changes
3. **Release Branches**: When ready for release, create a `release/vX.Y.Z` branch

### Pull Request Guidelines

1. **PR Title Format**: Use the same format as commit messages

   - Example: `feat(pricing): add support for euro currency`

2. **PR Description**:

   - Fill out the PR template completely
   - Link to related issues using GitHub's keywords (e.g., "Fixes #123")
   - Include screenshots for UI changes
   - List testing procedures you followed

3. **PR Size Guidelines**:

   - PRs should be focused and not include unrelated changes
   - Large changes should be broken down into smaller, more manageable PRs
   - Aim for PRs that can be reviewed in 30 minutes or less

4. **PR Reviews**:

   - At least one approval is required before merging
   - Address all comments and feedback
   - Re-request review after addressing feedback

5. **Merge Strategy**:
   - PRs are merged using squash merge to keep the history clean
   - PR titles and descriptions should be well-written as they become the squashed commit message

## Code Style and Testing Requirements

### Code Style

All code must follow the standards defined in [docs/CODING-STANDARDS.md](docs/CODING-STANDARDS.md). Key points include:

1. **Formatting**:

   - 2-space indentation
   - Single quotes for strings
   - 100 character line length limit
   - Semicolons are required
   - Trailing commas in multiline structures

2. **Naming Conventions**:

   - Use camelCase for variables, functions, and method names
   - Use PascalCase for class names
   - Use UPPER_CASE for constants

3. **Function Guidelines**:

   - Functions should be concise and focused
   - Maximum 50 lines per function (excluding comments and blank lines)
   - Maximum 4 parameters per function
   - Maximum nesting depth of 3 levels

4. **File Organization**:
   - Files should have a single responsibility
   - Maximum 500 lines per file (warning)
   - Maximum 1000 lines per file (error)

### Testing Requirements

1. **Test Coverage**:

   - All new code must have tests
   - Aim for at least 80% coverage for new features
   - Bug fixes should include a test that would have caught the bug

2. **Test Structure**:

   - Use descriptive test names
   - Structure tests with proper describe/it blocks
   - Each test should have clear expectations
   - Tests should be isolated and not depend on each other

3. **Types of Tests**:

   - **Unit Tests**: Test individual functions and components
   - **Integration Tests**: Test interactions between modules
   - **Browser Tests**: Test functionality in actual browser environments

4. **Running Tests**:
   - `pnpm test`: Run all tests
   - `pnpm test:watch`: Run tests in watch mode during development
   - `pnpm test:coverage`: Generate coverage report

### Git Hooks

The project uses Git hooks to enforce quality standards. See [docs/GIT-HOOKS.md](docs/GIT-HOOKS.md) for details.

1. **Pre-commit Hook**:

   - Runs Prettier on staged files
   - Checks for sensitive data
   - Verifies image sizes

2. **Commit Message Hook**:

   - Validates commit message format

3. **Pre-push Hook**:
   - Runs tests
   - Validates branch naming

## Pull Request Process

1. Ensure all tests pass with `pnpm test`
2. Update documentation if needed
3. Follow the commit message format described above
4. Submit the pull request using the PR template
5. Respond to any feedback from code reviews
6. Once approved and CI passes, a maintainer will merge your PR

## Versioning

This project follows [Semantic Versioning](https://semver.org/). The version is automatically updated based on commit messages:

- `fix:` commits trigger PATCH version increments (e.g., 1.0.0 → 1.0.1)
- `feat:` commits trigger MINOR version increments (e.g., 1.0.0 → 1.1.0)
- Commits with `BREAKING CHANGE:` in the body trigger MAJOR version increments (e.g., 1.0.0 → 2.0.0)

When commits are pushed to the main branch, the version is automatically updated, a changelog is generated, and a GitHub release is created.

## Troubleshooting

### Common Issues

1. **Git Hook Failures**:

   - Ensure you have latest dependencies with `pnpm install`
   - Check the error message for specific issues
   - For pre-commit hook issues related to ESLint, note that ESLint is temporarily disabled in hooks (see .husky/pre-commit)

2. **Test Failures**:

   - Check browser console for errors during browser tests
   - Ensure you're testing in the correct browser version
   - Review test logs for specific failure reasons

3. **Build Issues**:
   - Clear node_modules and reinstall with `rm -rf node_modules && pnpm install`
   - Check Node.js version with `node -v` (should be ≥18)

### Getting Help

If you encounter issues not covered here:

1. Check the project issues on GitHub to see if it's a known problem
2. Ask for help in the project's discussion forums or chat
3. Create a new issue with detailed information about your problem
