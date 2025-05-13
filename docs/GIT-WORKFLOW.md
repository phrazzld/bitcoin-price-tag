# Git Workflow

## Overview

This project previously used Husky and lint-staged for pre-commit and pre-push hooks, but those have been removed due to persistent issues with hook execution. This document outlines the current recommended workflow.

## Manual Quality Checks

Without automated pre-commit checks, developers are responsible for running quality checks manually before committing:

```bash
# Format code
pnpm format

# Run linting with auto-fix
pnpm lint:fix

# Run tests before pushing
pnpm test
```

## Commit Guidelines

We still follow conventional commit format for all commits:

```
<type>(<scope>): <subject>
```

Where `type` is one of:
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

For example:
```
fix(api): handle edge case in price conversion
```

## Best Practices

1. **Small, focused commits** - Keep commits small and focused on a single change
2. **Run tests before pushing** - Always run tests before pushing to remote
3. **Update documentation** - Keep documentation in sync with code changes
4. **Review your changes** - Use `git diff --staged` to review changes before committing
5. **Write meaningful commit messages** - Follow the conventional commit format

## CI/CD

While we no longer have pre-commit hooks, the CI pipeline will still run all checks on push and pull requests. Failed checks will need to be fixed before merging.

## Future Considerations

If needed, we may re-implement simplified git hooks in the future that are more reliable. For now, manual quality enforcement provides a more stable development experience.