let btcPrice;
let satPrice;

const buildThousandsString = () => {
  return "\\,";
};

const buildDecimalString = () => {
  return "\\.";
};

const buildPrecedingMatchPattern = (
  currencySymbol,
  currencyCode,
  thousandsString,
  decimalString
) => {
  return new RegExp(
    "(\\" +
      currencySymbol +
      "|" +
      currencyCode +
      ")\\x20?\\d(\\d|" +
      thousandsString +
      ")*(" +
      decimalString +
      "\\d\\d)?",
    "g"
  );
};

const buildConcludingMatchPattern = (
  currencySymbol,
  currencyCode,
  thousandsString,
  decimalString
) => {
  return new RegExp(
    "\\d(\\d|" +
      thousandsString +
      ")*(" +
      decimalString +
      "\\d\\d)?\\x20?(\\" +
      currencySymbol +
      "|" +
      currencyCode +
      ")",
    "g"
  );
};

const valueInSats = fiatAmount => {
  return (fiatAmount / satPrice).toFixed(0).toString();
};

const valueInBtc = fiatAmount => {
  return (fiatAmount / btcPrice).toFixed(4).toString();
};

// Build text element in the form of: original (conversion)
const makeSnippet = (sourceElement, fiatAmount) => {
  if (fiatAmount >= btcPrice) {
    return `${sourceElement} (${valueInBtc(fiatAmount)} BTC)`;
  } else {
    return `${sourceElement} (${valueInSats(fiatAmount)} sats)`;
  }
};

const convert = textNode => {
  let sourceMoney;
  const currencySymbol = "$";
  const currencyCode = "USD";
  const thousandsString = buildThousandsString();
  const thousands = new RegExp(thousandsString, "g");
  const decimalString = buildDecimalString();
  const decimal = new RegExp(decimalString, "g");
  // Currency indicator preceding amount
  let matchPattern = buildPrecedingMatchPattern(
    currencySymbol,
    currencyCode,
    thousandsString,
    decimalString
  );
  textNode.nodeValue = textNode.nodeValue.replace(matchPattern, function(e) {
    sourceMoney = e
      .replace(thousands, "@")
      .replace(decimal, "~")
      .replace("~", ".")
      .replace("@", "");
    sourceMoney = parseFloat(sourceMoney.replace(/[^\d.]/g, "")).toFixed(2);
    return makeSnippet(e, sourceMoney);
  });
  // Currency indicator concluding amount
  matchPattern = buildConcludingMatchPattern(
    currencySymbol,
    currencyCode,
    thousandsString,
    decimalString
  );
  textNode.nodeValue = textNode.nodeValue.replace(matchPattern, function(e) {
    sourceMoney = e
      .replace(thousands, "@")
      .replace(decimal, "~")
      .replace("~", ".")
      .replace("@", "");
    sourceMoney = parseFloat(sourceMoney.replace(/[^\d.]/g, "")).toFixed(2);
    return makeSnippet(e, sourceMoney);
  });
};

// Credit to t-j-crowder on StackOverflow for this walk function
// http://bit.ly/1o47R7V
const walk = node => {
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
        if (classes && classes.value === "sx-price-currency") {
          price = child.firstChild.nodeValue.toString();
          child.firstChild.nodeValue = null;
        } else if (classes && classes.value === "sx-price-whole") {
          price += child.firstChild.nodeValue.toString();
          child.firstChild.nodeValue = price;
          convert(child.firstChild);
          child = next;
        } else if (classes && classes.value === "sx-price-fractional") {
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

// TODO: Get exchange rate on pageload
//       set global reference

(() => {
  fetch("https://api.coindesk.com/v1/bpi/currentprice/USD.json")
    .then(response => response.json())
    .then(data => {
      btcPrice = parseFloat(data["bpi"]["USD"]["rate"].replace(",", ""));
      satPrice = btcPrice / 100000000;
      walk(document.body);
    });
})();
