import eslint from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import importPlugin from 'eslint-plugin-import';
import vitestPlugin from 'eslint-plugin-vitest';

export default [
  eslint.configs.recommended,
  prettier,
  {
    files: ['**/*.js'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.git/**',
      'test-results/**',
      'playwright-report/**',
      '*.min.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Node: 'readonly',
        global: 'readonly',
        performance: 'readonly',
        AbortController: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
        fetch: 'readonly',
        MutationObserver: 'readonly',
        process: 'readonly',
        NodeFilter: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      vitest: vitestPlugin,
    },
    rules: {
      // Error Prevention
      'no-console': ['warn', { allow: ['warn', 'error', 'debug', 'info'] }],
      'no-debugger': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-duplicate-imports': 'error',
      'no-undef': 'error',
      'no-param-reassign': 'error',
      'no-eval': 'error',

      // Code quality
      'max-lines': [
        'warn',
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 10],
      'max-depth': ['warn', 3],
      'max-nested-callbacks': ['warn', 3],
      'max-params': ['warn', 4],

      // Code style consistency
      camelcase: 'warn',
      'comma-dangle': ['error', 'always-multiline'],
      quotes: ['error', 'single', { avoidEscape: true }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'arrow-body-style': ['error', 'as-needed'],

      // Import rules
      'import/first': 'error',
      'import/no-mutable-exports': 'error',
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
        },
      ],

      // Vitest specific rules
      'vitest/expect-expect': 'error',
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-focused-tests': 'error',
      'vitest/no-identical-title': 'error',

      // Prettier integration
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          semi: true,
          trailingComma: 'all',
          printWidth: 100,
          tabWidth: 2,
        },
      ],
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
      'no-unused-vars': 'warn',
      'max-lines': 'off',
      complexity: 'off',
    },
  },
  // Config for complex files that need higher limits
  {
    files: [
      '**/error-handling.js',
      '**/dom-scanner.js',
      '**/callback-utils.js',
      '**/context-provider.js',
      '**/debounce.js',
    ],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-depth': ['warn', 5],
      complexity: ['warn', 55],
      'max-params': ['warn', 6],
      'max-nested-callbacks': ['warn', 5],
    },
  },
  // Special handling for Playwright config
  {
    files: ['**/playwright.config.js', '**/vitest.config.js'],
    rules: {
      'no-undef': 'off',
    },
  },
  // Special handling for minified files
  {
    files: ['**/minified-*.js'],
    rules: {
      'max-depth': 'off',
      complexity: 'off',
    },
  },
  // Special handling for browser compatibility test files
  {
    files: ['**/browser/**/*.js', '**/browser-*.js'],
    rules: {
      'no-useless-escape': 'off',
    },
  },
  // Files with parsing errors (need manual fixing)
  {
    files: [
      '**/background.js',
      '**/content-module.js',
      '**/content-script.js',
      '**/content.js',
      '**/dom-scanner.js',
    ],
    rules: {
      'no-unused-vars': 'warn',
      'no-eval': 'warn',
      'prefer-const': 'warn',
      'no-undef': 'warn',
    },
  },
  // Special handling for test performance files
  {
    files: ['**/test/performance/**/*.js'],
    rules: {
      'no-case-declarations': 'off',
      'no-undef': 'warn',
    },
  },
  // Special handling for files with unused variables
  {
    files: [
      '**/error-handling.js',
      '**/cache-manager.js',
      '**/callback-utils.js',
      '**/context-provider.js',
      '**/conversion.js',
      '**/debounce.js',
    ],
    rules: {
      'no-unused-vars': 'warn',
    },
  },
  // File length error threshold
  {
    files: ['**/*.js'],
    ignores: [
      // Files already excluded from max-lines rule
      '**/error-handling.js',
      '**/dom-scanner.js',
      '**/callback-utils.js',
      '**/context-provider.js',
      '**/debounce.js',
      'test/**/*.js',
      '**/minified-*.js',
    ],
    rules: {
      'max-lines': [
        'error',
        {
          max: 1000,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
];
