# Project Setup TODO List

## Infrastructure

- [ ] Set up GitHub Actions CI
  - [ ] Create .github/workflows directory
  - [ ] Create CI workflow for running on push and pull requests
  - [ ] Configure tests to run in CI
  - [ ] Configure linters and type checking
  - [ ] Set up test coverage reporting
  - [ ] Add badge to README.md

## Git Hooks

- [ ] Configure pre-commit hooks
  - [ ] Install pre-commit framework
  - [ ] Configure linting and formatting checks
  - [ ] Add type checking
  - [ ] Prevent commit of sensitive data and large files
  - [ ] Enforce conventional commit format
- [ ] Configure post-commit hooks
  - [ ] Set up `glance ./` to run async
  - [ ] Generate documentation updates if needed
- [ ] Configure pre-push hooks
  - [ ] Run complete test suite
  - [ ] Enforce branch naming conventions

## Quality Standards

- [ ] Implement file length enforcement
  - [ ] Configure warning at 500 lines
  - [ ] Configure error at 1000 lines
- [ ] Set up conventional commits
  - [ ] Add commitlint configuration
  - [ ] Document commit message standards
- [ ] Configure semantic versioning
  - [ ] Set up automated versioning based on commits
  - [ ] Configure CHANGELOG generation

## Chrome Extension Specific

- [ ] Migrate to Manifest V3
  - [ ] Update manifest.json to version 3
  - [ ] Replace browser_action with action
  - [ ] Replace background scripts with service workers
  - [ ] Update permissions to more specific host permissions
- [ ] Improve error handling
  - [ ] Add proper error handling for API calls
  - [ ] Create fallback mechanisms when API is unavailable
- [ ] Enhance performance
  - [ ] Optimize DOM scanning algorithm
  - [ ] Implement caching for bitcoin price
  - [ ] Add debouncing for price updates

## Documentation

- [ ] Create comprehensive README.md
  - [ ] Project description and purpose
  - [ ] Features list
  - [ ] Installation instructions
  - [ ] Usage examples with code
  - [ ] Development setup guide
  - [ ] Contribution guidelines
- [ ] Add MIT LICENSE file
  - [ ] Update year and copyright holder
- [ ] Create CONTRIBUTING.md
  - [ ] Document development workflow
  - [ ] Explain branch and PR conventions
  - [ ] Add code style and testing requirements
