# Git Hooks

This project uses Git hooks to enforce code quality and standards. The hooks are implemented using [Husky](https://github.com/typicode/husky) and [lint-staged](https://github.com/okonet/lint-staged).

## Available Hooks

### Pre-commit

The pre-commit hook runs automatically when you attempt to commit changes. It performs the following checks:

1. **Formatting**: Runs Prettier on staged files to ensure consistent formatting
2. **Limited ESLint Checking**: Runs ESLint with reduced strictness to catch critical errors
3. **Sensitive Data Detection**: Scans files for potential sensitive data like API keys and passwords (excludes lock files and binary files)
4. **Image Size Check**: Ensures images don't exceed the maximum allowed size (5MB)

**Note**: ESLint is configured in a limited mode for pre-commit hooks that only enforces critical rules (like undefined variables) while ignoring stylistic and complexity rules. This approach ensures that the hooks can run without bypassing while still catching critical errors. The full suite of ESLint rules is still enforced during CI builds.

### Commit Message

The commit-msg hook validates your commit messages to ensure they follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

<body>

<footer>
```

Valid types:

- build: Changes that affect the build system or external dependencies
- chore: Maintenance tasks that don't affect the code
- ci: Changes to CI configuration files and scripts
- docs: Documentation only changes
- feat: A new feature
- fix: A bug fix
- perf: A code change that improves performance
- refactor: A code change that neither fixes a bug nor adds a feature
- revert: Reverting a previous commit
- style: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- test: Adding missing tests or correcting existing tests

### Post-commit

The post-commit hook runs after a commit is successfully created:

1. **Project Analysis**: Runs `glance ./` asynchronously to analyze project structure
2. **Documentation Generation**: Automatically updates documentation when relevant files change:
   - Updates component documentation when component files are modified
   - Updates API documentation when API-related files are modified
   - Logs all actions to `.git/post-commit.log` for review

Since these operations run asynchronously, they won't block your workflow.

### Pre-push

The pre-push hook runs before pushing commits to the remote repository:

1. **Tests**: Runs the test suite to ensure all tests pass
2. **Branch Naming**: Validates branch names follow the required convention:
   - `type/description-with-hyphens`
   - Valid types: feature, bugfix, hotfix, release, chore, docs, refactor
   - Example: `feature/add-bitcoin-price-display`

## Bypassing Hooks

The hooks are now configured to work without bypassing in most cases. The pre-commit hook uses a limited configuration of ESLint that only enforces critical rules while ignoring stylistic and complexity warnings.

If you encounter a situation where you still need to bypass hooks, this should be done with caution and only when absolutely necessary:

```bash
# Bypass pre-commit and commit-msg hooks
git commit --no-verify -m "commit message"

# Bypass pre-push hook
git push --no-verify
```

**Important**: The CI system will still run the complete set of checks with stricter rules, so bypassing hooks locally doesn't mean you can skip the quality standards. Any code that doesn't meet the full standards will be caught in CI.

## Troubleshooting

If you encounter issues with the hooks:

1. Ensure you have installed dependencies with `pnpm install`
2. If hooks aren't running, try reinstalling them with:
   ```bash
   pnpm exec husky init
   ```
3. Make sure the hook scripts are executable:
   ```bash
   chmod +x .husky/pre-commit .husky/commit-msg .husky/pre-push
   ```
