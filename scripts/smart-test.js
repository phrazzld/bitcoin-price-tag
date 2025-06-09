#!/usr/bin/env node

/**
 * Smart Test Runner for CI Optimization
 * 
 * Intelligently selects the appropriate test suite based on context:
 * - Smoke tests: Fast core functionality validation
 * - CI tests: Balanced test suite for PR validation  
 * - Full tests: Comprehensive test suite for thorough validation
 */

const { execSync } = require('child_process');
const path = require('path');

// Test suite configurations
const TEST_SUITES = {
  smoke: {
    command: 'npm run test:ci:smoke',
    description: 'Fast core functionality tests (~30 seconds)',
    when: 'Quick validation, pre-commit hooks, fast feedback'
  },
  ci: {
    command: 'npm run test:ci',
    description: 'Balanced test suite for CI (~2-3 minutes)',
    when: 'PR validation, CI pipelines, comprehensive but time-constrained'
  },
  full: {
    command: 'npm run test:ci:full', 
    description: 'Complete test suite (5+ minutes)',
    when: 'Local development, pre-release validation, thorough testing'
  }
};

function getTestSuite() {
  const args = process.argv.slice(2);
  
  // Check for explicit test suite argument
  if (args.includes('--smoke')) return 'smoke';
  if (args.includes('--ci')) return 'ci';
  if (args.includes('--full')) return 'full';
  
  // Auto-detect based on environment
  if (process.env.CI) {
    // In CI, default to balanced CI tests unless otherwise specified
    if (process.env.GITHUB_EVENT_NAME === 'push' && process.env.GITHUB_REF === 'refs/heads/main') {
      return 'full'; // Full tests on main branch pushes
    }
    return 'ci'; // Balanced tests for PRs and other CI contexts
  }
  
  // Check if this is a pre-commit hook (husky sets this)
  if (process.env.HUSKY_GIT_PARAMS || process.env.GIT_PARAMS) {
    return 'smoke'; // Fast tests for pre-commit
  }
  
  // Default to CI tests for local development
  return 'ci';
}

function printUsage() {
  console.log('\n🧪 Smart Test Runner\n');
  console.log('Usage: node scripts/smart-test.js [--smoke|--ci|--full]\n');
  
  Object.entries(TEST_SUITES).forEach(([name, config]) => {
    console.log(`📋 ${name.toUpperCase()} TESTS`);
    console.log(`   Command: ${config.command}`);
    console.log(`   Description: ${config.description}`);
    console.log(`   When to use: ${config.when}\n`);
  });
}

function runTests() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }
  
  const suite = getTestSuite();
  const config = TEST_SUITES[suite];
  
  console.log(`\n🚀 Running ${suite.toUpperCase()} test suite`);
  console.log(`📝 ${config.description}`);
  console.log(`⚡ Command: ${config.command}\n`);
  
  try {
    // Run the selected test suite
    execSync(config.command, { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    
    console.log(`\n✅ ${suite.toUpperCase()} tests completed successfully!`);
    
    // Provide guidance on next steps
    if (suite === 'smoke') {
      console.log('💡 For more thorough testing, run: npm run test:ci');
    } else if (suite === 'ci') {
      console.log('💡 For complete validation, run: npm run test:ci:full');
    }
    
  } catch (error) {
    console.error(`\n❌ ${suite.toUpperCase()} tests failed!`);
    console.error('🔍 For debugging, check the test output above.');
    
    if (suite === 'ci' || suite === 'full') {
      console.error('💡 Try running smoke tests first: npm run test:ci:smoke');
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = { getTestSuite, TEST_SUITES, runTests };