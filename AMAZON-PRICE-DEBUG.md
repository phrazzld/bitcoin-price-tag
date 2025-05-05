# Amazon Price Formatting Issue Investigation

## Problem Statement

The extension is improperly handling Amazon prices by:

1. Removing currency symbols
2. Removing decimal parts (cents)
3. Not properly converting prices to Bitcoin
4. Leaving malformed prices like "XX." (number followed by decimal with nothing after)

## Analysis of Current Implementation

### Amazon's Price Structure

Amazon structures prices into multiple components:

- Currency symbol (e.g., '$') in elements with class "sx-price-currency" or "a-price-symbol"
- Whole number part in elements with class "sx-price-whole" or "a-price-whole"
- Decimal point and fractional part in elements with class "sx-price-fraction" or "a-price-fraction"

### Current Processing Logic (in dom-scanner.js)

The current `processAmazonPrice` function:

```javascript
export function processAmazonPrice(node, next, btcPrice, satPrice) {
  let price = '';
  let nextNode = next;
  let processed = false;

  try {
    const classes = node.classList;
    if (!classes) return { processed, nextNode };

    if (
      ['sx-price-currency', 'a-price-symbol'].some((c) => classes.contains(c)) &&
      node.firstChild
    ) {
      // Price symbol node
      price = node.firstChild.nodeValue?.toString() || '';
      node.firstChild.nodeValue = null; // <-- ISSUE 1: Removes currency symbol
      processed = true;
    } else if (
      ['sx-price-whole', 'a-price-whole', 'a-price-decimal'].some((c) => classes.contains(c)) &&
      node.firstChild &&
      next?.firstChild
    ) {
      // Price whole part with decimal point
      price =
        (price || '') +
        (node.firstChild.nodeValue || '').toString() +
        '.' +
        (next.firstChild.nodeValue || '').toString();

      // Convert the combined price
      if (node.firstChild) {
        node.firstChild.nodeValue = price;
        convertPriceText(node.firstChild, btcPrice, satPrice);
        nextNode = next;
        processed = true;
      }
    } else if (
      ['sx-price-fractional', 'a-price-fraction'].some((c) => classes.contains(c)) &&
      node.firstChild
    ) {
      // Price fraction part - clear it as it's been processed with the whole part
      if (node.firstChild) {
        node.firstChild.nodeValue = null; // <-- ISSUE 2: Removes decimal part
      }
      price = null;
      processed = true;
    }
  } catch (e) {
    console.error('Error processing Amazon price element:', e);
  }

  return {
    processed,
    nextNode,
    price,
  };
}
```

### Key Issues Identified

1. **Currency Symbol Removal**:

   - Line `node.firstChild.nodeValue = null;` removes the currency symbol
   - No replacement with Bitcoin symbol occurs here

2. **Decimal Part Removal**:

   - Line `node.firstChild.nodeValue = null;` in the fraction part section
   - Removes cents without proper handling

3. **Incomplete Conversion**:

   - The function combines parts but doesn't properly reconstruct the full price
   - `convertPriceText` is called on an already manipulated DOM node

4. **DOM Structure Dependence**:
   - The function assumes specific DOM structure that may not always be present
   - If elements aren't in the expected order, processing breaks

## Problematic Processing Flow

1. DOM traversal encounters an Amazon price symbol → Removes it
2. DOM traversal encounters the whole number part → Sets it to "X."
3. DOM traversal encounters the fraction part → Removes it
4. Result: Only a malformed "X." remains without Bitcoin conversion

## Potential Solutions

### Approach 1: Preserve Original Content During Processing

Instead of modifying nodes directly:

1. Collect all components of a price
2. Construct a complete combined price string with the Bitcoin equivalent
3. Replace the entire price structure at once

### Approach 2: DOM Element Replacement

1. Identify the parent element containing all price components
2. Create a new DOM element with the properly formatted price and Bitcoin conversion
3. Replace the entire price component structure with this new element

### Approach 3: Modify the Current Approach

1. Keep the currency symbol in place
2. Ensure the decimal part remains in place
3. Add Bitcoin conversion alongside the original, complete price

## Implementation Plan

The most direct fix appears to be modifying the current approach. We should:

1. Refactor `processAmazonPrice` to:

   - Not nullify the currency symbol and decimal parts
   - Construct a complete price string including all components
   - Apply the Bitcoin conversion to the complete price

2. Consider a more holistic approach to Amazon price handling:
   - Identify the common parent element of price components
   - Process the entire price structure as a unit
   - Ensure proper formatting of both original and Bitcoin prices

## Next Steps

1. Modify `processAmazonPrice` function implementation
2. Test with a variety of Amazon price formats
3. Ensure both original price formatting and Bitcoin conversion appears correctly
