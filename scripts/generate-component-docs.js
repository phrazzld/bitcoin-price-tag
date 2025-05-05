#!/usr/bin/env node

/**
 * Script to automatically generate component documentation
 * Called by the post-commit hook when relevant files change
 */

import fs from 'fs';
import path from 'path';

// Configuration
const SOURCE_DIR = '.';
const DOCS_DIR = 'docs';
const COMPONENTS_DOC_FILE = path.join(DOCS_DIR, 'COMPONENTS.md');

console.log('Generating component documentation...');

// Ensure docs directory exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// Files to analyze for component documentation
const FILES_TO_ANALYZE = ['content-module.js', 'dom-scanner.js', 'context-provider.js'];

// Extract component information
const componentDocs = [];

FILES_TO_ANALYZE.forEach((file) => {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');

      // Simple regex-based extraction - can be enhanced for more complex parsing
      const functionMatches = content.match(/function\s+(\w+)\s*\(([^)]*)\)/g) || [];
      const classMatches = content.match(/class\s+(\w+)(\s+extends\s+\w+)?/g) || [];

      // Extract function and method names
      const components = [
        ...functionMatches.map((match) => {
          const name = match.match(/function\s+(\w+)/)[1];
          return { name, type: 'function', file };
        }),
        ...classMatches.map((match) => {
          const name = match.match(/class\s+(\w+)/)[1];
          return { name, type: 'class', file };
        }),
      ];

      componentDocs.push(...components);
    }
  } catch (error) {
    console.error(`Error processing ${file}: ${error.message}`);
  }
});

// Generate markdown documentation
let markdown = `# Bitcoin Price Tag Components\n\n`;
markdown += `This document was automatically generated based on the codebase.\n\n`;

const fileGroups = {};

// Group components by file
componentDocs.forEach((component) => {
  if (!fileGroups[component.file]) {
    fileGroups[component.file] = [];
  }
  fileGroups[component.file].push(component);
});

// Generate documentation for each file
Object.keys(fileGroups).forEach((file) => {
  markdown += `## ${file}\n\n`;

  // List components by type
  const classes = fileGroups[file].filter((c) => c.type === 'class');
  const functions = fileGroups[file].filter((c) => c.type === 'function');

  if (classes.length > 0) {
    markdown += `### Classes\n\n`;
    classes.forEach((c) => {
      markdown += `- \`${c.name}\`\n`;
    });
    markdown += '\n';
  }

  if (functions.length > 0) {
    markdown += `### Functions\n\n`;
    functions.forEach((c) => {
      markdown += `- \`${c.name}\`\n`;
    });
    markdown += '\n';
  }
});

// Add timestamp
markdown += `\n\n---\n\nLast updated: ${new Date().toISOString()}\n`;

// Write to file
fs.writeFileSync(COMPONENTS_DOC_FILE, markdown);

console.log(`Component documentation generated at ${COMPONENTS_DOC_FILE}`);
