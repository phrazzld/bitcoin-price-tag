#!/usr/bin/env node

/**
 * Script to automatically generate API documentation
 * Called by the post-commit hook when relevant files change
 */

import fs from 'fs';
import path from 'path';

// Configuration
const _SOURCE_DIR = '.';
const DOCS_DIR = 'docs';
const API_DOC_FILE = path.join(DOCS_DIR, 'API.md');

console.log('Generating API documentation...');

// Ensure docs directory exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// Files to analyze for API documentation
const FILES_TO_ANALYZE = ['conversion.js', 'cache-manager.js', 'error-handling.js'];

// Extract API information
const apiDocs = [];

FILES_TO_ANALYZE.forEach((file) => {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');

      // Simple regex-based extraction for exported functions
      const exportMatches = content.match(/export\s+(const|function|class|let|var)\s+(\w+)/g) || [];

      // Extract exported items
      const apis = exportMatches.map((match) => {
        const parts = match.match(/export\s+(const|function|class|let|var)\s+(\w+)/);
        return {
          name: parts[2],
          type: parts[1],
          file,
        };
      });

      apiDocs.push(...apis);
    }
  } catch (error) {
    console.error(`Error processing ${file}: ${error.message}`);
  }
});

// Generate markdown documentation
let markdown = '# Bitcoin Price Tag API\n\n';
markdown += 'This document was automatically generated based on the codebase.\n\n';
markdown += '## Public API\n\n';
markdown += 'The Bitcoin Price Tag extension exposes the following public APIs:\n\n';

const fileGroups = {};

// Group APIs by file
apiDocs.forEach((api) => {
  if (!fileGroups[api.file]) {
    fileGroups[api.file] = [];
  }
  fileGroups[api.file].push(api);
});

// Generate documentation for each file
Object.keys(fileGroups).forEach((file) => {
  markdown += `### ${file}\n\n`;

  // List APIs
  fileGroups[file].forEach((api) => {
    markdown += `- \`${api.name}\` (${api.type})\n`;
  });

  markdown += '\n';
});

// Add timestamp
markdown += `\n\n---\n\nLast updated: ${new Date().toISOString()}\n`;

// Write to file
fs.writeFileSync(API_DOC_FILE, markdown);

console.log(`API documentation generated at ${API_DOC_FILE}`);
