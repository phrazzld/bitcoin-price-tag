import eslint from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';

export default [
  eslint.configs.recommended,
  prettier,
  {
    files: ['content-script-fixed.js'],
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
    rules: {
      // Disable rules that would require major refactoring
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-depth': 'off',
      complexity: 'off',
      'max-params': 'off',
      'max-nested-callbacks': 'off',

      // Downgrade no-unused-vars to warning and add special patterns
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Core rules
      'no-var': 'error',
      'prefer-const': 'error',
      'no-duplicate-imports': 'error',
      'no-undef': 'error',

      // Style rules
      camelcase: 'warn',
      'comma-dangle': ['error', 'always-multiline'],
      quotes: ['error', 'single', { avoidEscape: true }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'arrow-body-style': ['warn', 'as-needed'],
    },
  },
];
