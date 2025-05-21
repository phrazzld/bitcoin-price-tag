/**
 * Content script DOM interaction module for finding and annotating prices
 */

import { PriceData } from '../common/types';
import { createLogger } from '../shared/logger';

/**
 * Module logger
 */
const logger = createLogger('content-script:dom');

/** 
 * Currency pattern for USD symbols and text
 * Matches $ symbol or USD text
 */
const CURRENCY_PATTERN = '(\\$|USD)';

/** 
 * Pattern for thousands separators
 * Matches digits with optional commas (e.g., 1,000)
 */
const THOUSANDS_PATTERN = '(\\d|\\,)*';

/** 
 * Pattern for decimal parts
 * Matches optional decimal point followed by digits
 */
const DECIMAL_PATTERN = '(\\.\\d+)?';

/** 
 * Pattern for magnitude suffixes (k, m, b, t for thousand, million, billion, trillion)
 * Also matches full words like "million", "billion", etc.
 */
const MAGNITUDE_PATTERN = '\\s?((t|b|m{1,2}|k)(r?illion|n)?(\\W|$))?';

/** 
 * Magnitude multipliers mapping suffix letters to their numeric values
 * Used to convert shorthand notations (e.g., "$5k" -> $5000)
 */
const MAGNITUDE_MULTIPLIERS = {
  t: 1000000000000, // trillion
  b: 1000000000,    // billion
  m: 1000000,       // million
  k: 1000           // thousand
};

/** 
 * Bitcoin unit suffixes with magnitude thresholds
 * Each entry contains: [min_magnitude, divisor_magnitude, suffix]
 * Used to format Bitcoin amounts with appropriate units (sats, BTC, etc.)
 */
const UNIT_SUFFIXES: Array<[number, number, string]> = [
  [0, 0, ' sats'],
  [4, 3, 'k sats'],
  [6, 6, 'M sats'],
  [8, 8, ' BTC'],
  [12, 11, 'k BTC'],
  [14, 14, 'M BTC'],
];

/**
 * Builds regex pattern for prices with currency symbol preceding the amount
 * Examples: $100, $1,000.50, $5k, $1.5m
 * @returns Regular expression pattern for preceding currency format
 */
function buildPrecedingPricePattern(): RegExp {
  return new RegExp(
    CURRENCY_PATTERN + '\\x20?\\d' + THOUSANDS_PATTERN + DECIMAL_PATTERN + MAGNITUDE_PATTERN,
    'gi'
  );
}

/**
 * Builds regex pattern for prices with currency symbol following the amount
 * Examples: 100 USD, 1,000 USD, 5k USD
 * @returns Regular expression pattern for following currency format
 */
function buildConcludingPricePattern(): RegExp {
  return new RegExp(
    '\\d' + THOUSANDS_PATTERN + DECIMAL_PATTERN + MAGNITUDE_PATTERN + '\\x20?' + CURRENCY_PATTERN,
    'gi'
  );
}

/**
 * Extracts magnitude multiplier from a price string
 * @param priceString The price string to analyze
 * @returns Multiplier value (1 for no suffix, 1000 for k, etc.)
 */
function getMagnitudeMultiplier(priceString: string): number {
  const lowerPrice = priceString.toLowerCase();
  
  for (const [key, value] of Object.entries(MAGNITUDE_MULTIPLIERS)) {
    if (lowerPrice.includes(key)) {
      return value;
    }
  }
  
  return 1;
}

/**
 * Rounds a number to specified decimal places
 * @param value The number to round
 * @param decimals Number of decimal places
 * @returns Rounded number
 */
function round(value: number, decimals: number): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

/**
 * Converts USD amount to Bitcoin/Satoshi with appropriate unit
 * Automatically selects the best unit (sats, k sats, M sats, BTC, etc.)
 * @param usdAmount The USD amount to convert
 * @param priceData Current Bitcoin price data
 * @returns Formatted string with Bitcoin value and unit
 */
function formatBitcoinPrice(usdAmount: number, priceData: PriceData): string {
  const satoshis = Math.floor(usdAmount / priceData.satoshiRate);
  const magnitude = String(satoshis).length;
  
  // Find appropriate unit suffix
  let suffixIndex = UNIT_SUFFIXES.findIndex(([minMag]) => minMag >= magnitude);
  if (suffixIndex < 0) suffixIndex = UNIT_SUFFIXES.length;
  
  const [, divisorMag, suffix] = UNIT_SUFFIXES[suffixIndex - 1];
  const roundDigits = Math.max(0, 3 - (magnitude - divisorMag));
  const formattedValue = round(satoshis / 10 ** divisorMag, roundDigits).toLocaleString();
  
  return formattedValue + suffix;
}

/**
 * Creates the price annotation snippet
 * @param originalText The original price text (e.g., "$100")
 * @param usdAmount The USD amount extracted from the text
 * @param priceData Current Bitcoin price data
 * @returns Annotated text with Bitcoin equivalent (e.g., "$100 (2.5M sats)")
 */
function createPriceAnnotation(originalText: string, usdAmount: number, priceData: PriceData): string {
  const btcPrice = formatBitcoinPrice(usdAmount, priceData);
  return `${originalText} (${btcPrice}) `;
}

/**
 * Processes a text node to find and annotate prices
 * Searches for price patterns and adds Bitcoin equivalents in parentheses
 * @param textNode The text node to process
 * @param priceData Current Bitcoin price data
 */
function processTextNode(textNode: Text, priceData: PriceData): void {
  if (!textNode.nodeValue) return;
  
  let text = textNode.nodeValue;
  let modified = false;
  
  // Process prices with preceding currency symbols
  const precedingPattern = buildPrecedingPricePattern();
  text = text.replace(precedingPattern, (match) => {
    modified = true;
    const multiplier = getMagnitudeMultiplier(match);
    const amount = parseFloat(match.replace(/[^\d.]/g, ''));
    const usdAmount = amount * multiplier;
    return createPriceAnnotation(match, usdAmount, priceData);
  });
  
  // Process prices with concluding currency symbols
  const concludingPattern = buildConcludingPricePattern();
  text = text.replace(concludingPattern, (match) => {
    modified = true;
    const multiplier = getMagnitudeMultiplier(match);
    const amount = parseFloat(match.replace(/[^\d.]/g, ''));
    const usdAmount = amount * multiplier;
    return createPriceAnnotation(match, usdAmount, priceData);
  });
  
  // Only update the DOM if we actually modified the text
  if (modified) {
    textNode.nodeValue = text;
  }
}

/**
 * Walks through DOM nodes and processes text nodes
 * Handles special cases for Amazon price elements
 * Recursively traverses the DOM tree
 * @param node The DOM node to process
 * @param priceData Current Bitcoin price data
 * @param processedNodes Set of nodes that have already been processed, used to avoid redundant work
 */
function walkNodes(node: Node, priceData: PriceData, processedNodes: Set<Node>): void {
  // Skip already processed nodes
  if (processedNodes.has(node)) {
    logger.debug('Node skipped (already processed).', {
      nodeName: node.nodeName,
      nodeType: node.nodeType
    });
    return;
  }
  // Handle special cases for Amazon price elements
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const classList = element.classList;
    
    if (classList) {
      // Amazon price handling
      if (classList.contains('sx-price-currency') || classList.contains('a-price-symbol')) {
        // Currency symbol - clear it
        if (element.firstChild && element.firstChild.nodeType === Node.TEXT_NODE) {
          const textNode = element.firstChild as Text;
          if (textNode.nodeValue) {
            textNode.nodeValue = null;
          }
        }
        return;
      } else if (classList.contains('sx-price-whole') || classList.contains('a-price-whole') || classList.contains('a-price-decimal')) {
        // Price whole part - collect with fraction and process
        if (element.firstChild && element.firstChild.nodeType === Node.TEXT_NODE) {
          const textNode = element.firstChild as Text;
          const nextSibling = element.nextElementSibling;
          
          if (nextSibling && (nextSibling.classList.contains('sx-price-fractional') || nextSibling.classList.contains('a-price-fraction'))) {
            const fraction = nextSibling.firstChild?.nodeValue || '00';
            const fullPrice = `$${textNode.nodeValue}.${fraction}`;
            textNode.nodeValue = fullPrice;
            processTextNode(textNode, priceData);
            
            // Clear the fraction element
            if (nextSibling.firstChild) {
              (nextSibling.firstChild as Text).nodeValue = null;
            }
          }
        }
        return;
      } else if (classList.contains('sx-price-fractional') || classList.contains('a-price-fraction')) {
        // Already handled with whole part
        return;
      }
    }
  }
  
  // Process text nodes
  if (node.nodeType === Node.TEXT_NODE) {
    processTextNode(node as Text, priceData);
    return;
  }
  
  // Recursively process child nodes
  let child = node.firstChild;
  while (child) {
    const next = child.nextSibling;
    walkNodes(child, priceData, processedNodes);
    child = next;
  }
  
  // Mark node as processed
  processedNodes.add(node);
  logger.debug('Node added to processed set.', {
    nodeName: node.nodeName,
    nodeType: node.nodeType
  });
}

/**
 * Main function to find and annotate prices in the DOM
 * @param rootNode The root node to search within
 * @param priceData Current Bitcoin price data
 * @param processedNodes Set of nodes that have already been processed, used to avoid redundant work
 *                      when handling dynamically added content and mutation events
 */
export function findAndAnnotatePrices(
  rootNode: Node, 
  priceData: PriceData, 
  processedNodes: Set<Node>
): void {
  walkNodes(rootNode, priceData, processedNodes);
}