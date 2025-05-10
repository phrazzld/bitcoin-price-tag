# Content Script Structure

This file documents the basic structure of the content script for easier understanding and maintenance.

```javascript
(async function () {
  try {
    // Outer try (line 4)
    // Function definitions and other code

    try {
      // Inner try (around line 865+)
      // Perform detailed context detection
      // More code

      // Listen for messages...
      window.addEventListener('message', (event) => {
        // Event handler code
      });
    } catch (loaderError) {
      // Catch for inner try
      console.warn('Bitcoin Price Tag loader error:', loaderError.message);
    }
  } catch (outerError) {
    // Catch for outer try
    console.error('Bitcoin Price Tag: Fatal error in initialization', outerError.message);
  }
})();
```

The content script uses a double-try pattern to ensure errors are properly caught at different levels:

1. The outer try-catch handles fatal errors in initialization
2. The inner try-catch handles non-fatal loader errors

This structure provides robust error handling to prevent the extension from crashing the page.
