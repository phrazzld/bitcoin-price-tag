#!/usr/bin/env node

/**
 * Checks image files to ensure they don't exceed size limits
 * Used by lint-staged to prevent large image files from being committed
 */

import fs from 'fs';
import path from 'path';

// Maximum allowed file size in bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Get the file paths from command line arguments
const filePaths = process.argv.slice(2);

// Check each file
let hasLargeFiles = false;

filePaths.forEach((filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    if (fileSize > MAX_FILE_SIZE) {
      console.error(
        `Error: File ${filePath} exceeds the maximum size of 5MB (${(fileSize / (1024 * 1024)).toFixed(2)}MB)`,
      );
      hasLargeFiles = true;
    }
  } catch (error) {
    console.error(`Error checking file ${filePath}: ${error.message}`);
    process.exit(1);
  }
});

// Exit with error if any large files found
if (hasLargeFiles) {
  console.error(
    'Commit rejected due to large files. Please optimize or use Git LFS for large files.',
  );
  process.exit(1);
}

process.exit(0);
