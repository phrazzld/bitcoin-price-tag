// Global price variables
let btcPrice;
let satPrice;

// Constants for price conversion
const currencySection = "(\\$|USD)";
const thousandsSection = "(\\d|\\,)*";
const decimalSection = "(\\.\\d+)?";
const illions = "\\s?((t|b|m{1,2}|k)(r?illion|n)?(\\W|$))?";

const ONE_TRILLION = 1000000000000;
const ONE_BILLION = 1000000000;
const ONE_MILLION = 1000000;
const ONE_THOUSAND = 1000;

// Regular expression pattern builders
const buildPrecedingMatchPattern = () => {
  return new RegExp(
    currencySection + "\\x20?\\d" + thousandsSection + decimalSection + illions,
    "gi"
  );
};

// TODO: abstract regex from preceding match pattern and reuse here
const buildConcludingMatchPattern = () => {
  return new RegExp(
    "\\d" +
      thousandsSection +
      decimalSection +
      illions +
      "\\x20?" +
      currencySection,
    "gi"
  );
};

// Convert fiat amount to sats (satoshis)
const valueInSats = (fiatAmount) => {
  return parseFloat((fiatAmount / satPrice).toFixed(0)).toLocaleString();
};

// Convert fiat amount to BTC
const valueInBtc = (fiatAmount) => {
  return parseFloat((fiatAmount / btcPrice).toFixed(4)).toLocaleString();
};

// Build text element in the form of: original (conversion)
const makeSnippet = (sourceElement, fiatAmount) => {
  if (fiatAmount >= btcPrice) {
    return `${sourceElement} (${valueInBtc(fiatAmount)} BTC) `;
  } else {
    return `${sourceElement} (${valueInSats(fiatAmount)} sats) `;
  }
};

// Get multiplier for currency notation (k, m, b, t)
const getMultiplier = (e) => {
  let multiplier = 1;
  if (e.toLowerCase().indexOf("t") > -1) {
    multiplier = ONE_TRILLION;
  } else if (e.toLowerCase().indexOf("b") > -1) {
    multiplier = ONE_BILLION;
  } else if (e.toLowerCase().indexOf("m") > -1) {
    multiplier = ONE_MILLION;
  } else if (e.toLowerCase().indexOf("k") > -1) {
    multiplier = ONE_THOUSAND;
  }
  return multiplier;
};

// Convert prices in a text node
const convert = (textNode) => {
  let sourceMoney;
  // Currency indicator preceding amount
  let matchPattern = buildPrecedingMatchPattern();
  textNode.nodeValue = textNode.nodeValue.replace(matchPattern, function (e) {
    let multiplier = getMultiplier(e);
    sourceMoney = parseFloat(e.replace(/[^\d.]/g, "")).toFixed(2);
    return makeSnippet(e, sourceMoney * multiplier);
  });
  // Currency indicator concluding amount
  matchPattern = buildConcludingMatchPattern();
  textNode.nodeValue = textNode.nodeValue.replace(matchPattern, function (e) {
    let multiplier = getMultiplier(e);
    sourceMoney = parseFloat(e.replace(/[^\d.]/g, "")).toFixed(2);
    return makeSnippet(e, sourceMoney * multiplier);
  });
};

// Credit to t-j-crowder on StackOverflow for this walk function
// http://bit.ly/1o47R7V
const walk = (node) => {
  let child, next, price;

  switch (node.nodeType) {
    case 1: // Element
    case 9: // Document
    case 11: // Document fragment
      child = node.firstChild;
      while (child) {
        next = child.nextSibling;

        // Check if child is Amazon display price
        const classes = child.classList;
        if (
          classes &&
          ["sx-price-currency", "a-price-symbol"].includes(classes.value)
        ) {
          price = child.firstChild.nodeValue.toString();
          child.firstChild.nodeValue = null;
        } else if (
          classes &&
          ["sx-price-whole", "a-price-whole", "a-price-decimal"].includes(
            classes.value
          )
        ) {
          price +=
            child.firstChild.nodeValue.toString() +
            "." +
            next.firstChild.nodeValue.toString();
          child.firstChild.nodeValue = price;
          convert(child.firstChild);
          child = next;
        } else if (
          classes &&
          ["sx-price-fractional", "a-price-fraction"].includes(classes.value)
        ) {
          child.firstChild.nodeValue = null;
          price = null;
        }

        walk(child);
        child = next;
      }
      break;
    case 3: // Text node
      convert(node);
      break;
  }
};

// Function to request Bitcoin price from the service worker
const getBitcoinPrice = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getBitcoinPrice' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (!response) {
        reject(new Error('No price data available'));
      } else {
        resolve(response);
      }
    });
  });
};

// Process the page with Bitcoin price data
const processPage = (priceData) => {
  // Save BTC and sat prices to globals
  btcPrice = priceData.btcPrice;
  satPrice = priceData.satPrice;
  
  // Read the page and annotate prices with their equivalent bitcoin values
  walk(document.body);
};

// Initialize the extension by getting price and processing the page
const init = async () => {
  try {
    // Request Bitcoin price from service worker
    const priceData = await getBitcoinPrice();
    processPage(priceData);
  } catch (error) {
    console.error('Bitcoin Price Tag: Failed to get price data', error);
  }
};

// Run initialization after a short delay to ensure page is fully loaded
setTimeout(init, 2500);
