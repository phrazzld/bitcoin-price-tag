const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  // Ignore built files and dependencies
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'archive/**', 'bitcoin-price-tag.zip'],
  },
  // Base recommended config
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Type-aware rules for source files only
  {
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Enforce no-explicit-any with ZERO exceptions
      '@typescript-eslint/no-explicit-any': 'error',
      
      // Prevent assigning values of type `any`
      '@typescript-eslint/no-unsafe-assignment': 'error',
      
      // Prevent accessing members of `any` values
      '@typescript-eslint/no-unsafe-member-access': 'error',
      
      // Additional strict type safety rules
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      
      // Detect unused variables and imports
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'args': 'all',
          'argsIgnorePattern': '^_',
          'caughtErrors': 'all',
          'caughtErrorsIgnorePattern': '^_',
          'destructuredArrayIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'ignoreRestSiblings': true
        }
      ],
    },
  },
  // Config for test files - no type checking but still no any
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'args': 'all',
          'argsIgnorePattern': '^_',
          'caughtErrors': 'all',
          'caughtErrorsIgnorePattern': '^_',
          'destructuredArrayIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'ignoreRestSiblings': true
        }
      ],
    },
  },
  // Config for config files
  {
    files: ['*.config.ts', '*.config.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'args': 'all',
          'argsIgnorePattern': '^_',
          'caughtErrors': 'all',
          'caughtErrorsIgnorePattern': '^_',
          'destructuredArrayIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'ignoreRestSiblings': true
        }
      ],
    },
  },
  // JS files
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
);