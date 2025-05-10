### Technical Overview of `/Users/phaedrus/Development/bitcoin-price-tag/test/fixtures`

**Purpose:**

The `/Users/phaedrus/Development/bitcoin-price-tag/test/fixtures` directory serves as a repository for HTML files. These files are designed to simulate different Amazon web pages, specifically product pages, search result pages, and shopping cart pages. They are intended to be used as static data for testing purposes within the `bitcoin-price-tag` project. The primary goal is to provide consistent and predictable inputs for unit or integration tests, allowing developers to verify the functionality of code that interacts with and extracts data from Amazon's website.

**Architecture:**

The directory contains a flat structure of HTML files, each representing a different Amazon page scenario. Each file is self-contained and does not rely on external resources beyond the basic HTML structure and inline CSS styling. The HTML is simplified to focus on elements relevant to price extraction, such as product titles, price displays, and shopping cart subtotals. The use of simple, semantic HTML and CSS selectors like `.a-price`, `.sc-item`, and IDs like `dp` and `search` suggests a focus on mimicking the structure and class naming conventions commonly found on Amazon pages.

**Key File Roles:**

- **`amazon-cart.html`:** Simulates an Amazon shopping cart page. It contains multiple items with prices and a subtotal section. The primary purpose is likely to test the extraction of multiple prices and the calculation of the total cart value. Relevant HTML elements include `sc-item`, `sc-price`, and `sc-subtotal`.
- **`amazon-iframe.html`:** This file simulates a web page containing iframes, some of which may contain price information. It includes a standard iframe, a sandboxed iframe (with scripting enabled), and a placeholder for a cross-origin iframe. This is likely used to test the ability of the price extraction logic to handle content within iframes, including those with security restrictions. Pay attention to the `id` and `sandbox` attributes of the `iframe` tags.
- **`amazon-product.html`:** Represents a typical Amazon product detail page. It includes the product title, price, and potentially discounted prices. The file is intended to test the extraction of the main product price and potentially the original price before a discount. Key HTML elements include `dp`, `ppd`, `a-price`, and `title`.
- **`amazon-search.html`:** Simulates Amazon search results. It contains multiple product listings with prices. The purpose is to test the extraction of prices from a list of search results. Key elements are `s-result-item` and `a-price`.

**Dependencies and Gotchas:**

- **Dependency on HTML Structure:** The effectiveness of these fixtures relies heavily on the stability of Amazon's HTML structure and class naming conventions. Changes to Amazon's website may render these fixtures obsolete and require updates.
- **Simplified Representation:** The HTML files are simplified representations of actual Amazon pages. They may not include all the complexities and variations found in the real world, which could lead to incomplete test coverage.
- **Dynamic Content:** The fixtures are static HTML files. They do not represent dynamic content loaded via JavaScript, which is common on modern websites. This means that any price information loaded dynamically will not be captured by these fixtures.
- **Iframe Restrictions:** The sandboxed iframe in `amazon-iframe.html` attempts to simulate security restrictions that might be encountered when dealing with cross-origin iframes. However, the effectiveness of these simulated restrictions depends on the browser's implementation of the `sandbox` attribute. The "Cross-origin iframe placeholder" is just that, a placeholder, and doesn't actually load a cross-origin resource.
