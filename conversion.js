/**
 * Bitcoin Price Tag - Currency Conversion Module
 *
 * This module handles all currency conversion logic for the Bitcoin Price Tag extension.
 */

// Constants for price conversion
export const currencySection = '(\\$|USD)';
export const thousandsSection = '(\\d|\\,)*';
export const decimalSection = '(\\.\\d+)?';
export const illions = '\\s?((t|b|m{1,2}|k)(r?illion|n)?(\\W|$))?';

export const ONE_TRILLION = 1000000000000;
export const ONE_BILLION = 1000000000;
export const ONE_MILLION = 1000000;
export const ONE_THOUSAND = 1000;

/**
 * Builds a regular expression pattern for matching currency formats where the symbol precedes the amoun
 * e.g., $100, $5.5k, $1.2 million
 * @returns {RegExp} Regular expression for matching preceding currency formats
 */
export function buildPrecedingMatchPattern() {
  return new RegExp(
    currencySection + '\\x20?\\d' + thousandsSection + decimalSection + illions,
    'gi',
  );
}

/**
 * Builds a regular expression pattern for matching currency formats where the symbol follows the amoun
 * e.g., 100$, 5.5k USD, 1.2 million USD
 * @returns {RegExp} Regular expression for matching concluding currency formats
 */
export function buildConcludingMatchPattern() {
  return new RegExp(
    '\\d' + thousandsSection + decimalSection + illions + '\\x20?' + currencySection,
    'gi',
  );
}

/**
 * Extracts the numeric value from a currency string
 * @param {string} currencyString - The currency string (e.g., "$100", "5.5k USD")
 * @returns {number} The extracted numeric value
 */
export function extractNumericValue(currencyString) {
  return parseFloat(currencyString.replace(/[^\d.]/g, ''));
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

  // Check for full words firs
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
    throw new Error('Invalid satoshi price');
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
    throw new Error('Invalid bitcoin price');
  }

  const value = (fiatAmount / btcPrice).toFixed(4);
  // Handle very small values that might become zero after rounding
  if (value === '0.0000' && fiatAmount > 0) {
    return '0.0001'; // Minimum displayable amoun
  }
  return parseFloat(value).toLocaleString();
}

/**
 * User-friendly suffixes for different magnitudes of satoshis/bitcoin
 * Format: [min magnitude, denominator magnitude, suffix]
 */
export const friendlySuffixes = [
  [0, 0, ' sats'],
  [4, 3, 'k sats'],
  [6, 6, 'M sats'],
  [8, 8, ' BTC'],
  [12, 11, 'k BTC'],
  [14, 14, 'M BTC'],
];

/**
 * Round a number to a specific number of decimal places
 * @param {number} x - Number to round
 * @param {number} y - Decimal places
 * @returns {number} Rounded number
 */
export function round(x, y) {
  return Math.round(x * 10 ** y) / 10 ** y;
}

/**
 * Format value in a user-friendly way, automatically selecting appropriate units
 * @param {number} fiatAmount - Amount in fiat currency
 * @param {number} satPrice - Price of 1 satoshi in fiat currency
 * @returns {string} User-friendly formatted amount with appropriate units
 */
export function valueFriendly(fiatAmount, satPrice) {
  if (!satPrice || satPrice <= 0) {
    throw new Error('Invalid satoshi price');
  }

  const sats = Math.floor(fiatAmount / satPrice);
  const m = String(sats).length;
  let si = friendlySuffixes.findIndex(([l]) => l >= m);
  si = si < 0 ? friendlySuffixes.length : si;
  const [l, d, suffix] = friendlySuffixes[si - 1];
  const roundDigits = Math.max(0, 3 - (m - d));
  return round(sats / 10 ** d, roundDigits).toLocaleString() + suffix;
}

/**
 * Creates a string with the original currency value and its bitcoin equivalen
 * @param {string} sourceElement - The original currency string
 * @param {number} fiatAmount - The numeric fiat amoun
 * @param {number} btcPrice - The price of one bitcoin in the fiat currency
 * @param {number} satPrice - The price of one satoshi in the fiat currency
 * @returns {string} The formatted string with bitcoin value
 */
export function makeSnippet(sourceElement, fiatAmount, btcPrice, satPrice) {
  if (!btcPrice || btcPrice <= 0) {
    throw new Error('Invalid bitcoin price');
  }

  if (!satPrice || satPrice <= 0) {
    throw new Error('Invalid satoshi price');
  }

  // Use the friendly formatter that automatically selects the appropriate uni
  return `${sourceElement} (${valueFriendly(fiatAmount, satPrice)}) `;
}

/**
 * Calculates the satoshi price based on the bitcoin price
 * @param {number} btcPrice - The price of one bitcoin
 * @returns {number} The price of one satoshi
 */
export function calculateSatPrice(btcPrice) {
  if (!btcPrice || btcPrice <= 0) {
    throw new Error('Invalid bitcoin price');
  }

  return btcPrice / 100000000;
}
