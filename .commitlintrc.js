module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Ensure the commit type is one of the conventional types
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test'
      ]
    ],
    // Ensure subject case is lower case
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    // Ensure subject is not empty
    'subject-empty': [2, 'never'],
    // Limit subject length to 100 characters
    'subject-max-length': [2, 'always', 100],
    // Ensure type is not empty
    'type-empty': [2, 'never'],
    // Ensure type case is lower case
    'type-case': [2, 'always', 'lower-case'],
    // Ensure header max length is 100 characters
    'header-max-length': [2, 'always', 100],
    // Ensure body max line length is 100 characters
    'body-max-line-length': [2, 'always', 100],
    // Ensure footer max line length is 100 characters
    'footer-max-line-length': [2, 'always', 100]
  }
};