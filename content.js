let btcPrice;
let satPrice;

const currencySection = "(\\$|USD)";
const thousandsSection = "(\\d|\\,)*";
const decimalSection = "(\\.\\d+)?";
const illions = "\\s?((t|b|m{1,2}|k)(r?illion|n)?(\\W|$))?";

const buildPrecedingMatchPattern = () => {
  return new RegExp(
    currencySection + "\\x20?\\d" + thousandsSection + decimalSection + illions,
    "gi"
  );
};

// TODO: abstract regex from preceding match pattern and reuse here
const buildConcludingMatchPattern = () => {
  return new RegExp(
    currencySection +
      "?\\x20?\\d" +
      thousandsSection +
      decimalSection +
      illions +
      "\\x20?" +
      currencySection,
    "gi"
  );
};

const valueInSats = (fiatAmount) => {
  return parseFloat((fiatAmount / satPrice).toFixed(0)).toLocaleString();
};

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

const convert = (textNode) => {
  let sourceMoney;
  // Currency indicator preceding amount
  let matchPattern = buildPrecedingMatchPattern();
  textNode.nodeValue = textNode.nodeValue.replace(matchPattern, function (e) {
    let multiplier = 1;
    if (e.toLowerCase().indexOf("t") > -1) {
      multiplier = 1000000000000;
    } else if (e.toLowerCase().indexOf("b") > -1) {
      multiplier = 1000000000;
    } else if (e.toLowerCase().indexOf("m") > -1) {
      multiplier = 1000000;
    } else if (e.toLowerCase().indexOf("k") > -1) {
      multiplier = 1000;
    }
    sourceMoney = parseFloat(e.replace(/[^\d.]/g, "")).toFixed(2);
    return makeSnippet(e, sourceMoney * multiplier);
  });
  // Currency indicator concluding amount
  matchPattern = buildConcludingMatchPattern();
  textNode.nodeValue = textNode.nodeValue.replace(matchPattern, function (e) {
    sourceMoney = parseFloat(e.replace(/[^\d.]/g, "")).toFixed(2);
    return makeSnippet(e, sourceMoney);
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

// Run on page load
(() => {
  // Get current price of bitcoin in USD
  fetch("https://api.coindesk.com/v1/bpi/currentprice/USD.json")
    .then((response) => response.json())
    .then((data) => {
      // Save BTC and sat prices to globals
      btcPrice = parseFloat(data["bpi"]["USD"]["rate"].replace(",", ""));
      satPrice = btcPrice / 100000000;
      // Read the page and annotate prices with their equivalent bitcoin values
      walk(document.body);
    });
})();
