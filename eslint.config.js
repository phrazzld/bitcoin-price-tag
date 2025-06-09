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
  // Config for test files - allow necessary flexibility for testing
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Allow any in tests but warn
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off', 
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
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
      // Allow unbound methods in test files for expect() matchers
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  // Config for config files and scripts
  {
    files: ['*.config.ts', '*.config.js', 'eslint.config.js', 'verify-build.js', 'scripts/**/*.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-require-imports': 'off', // Allow require() in config files and scripts
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
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
);