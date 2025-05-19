/**
 * This file is from the Manifest V2 version of the extension (legacy).
 * 
 * The current extension uses Manifest V3 with TypeScript modules
 * located in src/content-script/.
 * 
 * This file is kept for reference but is not used in the current build.
 */

let btcPrice;
let satPrice;

const currencySection = "(\\$|USD)";
const thousandsSection = "(\\d|\\,)*";
const decimalSection = "(\\.\\d+)?";
const illions = "\\s?((t|b|m{1,2}|k)(r?illion|n)?(\\W|$))?";

const ONE_TRILLION = 1000000000000;
const ONE_BILLION = 1000000000;
const ONE_MILLION = 1000000;
const ONE_THOUSAND = 1000;

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

const valueInSats = (fiatAmount) => {
  return parseFloat((fiatAmount / satPrice).toFixed(0)).toLocaleString();
};

const valueInBtc = (fiatAmount) => {
  return parseFloat((fiatAmount / btcPrice).toFixed(4)).toLocaleString();
};

// [min magnitude, denominator magnitude, suffix]
const friendlySuffixes = [
  [0, 0, ' sats'],
  [4, 3, 'k sats'],
  [6, 6, 'M sats'],
  [8, 8, ' BTC'],
  [12, 11, 'k BTC'],
  [14, 14, 'M BTC'],
]

const valueInFriendlyUnits = (fiatAmount) => {
  const magnitude = Math.log10(fiatAmount / satPrice);
  let suffix = '';

  for (let i = friendlySuffixes.length - 1; i >= 0; i--) {
    const row = friendlySuffixes[i];
    if (magnitude >= row[0]) {
      suffix = row[2];
      const denomMag = row[1];
      if (denomMag === 8) {
        const value = fiatAmount / btcPrice;
        return value.toFixed(2).toLocaleString() + suffix;
      } else {
        const denom = Math.pow(10, denomMag);
        const value = fiatAmount / satPrice / denom;
        return value.toFixed(2).toLocaleString() + suffix;
      }
    }
  }
  return valueInSats(fiatAmount) + suffix;
}

const dollarAmount = (matchingText) => {
  let dollars = matchingText;
  dollars = dollars.replace(/\$/g, "");
  dollars = dollars.replace(/USD/gi, "");
  dollars = dollars.replace(/t(r?illion)?/gi, " trillion");
  dollars = dollars.replace(/b(n|illion)?/gi, " billion");
  dollars = dollars.replace(/m+n?/gi, " million");
  dollars = dollars.replace(/k(n)?/gi, " thousand");
  dollars = dollars.replace(/\s+/g, " ");
  dollars = dollars.trim();

  // Crude approach to ignoring simple year values like "2027"
  if (!dollars.includes(",") && !dollars.includes(" ") && !dollars.includes(".")
      && dollars.length == 4 && (dollars.startsWith("19") || dollars.startsWith("20"))) {
    return 0;
  }

  const sections = dollars.split(" ");
  if (sections.length == 2) {
    const illionsMapping = {
      trillion: ONE_TRILLION,
      billion: ONE_BILLION,
      million: ONE_MILLION,
      thousand: ONE_THOUSAND,
    };
    dollars = (
      parseFloat(sections[0].replace(",", "")) * illionsMapping[sections[1]]
    ).toString();
  }

  return parseFloat(dollars.replace(/,/g, ""));
};

const replacePrecedingMatches = (text) => {
  let replacedText = text;
  const matchPattern = buildPrecedingMatchPattern();
  const matches = text.match(matchPattern) || [];

  for (let match of matches) {
    let dollars = dollarAmount(match);
    // Skip text that just matches years
    if (dollars == 0) {
      continue;
    }
    if (dollars < 0.5) {
      replacedText = replacedText.replace(match, match + " (" + valueInSats(dollars) + " sats)");
    } else {
      replacedText = replacedText.replace(match, match + " (" + valueInFriendlyUnits(dollars) + ")");
    }
  }

  return replacedText;
};

const replaceConcludingMatches = (text) => {
  let replacedText = text;
  const matchPattern = buildConcludingMatchPattern();
  const matches = text.match(matchPattern) || [];

  for (let match of matches) {
    let dollars = dollarAmount(match);
    // Skip text that just matches years
    if (dollars == 0) {
      continue;
    }
    if (dollars < 0.5) {
      replacedText = replacedText.replace(match, match + " (" + valueInSats(dollars) + " sats)");
    } else {
      replacedText = replacedText.replace(match, match + " (" + valueInFriendlyUnits(dollars) + ")");
    }
  }

  return replacedText;
};

const convert = (node) => {
  let text = node.nodeValue;
  text = replacePrecedingMatches(text);
  text = replaceConcludingMatches(text);
  node.nodeValue = text;
};

const walk = (node) => {
  let child, next;

  switch (node.nodeType) {
    case 1: // Element node
    case 9: // Document node
    case 11: // Document fragment node
      // <hnilica> - The Amazon-specific hack is designed to avoid
      // mangling the price / text in Amazon's "Add to Cart" dialog.
      if (
        node.className &&
        (node.className.includes("a-fixed") ||
          node.className.includes("a-popover"))
      ) {
        break;
      }
      // </hnilica>
      child = node.firstChild;
      while (child) {
        next = child.nextSibling;
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
(window.setTimeout(() => {
  // LEGACY: This used the CoinDesk API directly
  // The current V3 extension uses CoinGecko API via service worker
  fetch("https://api.coindesk.com/v1/bpi/currentprice/USD.json")
    .then((response) => response.json())
    .then((data) => {
      // Save BTC and sat prices to globals
      btcPrice = parseFloat(data["bpi"]["USD"]["rate"].replace(",", ""));
      satPrice = btcPrice / 100000000;
      // Read the page and annotate prices with their equivalent bitcoin values
      walk(document.body);
    });
}, 2500))();