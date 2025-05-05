// Minified fallback module for CSP-restricted environments
(() => {
  console.debug('Bitcoin Price Tag: Minimal fallback module running');

  // Ensure Node is defined to prevent reference errors
  if (typeof Node === 'undefined') {
    try {
      window.Node = {
        ELEMENT_NODE: 1,
        ATTRIBUTE_NODE: 2,
        TEXT_NODE: 3,
        DOCUMENT_NODE: 9,
        DOCUMENT_FRAGMENT_NODE: 11,
      };
    } catch (nodePolyfillError) {
      console.warn('Bitcoin Price Tag: Unable to set Node polyfill', nodePolyfillError.message);
    }
  }

  // Create a global minimal implementation
  window.bitcoinPriceTagMinimal = {
    btcPrice: 50000,
    satPrice: 0.0005,

    init: function () {
      try {
        // Load price data from bridge if available
        if (
          typeof window.bitcoinPriceTagBridge !== 'undefined' &&
          typeof window.bitcoinPriceTagBridge.getFallbackPriceData === 'function'
        ) {
          try {
            const fallbackData = window.bitcoinPriceTagBridge.getFallbackPriceData();
            if (fallbackData && typeof fallbackData === 'object' && fallbackData.btcPrice) {
              this.btcPrice = fallbackData.btcPrice;
              this.satPrice = fallbackData.satPrice || 0.0005;
            }
          } catch (dataError) {
            console.debug('Bitcoin Price Tag: Error getting fallback data:', dataError.message);
          }
        }

        // Special case for iframes - don't process if not main frame
        if (window !== window.top) {
          console.debug('Bitcoin Price Tag: Skipping price processing in iframe');
          return;
        }

        // Check for potential CSP or other restrictions before attempting DOM operations
        const hasCSPMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (hasCSPMeta) {
          const cspContent = hasCSPMeta.getAttribute('content') || '';
          const hasScriptRestrictions =
            cspContent.includes('script-src') &&
            (!cspContent.includes('unsafe-inline') || !cspContent.includes('unsafe-eval'));

          if (hasScriptRestrictions) {
            console.debug('Bitcoin Price Tag: CSP restrictions detected, skipping DOM operations');
            return;
          }
        }

        console.debug('Bitcoin Price Tag: Fallback mode active with minimal functionality');
      } catch (initError) {
        console.debug('Bitcoin Price Tag: Fallback initialization error:', initError.message);
      }
    },
  };

  // Initialize
  try {
    window.bitcoinPriceTagMinimal.init();
    console.debug('Bitcoin Price Tag: Fallback module initialized successfully');
  } catch (e) {
    console.debug('Bitcoin Price Tag: Fallback module execution error:', e.message);
  }
})();
