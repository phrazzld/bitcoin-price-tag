/**
 * Bootstrap module for Bitcoin Price Tag
 * 
 * This file serves as the entry point for the module system,
 * importing the main content module and initializing it.
 */

import { initBitcoinPriceTag } from '/content-module.js';

// Initialize the module
try {
  initBitcoinPriceTag();
  console.log('Bitcoin Price Tag module initialized successfully');
} catch (error) {
  console.error('Bitcoin Price Tag module initialization error:', error);
}