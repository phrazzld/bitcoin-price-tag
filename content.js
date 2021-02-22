chrome.storage.sync.get(null, () => {
  console.group("chrome.storage.sync.get ...");
  console.log(
    "Can I just run `walk` outside this block since I'm not using localStorage?"
  );
  console.groupEnd();
  // TODO: Get exchange rate on pageload
  //       set global reference
  walk(document.body);
});

// Credit to t-j-crowder on StackOverflow for this walk function
// http://bit.ly/1o47R7V
const walk = node => {
  console.group("walk");
  console.log("node:", node);
  console.groupEnd();
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

const buildThousandsString = () => {
  console.log("buildThousandsString, probably just nuke this function");
  return "\\,";
};

const buildDecimalString = () => {
  console.log("buildDecimalString, probably just nuke this function");
  return "\\.";
};

const buildPrecedingMatchPattern = (
  currencySymbol,
  currencyCode,
  thousandsString,
  decimalString
) => {
  console.group("buildPrecedingMatchPattern");
  console.log("currencySymbol:", currencySymbol);
  console.log("currencyCode:", currencyCode);
  console.log("thousandsString:", thousandsString);
  console.log("decimalString:", decimalString);
  console.groupEnd();
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
  console.group("buildConcludingMatchPattern");
  console.log("currencySymbol:", currencySymbol);
  console.log("currencyCode:", currencyCode);
  console.log("thousandsString:", thousandsString);
  console.log("decimalString:", decimalString);
  console.groupEnd();
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

const convert = textNode => {
  console.group("convert");
  console.log("textNode:", textNode);
  console.groupEnd();
  const currencySymbol = "$";
  const currencyCode = "USD";
  const thousandsString = buildThousandsString();
  const thousands = new RegExp(thousandsString, "g");
  const decimalString = buildDecimalString();
  const decimal = new RegExp(decimalString, "g");
  // Currency indicator preceding amount
  const matchPattern = buildPrecedingMatchPattern(
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
    workingWage = buildWorkingWage(frequency, amount);
    return makeSnippet(e, sourceMoney, workingWage);
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

// TODO: Get exchange rate on pageload
//       set global reference
//       use here for conversion
const valueInSats = fiatAmount => {
  console.group("valueInSats");
  console.log("fiatAmount", fiatAmount);
  console.groupEnd();
  return fiatAmount;
};

// Build text element in the form of: original (conversion)
const makeSnippet = (sourceElement, fiatAmount) => {
  console.group("makeSnippet");
  console.log("sourceElement:", sourceElement);
  console.log("fiatAmount:", fiatAmount);
  console.groupEnd();
  return `${sourceElement} (${valueInSats(fiatAmount)} sats)`;
};
