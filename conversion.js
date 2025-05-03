/**
 * Bitcoin Price Tag - Currency Conversion Module
 * 
 * This module handles all currency conversion logic for the Bitcoin Price Tag extension.
 */

// Constants for price conversion
export const currencySection = "(\\$|USD)";
export const thousandsSection = "(\\d|\\,)*";
export const decimalSection = "(\\.\\d+)?";
export const illions = "\\s?((t|b|m{1,2}|k)(r?illion|n)?(\\W|$))?";

export const ONE_TRILLION = 1000000000000;
export const ONE_BILLION = 1000000000;
export const ONE_MILLION = 1000000;
export const ONE_THOUSAND = 1000;

/**
 * Builds a regular expression pattern for matching currency formats where the symbol precedes the amount
 * e.g., $100, $5.5k, $1.2 million
 * @returns {RegExp} Regular expression for matching preceding currency formats
 */
export function buildPrecedingMatchPattern() {
  return new RegExp(
    currencySection + "\\x20?\\d" + thousandsSection + decimalSection + illions,
    "gi"
  );
}

/**
 * Builds a regular expression pattern for matching currency formats where the symbol follows the amount
 * e.g., 100$, 5.5k USD, 1.2 million USD
 * @returns {RegExp} Regular expression for matching concluding currency formats
 */
export function buildConcludingMatchPattern() {
  return new RegExp(
    "\\d" +
      thousandsSection +
      decimalSection +
      illions +
      "\\x20?" +
      currencySection,
    "gi"
  );
}

/**
 * Extracts the numeric value from a currency string
 * @param {string} currencyString - The currency string (e.g., "$100", "5.5k USD")
 * @returns {number} The extracted numeric value
 */
export function extractNumericValue(currencyString) {
  return parseFloat(currencyString.replace(/[^\d.]/g, ""));
}

/**
 * Gets the multiplier for abbreviated currency values (k, m, b, t)
 * @param {string} text - The text containing possible multiplier indicators
 * @returns {number} The appropriate multiplier value
 */
export function getMultiplier(text) {
  if (!text) {
    throw new Error('Input text cannot be null or undefined');
  }
  
  const lowerText = text.toLowerCase();
  
  // Check for full words first
  if (lowerText.includes('thousand')) {
    return ONE_THOUSAND;
  }
  
  if (lowerText.includes('million')) {
    return ONE_MILLION;
  }
  
  if (lowerText.includes('billion')) {
    return ONE_BILLION;
  }
  
  if (lowerText.includes('trillion')) {
    return ONE_TRILLION;
  }
  
  // Then check for abbreviations
  if (lowerText.indexOf('k') > -1) {
    return ONE_THOUSAND;
  }
  
  if (lowerText.indexOf('m') > -1) {
    return ONE_MILLION;
  }
  
  if (lowerText.indexOf('b') > -1) {
    return ONE_BILLION;
  }
  
  if (lowerText.indexOf('t') > -1) {
    return ONE_TRILLION;
  }
  
  return 1;
}

/**
 * Converts fiat amount to satoshis
 * @param {number} fiatAmount - The amount in fiat currency
 * @param {number} satPrice - The price of one satoshi in the fiat currency
 * @returns {string} The formatted amount in sats
 */
export function valueInSats(fiatAmount, satPrice) {
  if (!satPrice || satPrice <= 0) {
    throw new Error("Invalid satoshi price");
  }
  
  return parseFloat((fiatAmount / satPrice).toFixed(0)).toLocaleString();
}

/**
 * Converts fiat amount to bitcoin
 * @param {number} fiatAmount - The amount in fiat currency
 * @param {number} btcPrice - The price of one bitcoin in the fiat currency
 * @returns {string} The formatted amount in BTC
 */
export function valueInBtc(fiatAmount, btcPrice) {
  if (!btcPrice || btcPrice <= 0) {
    throw new Error("Invalid bitcoin price");
  }
  
  const value = (fiatAmount / btcPrice).toFixed(4);
  // Handle very small values that might become zero after rounding
  if (value === '0.0000' && fiatAmount > 0) {
    return '0.0001'; // Minimum displayable amount
  }
  return parseFloat(value).toLocaleString();
}

/**
 * Creates a string with the original currency value and its bitcoin equivalent
 * @param {string} sourceElement - The original currency string
 * @param {number} fiatAmount - The numeric fiat amount
 * @param {number} btcPrice - The price of one bitcoin in the fiat currency
 * @param {number} satPrice - The price of one satoshi in the fiat currency
 * @returns {string} The formatted string with bitcoin value
 */
export function makeSnippet(sourceElement, fiatAmount, btcPrice, satPrice) {
  if (!btcPrice || btcPrice <= 0) {
    throw new Error("Invalid bitcoin price");
  }
  
  if (!satPrice || satPrice <= 0) {
    throw new Error("Invalid satoshi price");
  }
  
  if (fiatAmount >= btcPrice) {
    return `${sourceElement} (${valueInBtc(fiatAmount, btcPrice)} BTC) `;
  } else {
    return `${sourceElement} (${valueInSats(fiatAmount, satPrice)} sats) `;
  }
}

/**
 * Calculates the satoshi price based on the bitcoin price
 * @param {number} btcPrice - The price of one bitcoin
 * @returns {number} The price of one satoshi
 */
export function calculateSatPrice(btcPrice) {
  if (!btcPrice || btcPrice <= 0) {
    throw new Error("Invalid bitcoin price");
  }
  
  return btcPrice / 100000000;
}