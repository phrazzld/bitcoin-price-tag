# Contributing to Bitcoin Price Tag

Thank you for considering contributing to Bitcoin Price Tag! This document outlines the guidelines for contributing to the project.

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

## Pull Request Process

1. Ensure all tests pass with `pnpm test`
2. Update documentation if needed
3. Follow the commit message format described above
4. Submit the pull request

## Versioning

This project follows [Semantic Versioning](https://semver.org/). The version is automatically updated based on commit messages:

- `fix:` commits trigger PATCH version increments (e.g., 1.0.0 → 1.0.1)
- `feat:` commits trigger MINOR version increments (e.g., 1.0.0 → 1.1.0)
- Commits with `BREAKING CHANGE:` in the body trigger MAJOR version increments (e.g., 1.0.0 → 2.0.0)

When commits are pushed to the main branch, the version is automatically updated, a changelog is generated, and a GitHub release is created.
