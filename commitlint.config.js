/**
 * Configuration for commitlint to enforce Conventional Commits
 * https://www.conventionalcommits.org/
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [2, 'always', 100],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
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
        'test',
      ],
    ],
  },
};
