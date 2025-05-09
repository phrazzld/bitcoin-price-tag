#!/usr/bin/env node

/**
 * Checks files for sensitive data patterns
 * Used by lint-staged to prevent sensitive data from being committed
 */

import fs from 'fs';

// Sensitive data patterns
const SENSITIVE_PATTERNS = [
  {
    name: 'AWS Access Key',
    regex: /AKIA[0-9A-Z]{16}/g,
  },
  {
    name: 'AWS Secret Key',
    regex: /(?:AWS|aws|Aws).*(?:SECRET|secret|Secret).*['"][0-9a-zA-Z/+]{40}['"]$/gm,
  },
  {
    name: 'Private Key',
    regex:
      /-----BEGIN (RSA |DSA |EC |OPENSSH |PRIVATE )?(PRIVATE KEY|KEY)-----.+-----END (RSA |DSA |EC |OPENSSH |PRIVATE )?(PRIVATE KEY|KEY)-----/s,
  },
  {
    name: 'Generic API Key/Secret',
    regex: /[Aa][Pp][Ii][_-]?[Kk][Ee][Yy][_-]?[=:]["']?[0-9a-zA-Z]{16,}/g,
  },
  {
    name: 'Generic Secret',
    regex: /[Ss][Ee][Cc][Rr][Ee][Tt][_-]?[Kk][Ee][Yy][_-]?[=:]["']?[0-9a-zA-Z]{16,}/g,
  },
  {
    name: 'Password in Code',
    regex: /[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd][_-]?[=:]["'][^"']{8,}["']/g,
  },
];

// Get the file paths from command line arguments
const filePaths = process.argv.slice(2);

// Check each file
let hasSensitiveData = false;

filePaths.forEach((filePath) => {
  try {
    // Skip binary files and generated files that may contain hash-like strings
    if (
      /\.(png|jpg|jpeg|gif|webp|ico|svg|woff|woff2|ttf|eot)$/.test(filePath) ||
      filePath.endsWith('pnpm-lock.yaml') ||
      filePath.includes('node_modules/')
    ) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    SENSITIVE_PATTERNS.forEach((pattern) => {
      const matches = content.match(pattern.regex);

      if (matches && matches.length > 0) {
        console.error(`Error: Possible ${pattern.name} found in ${filePath}`);
        hasSensitiveData = true;
      }
    });
  } catch (error) {
    console.error(`Error checking file ${filePath}: ${error.message}`);
    process.exit(1);
  }
});

// Exit with error if any sensitive data found
if (hasSensitiveData) {
  console.error(
    'Commit rejected due to potentially sensitive data. Please review the flagged content.',
  );
  process.exit(1);
}

process.exit(0);
