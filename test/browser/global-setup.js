/**
 * Global setup for Playwright tests
 * This file configures the test environment before tests run
 */

async function globalSetup(_config) {
  console.debug('Setting up global test environment...');

  // This is used by Playwright to set up the environment before tests run
  // We can add more setup code here as needed

  return async () => {
    console.debug('Cleaning up global test environment...');
  };
}

export default globalSetup;
