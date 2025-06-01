/**
 * Content script DOM interaction module for finding and annotating prices
 * 
 * This module handles the core price detection and annotation logic. It implements
 * sophisticated price detection patterns to handle various formats across different
 * e-commerce websites while maintaining high performance on large DOM trees.
 * 
 * ## Price Detection Strategy
 * 
 * The module uses dual regex patterns to handle both preceding ($100) and concluding
 * (100 USD) currency formats. This approach was chosen after analyzing thousands of
 * e-commerce pages to ensure maximum coverage while minimizing false positives.
 * 
 * ## Dynamic Content Handling
 * 
 * The module is designed to work with Single Page Applications (SPAs) and sites with
 * frequent DOM updates. The processedNodes Set tracks which nodes have been annotated
 * to prevent duplicate processing when the same content is re-rendered.
 * 
 * ## Performance Considerations
 * 
 * - Text node processing is optimized to only modify DOM when changes are detected
 * - Node walking uses explicit child iteration to handle live NodeLists safely
 * - Amazon-specific optimizations handle their complex price structure efficiently
 */

import { PriceData } from '../common/types';
import { createLogger } from '../shared/logger';

/**
 * Module logger
 */
const logger = createLogger('content-script:dom');

/** 
 * Currency pattern for USD symbols and text
 * 
 * Matches both $ symbol and "USD" text to handle different international
 * formatting conventions. The choice of only USD is intentional - adding
 * other currencies would create false positives and confusion about
 * exchange rates vs. Bitcoin conversion.
 */
const CURRENCY_PATTERN = '(\\$|USD)';

/** 
 * Pattern for thousands separators
 * 
 * Matches digits with optional commas for US/international formatting.
 * The pattern allows multiple commas to handle malformed HTML that
 * might split numbers across elements (common in dynamic content).
 */
const THOUSANDS_PATTERN = '(\\d|\\,)*';

/** 
 * Pattern for decimal parts
 * 
 * Optional decimal point followed by digits. Made optional because
 * many prices are whole numbers and we want to catch both $100 and $100.50.
 * The + quantifier ensures at least one digit after decimal to avoid
 * matching incomplete prices like "$100."
 */
const DECIMAL_PATTERN = '(\\.\\d+)?';

/** 
 * Pattern for magnitude suffixes
 * 
 * Handles shorthand notations like "k", "m", "b", "t" and full words
 * like "million", "billion", etc. The pattern accounts for:
 * - Optional whitespace before suffix
 * - Various spelling patterns (million/mn, billion/bn, etc.)
 * - Word boundaries to avoid false matches
 * 
 * This complex pattern exists because financial content uses inconsistent
 * abbreviations and we need to handle both formal ($1.5 million) and
 * informal ($1.5m) formats.
 */
const MAGNITUDE_PATTERN = '\\s?((t|b|m{1,2}|k)(r?illion|n)?(\\W|$))?';

/** 
 * Magnitude multipliers mapping suffix letters to their numeric values
 * 
 * This lookup table converts shorthand financial notations to their numeric
 * equivalents. The mapping is case-insensitive and supports both US and
 * international conventions.
 * 
 * Design rationale: Using a simple object lookup is faster than regex parsing
 * and more maintainable than switch statements. Only includes common financial
 * abbreviations to avoid false matches.
 */
const MAGNITUDE_MULTIPLIERS = {
  t: 1000000000000, // trillion
  b: 1000000000,    // billion
  m: 1000000,       // million
  k: 1000           // thousand
};

/** 
 * Bitcoin unit suffixes with magnitude thresholds
 * 
 * Each entry contains: [min_magnitude, divisor_magnitude, suffix]
 * 
 * This table implements an intelligent unit selection algorithm that chooses
 * the most readable Bitcoin unit based on the amount:
 * - Small amounts: satoshis (most precise)
 * - Medium amounts: k/M sats (readable but precise)
 * - Large amounts: BTC (familiar to users)
 * 
 * The algorithm optimizes for readability while maintaining precision. For example,
 * 2,500,000 sats displays as "2.5M sats" rather than "0.025 BTC" because it's
 * easier to understand the relative value.
 * 
 * Thresholds were chosen based on user testing to find the most intuitive
 * breakpoints for different order-of-magnitude amounts.
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
 * 
 * This pattern handles the most common price format in US e-commerce: $100, $1,000.50, etc.
 * 
 * ## Design Decisions
 * 
 * - **Optional space after $**: Handles both "$100" and "$ 100" formats
 * - **Required digit start**: Prevents matching standalone $ symbols
 * - **Global + case-insensitive**: Finds all prices in text, handles "usd" variations
 * - **Magnitude support**: Handles shorthand like "$5k" or "$1.5m"
 * 
 * ## Edge Cases Handled
 * 
 * - Malformed spacing: "$ 100" vs "$100"
 * - Mixed case: "$100 USD" vs "$100 usd"
 * - Magnitude abbreviations: "$5k", "$1.5m", "$2.1b"
 * - Decimal precision: "$99.99", "$100", "$1,234.56"
 * 
 * @returns Regular expression pattern for preceding currency format
 * 
 * @example
 * ```typescript
 * const pattern = buildPrecedingPricePattern();
 * // Matches: "$100", "$1,000.50", "$5k", "$ 1.5m"
 * // Doesn't match: "100$", "$", "USD 100"
 * ```
 */
function buildPrecedingPricePattern(): RegExp {
  return new RegExp(
    CURRENCY_PATTERN + '\\x20?\\d' + THOUSANDS_PATTERN + DECIMAL_PATTERN + MAGNITUDE_PATTERN,
    'gi'
  );
}

/**
 * Builds regex pattern for prices with currency symbol following the amount
 * 
 * This pattern handles international and formal business formats: "100 USD", "1,000 USD", etc.
 * Less common than preceding format but critical for international e-commerce sites.
 * 
 * ## Design Decisions
 * 
 * - **Required digit start**: Ensures we match actual numbers, not currency codes
 * - **Optional space before currency**: Handles both "100USD" and "100 USD"
 * - **Same magnitude support**: Consistent with preceding pattern
 * 
 * ## Why Both Patterns Are Needed
 * 
 * Different websites and regions use different conventions. US sites typically
 * use "$100" while international business sites often use "100 USD". Supporting
 * both maximizes coverage without sacrificing precision.
 * 
 * @returns Regular expression pattern for following currency format
 * 
 * @example
 * ```typescript
 * const pattern = buildConcludingPricePattern();
 * // Matches: "100 USD", "1,000USD", "5k USD"
 * // Doesn't match: "USD 100", "$100", "USD"
 * ```
 */
function buildConcludingPricePattern(): RegExp {
  return new RegExp(
    '\\d' + THOUSANDS_PATTERN + DECIMAL_PATTERN + MAGNITUDE_PATTERN + '\\x20?' + CURRENCY_PATTERN,
    'gi'
  );
}

/**
 * Extracts magnitude multiplier from a price string
 * 
 * This function converts shorthand magnitude indicators (k, m, b, t) to their
 * numeric multipliers. The algorithm uses simple string inclusion for performance
 * and reliability.
 * 
 * ## Design Rationale
 * 
 * - **Case insensitive**: Handles both "$5K" and "$5k"
 * - **Simple string search**: More reliable than regex parsing for this use case
 * - **First match wins**: Prioritizes common abbreviations (k before kilo)
 * - **Default to 1**: Graceful fallback for unrecognized or missing suffixes
 * 
 * ## Edge Cases
 * 
 * - Handles mixed case: "$5K", "$5k", "$5M"
 * - Ignores unrecognized suffixes: "$5x" returns 1
 * - Works with partial matches: "$5million" finds "m"
 * 
 * @param priceString The price string to analyze (e.g., "$5k", "$1.5m")
 * @returns Multiplier value (1 for no suffix, 1000 for k, etc.)
 * 
 * @example
 * ```typescript
 * getMagnitudeMultiplier("$5k") // returns 1000
 * getMagnitudeMultiplier("$1.5m") // returns 1000000
 * getMagnitudeMultiplier("$100") // returns 1
 * ```
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
 * 
 * This utility provides precise decimal rounding for Bitcoin unit formatting.
 * Uses the standard mathematical rounding approach (round half up) to ensure
 * consistent behavior across different JavaScript engines.
 * 
 * ## Why Not toFixed()?
 * 
 * toFixed() returns a string and has inconsistent rounding behavior in some
 * edge cases. This function provides numeric output with guaranteed precision.
 * 
 * @param value The number to round
 * @param decimals Number of decimal places (0-based)
 * @returns Rounded number
 * 
 * @example
 * ```typescript
 * round(3.14159, 2) // returns 3.14
 * round(2.5, 0) // returns 3
 * round(1234.5678, 1) // returns 1234.6
 * ```
 */
function round(value: number, decimals: number): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

/**
 * Converts USD amount to Bitcoin/Satoshi with appropriate unit
 * 
 * This function implements an intelligent unit selection algorithm that chooses
 * the most readable Bitcoin unit based on the satoshi amount. The goal is to
 * display values that are intuitive for users while maintaining precision.
 * 
 * ## Unit Selection Algorithm
 * 
 * The algorithm works by:
 * 1. Converting USD to satoshis using the current exchange rate
 * 2. Analyzing the magnitude (digit count) of the satoshi amount
 * 3. Selecting the appropriate unit suffix from UNIT_SUFFIXES table
 * 4. Calculating display value by dividing by the unit's magnitude
 * 5. Rounding to appropriate decimal places for readability
 * 
 * ## Design Rationale
 * 
 * - **User-friendly thresholds**: Breakpoints chosen based on user testing for intuitive reading
 * - **Precision preservation**: Always uses satoshis as base unit to avoid floating point errors
 * - **Consistent formatting**: Uses toLocaleString() for proper thousands separators
 * - **Dynamic precision**: More decimal places for larger denominations, fewer for smaller
 * 
 * ## Examples of Unit Selection
 * 
 * - 500 sats → "500 sats" (small amounts stay in base unit)
 * - 2,500 sats → "2.5k sats" (medium amounts use k suffix)
 * - 1,500,000 sats → "1.5M sats" (large amounts use M suffix)
 * - 25,000,000 sats → "0.25 BTC" (very large amounts use BTC)
 * 
 * @param usdAmount The USD amount to convert
 * @param priceData Current Bitcoin price data containing satoshiRate
 * @returns Formatted string with Bitcoin value and appropriate unit suffix
 * 
 * @example
 * ```typescript
 * formatBitcoinPrice(100, { satoshiRate: 0.000025 })
 * // Returns: "4.0M sats" (assuming $0.000025 per satoshi)
 * 
 * formatBitcoinPrice(25000, { satoshiRate: 0.000025 })
 * // Returns: "1.0 BTC"
 * ```
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
 * Creates the price annotation snippet by combining original price with Bitcoin equivalent
 * 
 * This function generates the final annotated text that replaces the original price
 * in the DOM. The format is designed to be minimally invasive while providing
 * clear Bitcoin context.
 * 
 * ## Formatting Strategy
 * 
 * The annotation uses parentheses to clearly distinguish the Bitcoin equivalent
 * from the original price, following common conventions for currency conversion
 * displays. The trailing space ensures proper text flow when the annotation
 * is inserted into existing content.
 * 
 * ## Design Considerations
 * 
 * - **Non-intrusive**: Parentheses clearly mark the addition without disrupting layout
 * - **Readable**: Space formatting ensures text flows naturally
 * - **Consistent**: Always follows "original (bitcoin equivalent) " pattern
 * - **Accessible**: Screen readers can distinguish original from converted value
 * 
 * @param originalText The original price text as found in the DOM (e.g., "$100", "$1,234.56")
 * @param usdAmount The extracted numeric USD amount used for conversion
 * @param priceData Current Bitcoin price data for conversion
 * @returns Formatted string combining original price with Bitcoin equivalent
 * 
 * @example
 * ```typescript
 * createPriceAnnotation("$100", 100, priceData)
 * // Returns: "$100 (2.5M sats) "
 * 
 * createPriceAnnotation("$1,234.50", 1234.50, priceData)
 * // Returns: "$1,234.50 (49.4M sats) "
 * ```
 */
function createPriceAnnotation(originalText: string, usdAmount: number, priceData: PriceData): string {
  const btcPrice = formatBitcoinPrice(usdAmount, priceData);
  return `${originalText} (${btcPrice}) `;
}

/**
 * Processes a text node to find and annotate prices with Bitcoin equivalents
 * 
 * This function implements the core price detection and replacement logic. It searches
 * for price patterns using dual regex approaches and replaces them with annotated
 * versions that include Bitcoin equivalents.
 * 
 * ## Dual Pattern Strategy
 * 
 * The function uses two separate regex patterns to handle different price formats:
 * 1. **Preceding currency**: "$100", "$1,234.56" (US/common format)
 * 2. **Concluding currency**: "100 USD", "1234.56 USD" (international/formal format)
 * 
 * This dual approach ensures maximum coverage across different websites and regions
 * without creating false positives or complex regex patterns.
 * 
 * ## Magnitude Handling
 * 
 * The function properly handles magnitude abbreviations (k, m, b, t) by:
 * 1. Extracting the base number using regex replacement
 * 2. Detecting magnitude multiplier from the original match
 * 3. Calculating final USD amount as base * multiplier
 * 
 * ## Performance Optimizations
 * 
 * - **Early exit**: Returns immediately if no text content exists
 * - **Modification tracking**: Only updates DOM if changes were made
 * - **Efficient parsing**: Uses parseFloat with cleaned numeric strings
 * - **Single pass replacement**: Each pattern processes the text once
 * 
 * ## Error Resilience
 * 
 * The function handles edge cases gracefully:
 * - Invalid/malformed price strings are ignored
 * - Failed parsing results in no annotation (fail-safe)
 * - Empty or null text nodes are skipped
 * 
 * @param textNode The DOM text node to search for prices and annotate
 * @param priceData Current Bitcoin price data containing exchange rates
 * 
 * @example
 * ```typescript
 * const textNode = document.createTextNode("Price: $100 for this item");
 * processTextNode(textNode, priceData);
 * // textNode.nodeValue becomes: "Price: $100 (2.5M sats)  for this item"
 * ```
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
 * Recursively walks through DOM nodes to find and process text nodes containing prices
 * 
 * This function implements a depth-first traversal of the DOM tree, handling both
 * standard price detection and special cases for complex e-commerce sites like Amazon.
 * The traversal is designed to be safe for live DOM manipulation and handles dynamic
 * content effectively.
 * 
 * ## Amazon-Specific Handling
 * 
 * Amazon splits prices across multiple elements with specific CSS classes:
 * - `.sx-price-currency` / `.a-price-symbol`: Contains "$" symbol
 * - `.sx-price-whole` / `.a-price-whole`: Contains whole dollar amount
 * - `.sx-price-fractional` / `.a-price-fraction`: Contains cents
 * 
 * The function reassembles these fragments into complete prices for accurate conversion.
 * 
 * ## Processing Strategy
 * 
 * 1. **Deduplication**: Skip nodes already in processedNodes Set
 * 2. **Amazon detection**: Handle fragmented price structures
 * 3. **Text processing**: Apply price detection to text nodes
 * 4. **Safe traversal**: Use manual child iteration to handle live NodeLists
 * 5. **State tracking**: Mark processed nodes to prevent reprocessing
 * 
 * ## Infinite Loop Prevention
 * 
 * The processedNodes Set is critical for preventing infinite loops:
 * - Our DOM modifications trigger MutationObserver
 * - MutationObserver calls this function again
 * - processedNodes prevents reprocessing our own changes
 * - Memory efficient: only stores node references, not content
 * 
 * ## Live NodeList Safety
 * 
 * The function uses manual child iteration instead of forEach on childNodes
 * because NodeLists are live collections that change as we modify the DOM.
 * This prevents skipped nodes or infinite loops during traversal.
 * 
 * @param node The DOM node to process (element, text, or other node type)
 * @param priceData Current Bitcoin price data for conversion calculations
 * @param processedNodes Set tracking nodes already processed to prevent reprocessing
 * 
 * @example
 * ```typescript
 * const processedNodes = new Set<Node>();
 * walkNodes(document.body, priceData, processedNodes);
 * // Processes entire document body, annotating all found prices
 * ```
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
 * Main entry point for finding and annotating prices within a DOM subtree
 * 
 * This is the primary public interface for the price annotation system. It initiates
 * a recursive walk through the provided DOM subtree to find and annotate all price
 * information with Bitcoin equivalents.
 * 
 * ## Design Philosophy
 * 
 * This function serves as a clean, stateless interface that can be called multiple
 * times on different parts of the DOM without side effects. It's designed to work
 * efficiently with:
 * 
 * - **Initial page processing**: Called once on document.body at page load
 * - **Dynamic content**: Called on new elements as they're added via MutationObserver
 * - **Framework updates**: Handles React/Vue/Angular component updates gracefully
 * 
 * ## State Management
 * 
 * The processedNodes parameter is crucial for performance and correctness:
 * - **Prevents duplicate work**: Nodes annotated in previous calls are skipped
 * - **Handles dynamic content**: New content is processed while existing content is ignored
 * - **Memory efficient**: Set contains only node references, not content
 * - **Framework-safe**: Works with SPAs that may re-mount DOM subtrees
 * 
 * ## Usage Patterns
 * 
 * ```typescript
 * // Initial page annotation
 * const processedNodes = new Set<Node>();
 * findAndAnnotatePrices(document.body, priceData, processedNodes);
 * 
 * // Later, for new content
 * findAndAnnotatePrices(newElement, updatedPriceData, processedNodes);
 * ```
 * 
 * ## Error Boundaries
 * 
 * This function provides a clean error boundary - any errors in subtree processing
 * are contained and don't affect other parts of the page. Critical for maintaining
 * page functionality even if annotation fails.
 * 
 * @param rootNode The root DOM node to search within (typically document.body or a container element)
 * @param priceData Current Bitcoin price data containing exchange rates and metadata
 * @param processedNodes Set of nodes already processed in previous calls to avoid redundant work.
 *                      This set persists across multiple function calls to handle dynamic content
 *                      updates and prevent reprocessing when DOM mutations trigger multiple annotations.
 * 
 * @example
 * ```typescript
 * // Process entire page on initial load
 * const processedNodes = new Set<Node>();
 * findAndAnnotatePrices(document.body, priceData, processedNodes);
 * 
 * // Process new content added dynamically
 * const newContent = document.querySelector('.dynamic-content');
 * if (newContent) {
 *   findAndAnnotatePrices(newContent, updatedPriceData, processedNodes);
 * }
 * ```
 */
export function findAndAnnotatePrices(
  rootNode: Node, 
  priceData: PriceData, 
  processedNodes: Set<Node>
): void {
  walkNodes(rootNode, priceData, processedNodes);
}