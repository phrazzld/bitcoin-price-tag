/**
 * Browser detection and compatibility utility for Bitcoin Price Tag
 */

/**
 * Detects the current browser type and version
 * @returns {Object} Browser information
 */
export function detectBrowser() {
  const userAgent = navigator.userAgent;
  let browserName;
  let browserVersion;
  
  // Detect Chrome
  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = 'chrome';
  } 
  // Detect Firefox
  else if (userAgent.match(/firefox|fxios/i)) {
    browserName = 'firefox';
  }
  // Detect Safari
  else if (userAgent.match(/safari/i)) {
    browserName = 'safari';
  }
  // Detect Edge
  else if (userAgent.match(/edg/i)) {
    browserName = 'edge';
  }
  // Detect Opera
  else if (userAgent.match(/opr\//i)) {
    browserName = 'opera';
  }
  // Default to unknown
  else {
    browserName = 'unknown';
  }
  
  // Extract version (implementation varies by browser)
  const versionMatch = userAgent.match(/(chrome|firefox|safari|opr|edge|edg|msie)\/(\d+(\.\d+)?)/i);
  browserVersion = versionMatch ? versionMatch[2] : 'unknown';
  
  return {
    name: browserName,
    version: browserVersion,
    userAgent: userAgent,
    isChrome: browserName === 'chrome',
    isFirefox: browserName === 'firefox',
    isSafari: browserName === 'safari',
    isEdge: browserName === 'edge',
    isOpera: browserName === 'opera'
  };
}

/**
 * Checks if the current browser supports the features we need
 * @returns {Object} Feature support information
 */
export function checkFeatureSupport() {
  const features = {
    // Basic features
    storageAPI: typeof chrome !== 'undefined' && !!chrome.storage,
    runtimeAPI: typeof chrome !== 'undefined' && !!chrome.runtime,
    
    // DOM APIs
    mutationObserver: typeof MutationObserver !== 'undefined',
    documentFragment: typeof DocumentFragment !== 'undefined',
    querySelectorAll: typeof document.querySelectorAll === 'function',
    
    // ES6+ features
    promiseSupport: typeof Promise !== 'undefined',
    asyncAwaitSupport: (function() {
      try {
        eval('async function test() {}');
        return true;
      } catch (e) {
        return false;
      }
    })(),
    
    // API access
    fetchSupport: typeof fetch !== 'undefined',
    
    // Overall support status
    isSupported: true // Will be updated based on required features
  };
  
  // Check essential features that are required
  features.isSupported = (
    features.storageAPI &&
    features.runtimeAPI &&
    features.mutationObserver &&
    features.querySelectorAll &&
    features.promiseSupport
  );
  
  return features;
}

/**
 * Adapts the extension behavior based on browser capabilities
 * @returns {Object} Browser adaptation strategies
 */
export function getBrowserAdaptations() {
  const browser = detectBrowser();
  const features = checkFeatureSupport();
  
  // Default adaptations
  const adaptations = {
    usePolyfills: !features.isSupported,
    textPropertyToUse: 'textContent', // textContent or innerText
    observerConfig: {
      childList: true,
      subtree: true
    }
  };
  
  // Firefox-specific adaptations
  if (browser.isFirefox) {
    // Firefox handles MutationObserver slightly differently
    adaptations.observerConfig.characterData = true;
  }
  
  // Safari-specific adaptations
  if (browser.isSafari) {
    // Safari may require different text handling
    adaptations.textPropertyToUse = 'innerText';
  }
  
  return adaptations;
}

/**
 * Applies polyfills for unsupported browser features
 * Only called if needed based on feature detection
 */
export function applyPolyfills() {
  const features = checkFeatureSupport();
  
  // Only apply polyfills if needed
  if (features.isSupported) return;
  
  // Polyfill for chrome.storage if needed
  if (!features.storageAPI && typeof chrome !== 'undefined') {
    chrome.storage = {
      local: {
        get: (key, callback) => {
          const data = localStorage.getItem(key);
          // Add type check for the callback
          if (typeof callback === 'function') {
            callback(data ? JSON.parse(data) : {});
          } else {
            console.error('Bitcoin Price Tag: Non-function callback provided to chrome.storage.local.get polyfill');
          }
        },
        set: (data, callback) => {
          Object.keys(data).forEach(key => {
            localStorage.setItem(key, JSON.stringify(data[key]));
          });
          // Add type check for the callback
          if (callback && typeof callback === 'function') {
            callback();
          } else if (callback !== undefined) {
            console.error('Bitcoin Price Tag: Non-function callback provided to chrome.storage.local.set polyfill');
          }
        }
      }
    };
  }
  
  // Polyfill for MutationObserver
  if (!features.mutationObserver) {
    // Simple polling-based fallback for MutationObserver
    window.MutationObserver = class MutationObserverPolyfill {
      constructor(callback) {
        this.callback = callback;
        this.observed = [];
        this.intervalId = null;
      }
      
      observe(target, config) {
        this.observed.push({ target, config, innerHTML: target.innerHTML });
        
        if (!this.intervalId) {
          this.intervalId = setInterval(() => {
            this.checkForChanges();
          }, 1000); // Poll every second
        }
      }
      
      checkForChanges() {
        for (const item of this.observed) {
          if (item.target.innerHTML !== item.innerHTML) {
            item.innerHTML = item.target.innerHTML;
            this.callback([{
              type: 'childList',
              target: item.target,
              addedNodes: [],
              removedNodes: []
            }]);
          }
        }
      }
      
      disconnect() {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        this.observed = [];
      }
    };
  }
}