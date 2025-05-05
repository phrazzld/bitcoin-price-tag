// Non-module content script that loads the real content module via an external file
// and provides a messaging bridge between page context and extension context
(async function() {
  /**
   * Helper function to diagnose module loading issues
   * @param {string} url - The URL that failed to load
   * @param {Object} contextState - The context state object
   * @returns {Promise<Object>} Diagnosis results
   */
  async function diagnoseModuleLoadingIssue(url, contextState) {
    const diagnosis = {
      url,
      timestamp: new Date().toISOString(),
      possibleIssues: [],
      contextInfo: contextState || {},
      recommendedAction: null
    };
    
    try {
      // Try to fetch the resource directly to see if it's accessible
      try {
        const response = await fetch(url, { method: 'HEAD' });
        diagnosis.resourceAccessible = response.ok;
        diagnosis.resourceStatus = response.status;
        
        if (!response.ok) {
          diagnosis.possibleIssues.push('resource_not_accessible');
          diagnosis.recommendedAction = 'check_web_accessible_resources';
        }
      } catch (fetchError) {
        diagnosis.resourceAccessible = false;
        diagnosis.fetchError = fetchError.message;
        diagnosis.possibleIssues.push('resource_fetch_error');
      }
      
      // Check for CSP issues
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (cspMeta) {
        const cspContent = cspMeta.getAttribute('content');
        diagnosis.hasCsp = true;
        diagnosis.cspContent = cspContent;
        
        // Look for script-src restrictions
        if (cspContent && cspContent.includes('script-src') && 
            (!cspContent.includes(new URL(url).origin) && 
             !cspContent.includes('*'))) {
          diagnosis.possibleIssues.push('csp_restriction');
          diagnosis.recommendedAction = 'modify_csp_or_use_alternative_approach';
        }
      }
      
      // Check for sandbox restrictions in iframes
      if (window !== window.top) {
        diagnosis.isIframe = true;
        
        try {
          if (window.frameElement && window.frameElement.hasAttribute('sandbox')) {
            const sandbox = window.frameElement.getAttribute('sandbox');
            diagnosis.isSandboxed = true;
            diagnosis.sandboxAttributes = sandbox;
            
            if (!sandbox.includes('allow-scripts')) {
              diagnosis.possibleIssues.push('sandbox_scripts_blocked');
              diagnosis.recommendedAction = 'cannot_load_in_sandbox';
            }
          }
        } catch (frameError) {
          diagnosis.crossOriginFrame = true;
          diagnosis.possibleIssues.push('cross_origin_isolation');
        }
      }
      
      // If no specific issues were found but loading still failed, add a generic issue
      if (diagnosis.possibleIssues.length === 0) {
        diagnosis.possibleIssues.push('unknown_module_loading_issue');
        diagnosis.recommendedAction = 'use_fallback_non_module_approach';
      }
      
      return diagnosis;
    } catch (error) {
      return {
        url,
        timestamp: new Date().toISOString(),
        error: error.message,
        possibleIssues: ['diagnosis_error'],
        recommendedAction: 'use_fallback_non_module_approach'
      };
    }
  }
  try {
    // Import conversion utilities to expose via bridge
    // Using an IIFE to scope the imports
    const conversionUtils = (() => {
      // Helper function to format satoshi values
      const valueFriendly = (fiatAmount, satPrice) => {
        if (!satPrice || satPrice <= 0) {
          return `(฿ N/A)`;
        }
        
        const sats = Math.floor(fiatAmount / satPrice);
        
        // Format based on size:
        // - Small values: show in sats
        // - Medium values: show in K sats
        // - Large values: show in BTC
        if (sats < 10000) {
          return `(${sats.toLocaleString()} sats)`;
        } else if (sats < 1000000) {
          return `(${(sats / 1000).toFixed(1)}k sats)`;
        } else if (sats < 100000000) {
          return `(${(sats / 1000000).toFixed(2)}M sats)`;
        } else {
          // Convert to BTC for large values
          const btc = sats / 100000000;
          if (btc < 10) {
            return `(฿${btc.toFixed(4)})`;
          } else {
            return `(฿${btc.toFixed(2)})`;
          }
        }
      };
      
      return {
        valueFriendly
      };
    })();
    
    // Import the callback utilities if available
    let safeCallbackUtils;
    try {
      // Try to dynamically import the callback utilities
      // This might fail in some environments due to CSP
      const callbackUtilsModule = await import('/callback-utils.js');
      safeCallbackUtils = callbackUtilsModule;
      console.debug('Bitcoin Price Tag: Successfully imported callback utilities');
    } catch (importError) {
      console.debug('Bitcoin Price Tag: Failed to import callback utilities', importError.message);
      // Create fallback utilities
      safeCallbackUtils = {
        // Simplified version of the utilities for environments where imports fail
        safeCallback: (callback, options = {}) => {
          const context = options.context || 'unknown';
          const silent = options.silent || false;
          const thisArg = options.thisArg;
          
          return function(...args) {
            if (typeof callback !== 'function') {
              if (!silent) {
                console.debug(`Bitcoin Price Tag: Non-function callback received (${typeof callback}) in ${context}`);
              }
              if ('fallback' in options) {
                return typeof options.fallback === 'function' 
                  ? options.fallback(...args) 
                  : options.fallback;
              }
              return undefined;
            }
            
            try {
              return thisArg ? callback.apply(thisArg, args) : callback(...args);
            } catch (error) {
              if (!silent) {
                console.debug(`Bitcoin Price Tag: Error in callback execution in ${context}:`, error.message);
              }
              if ('fallback' in options) {
                return typeof options.fallback === 'function' 
                  ? options.fallback(...args) 
                  : options.fallback;
              }
              return undefined;
            }
          };
        },
        
        safeExecute: (callback, args = [], options = {}) => {
          return safeCallbackUtils.safeCallback(callback, options)(...args);
        },
        
        safeChromeCallback: (callback, options = {}) => {
          const context = options.context || 'chrome_messaging';
          const fullOptions = { ...options, context };
          
          return function(response) {
            if (chrome?.runtime?.lastError) {
              console.debug('Bitcoin Price Tag: Chrome runtime error:', chrome.runtime.lastError.message);
              
              if (typeof callback === 'function') {
                try {
                  // Format a standardized error response
                  const errorResponse = {
                    status: 'error',
                    error: {
                      message: chrome.runtime.lastError.message,
                      type: 'runtime'
                    },
                    // Default fallback data
                    btcPrice: 50000,
                    satPrice: 0.0005,
                    timestamp: Date.now(),
                    source: 'runtime_error'
                  };
                  return callback(errorResponse);
                } catch (callbackError) {
                  console.debug('Bitcoin Price Tag: Error in chrome callback error handler:', callbackError.message);
                }
              }
              
              if ('fallback' in options) {
                return typeof options.fallback === 'function'
                  ? options.fallback(response)
                  : options.fallback;
              }
              
              return undefined;
            }
            
            // If no runtime error, proceed with normal safe callback execution
            return safeCallbackUtils.safeCallback(callback, fullOptions)(response);
          };
        }
      };
    }

    // Create a messaging bridge before loading the module
    // This will allow the module to communicate with the extension
    window.bitcoinPriceTagBridge = {
      // Bridge health status
      _bridgeStatus: {
        available: true,          // Overall availability
        chrome: true,             // Is Chrome object available
        runtime: true,            // Is runtime API available 
        sendMessage: true,        // Is sendMessage function available
        lastCheck: Date.now(),    // When bridge was last checked
        consecutiveErrors: 0,     // Count of consecutive errors
        maxErrors: 3,             // Max errors before degrading bridge
        lastError: null,          // Last error encountered
        healthCheckInterval: null // Reference to periodic health check
      },
      
      /**
       * Check the health and integrity of the messaging bridge
       * @returns {Object} Status of the bridge
       */
      checkBridgeHealth: () => {
        const status = window.bitcoinPriceTagBridge._bridgeStatus;
        status.lastCheck = Date.now();
        
        try {
          // Verify Chrome object exists
          status.chrome = typeof chrome !== 'undefined';
          
          // Verify runtime API exists
          status.runtime = status.chrome && typeof chrome.runtime !== 'undefined';
          
          // Verify sendMessage function exists and is callable
          status.sendMessage = status.runtime && 
                             typeof chrome.runtime.sendMessage === 'function';
                             
          // Verify extension context by trying to access runtime ID
          let runtimeAccessible = false;
          if (status.runtime) {
            try {
              // This will throw in some restricted contexts
              const extensionId = chrome.runtime.id;
              const extensionUrl = chrome.runtime.getURL('');
              runtimeAccessible = true;
            } catch (runtimeError) {
              console.debug('Bitcoin Price Tag: Runtime API exists but not fully accessible', {
                error: runtimeError.message
              });
              status.lastError = {
                type: 'runtime_access',
                message: runtimeError.message,
                timestamp: Date.now()
              };
              runtimeAccessible = false;
            }
          }
          
          // Overall availability requires all checks to pass
          status.available = status.sendMessage && runtimeAccessible;
          
          // Reset error count if bridge is healthy
          if (status.available) {
            status.consecutiveErrors = 0;
          }
          
          return {
            available: status.available,
            chrome: status.chrome,
            runtime: status.runtime,
            sendMessage: status.sendMessage,
            runtimeAccessible: runtimeAccessible,
            lastCheck: status.lastCheck
          };
        } catch (error) {
          // If checking itself fails, bridge is definitely not available
          status.available = false;
          status.lastError = {
            type: 'bridge_check_failure',
            message: error.message,
            timestamp: Date.now()
          };
          
          return {
            available: false,
            error: error.message,
            lastCheck: status.lastCheck
          };
        }
      },
      
      /**
       * Start periodic health check for the bridge
       * This ensures we detect when the bridge becomes unavailable
       */
      startHealthMonitoring: () => {
        // Clear any existing interval first
        if (window.bitcoinPriceTagBridge._bridgeStatus.healthCheckInterval) {
          clearInterval(window.bitcoinPriceTagBridge._bridgeStatus.healthCheckInterval);
        }
        
        // Initial check
        window.bitcoinPriceTagBridge.checkBridgeHealth();
        
        // Set up recurring checks every 30 seconds
        window.bitcoinPriceTagBridge._bridgeStatus.healthCheckInterval = setInterval(() => {
          window.bitcoinPriceTagBridge.checkBridgeHealth();
        }, 30000);
      },
      
      /**
       * Record a successful bridge operation
       */
      recordSuccess: () => {
        const status = window.bitcoinPriceTagBridge._bridgeStatus;
        status.consecutiveErrors = 0;
        status.available = true;
      },
      
      /**
       * Record a bridge operation failure
       * @param {Error|Object} error - The error that occurred
       */
      recordError: (error) => {
        const status = window.bitcoinPriceTagBridge._bridgeStatus;
        status.consecutiveErrors += 1;
        status.lastError = {
          type: error.type || 'unknown',
          message: error.message || String(error),
          timestamp: Date.now()
        };
        
        // If too many consecutive errors, mark bridge as degraded
        if (status.consecutiveErrors >= status.maxErrors) {
          status.available = false;
          console.warn('Bitcoin Price Tag: Bridge marked as unavailable after multiple failures', {
            consecutiveErrors: status.consecutiveErrors,
            lastError: status.lastError
          });
        }
      },
      
      /**
       * Safe callback executor that ensures callback is a function and handles exceptions
       * @param {Function|any} callback - The callback to safely execute
       * @param {Object} data - Data to pass to the callback
       * @param {string} context - Context for error logging
       */
      safeCallback: (callback, data, context = 'unknown') => {
        // Use the safeCuallbackUtils implementation if available
        // Otherwise, fall back to simplified implementation
        if (safeCallbackUtils && safeCallbackUtils.safeExecute) {
          return safeCallbackUtils.safeExecute(callback, [data], {
            context: context,
            silent: false
          });
        }
        
        // Fallback implementation when utility is not available
        if (typeof callback !== 'function') {
          console.debug(`Bitcoin Price Tag: Non-function callback detected in ${context}, using fallback`);
          return; // Just return without executing anything
        }
        
        try {
          callback(data);
        } catch (error) {
          console.debug(`Bitcoin Price Tag: Error executing callback in ${context}`, {
            error: error.message
          });
          // We don't throw errors from callbacks - just log and continue
        }
      },
      
      /**
       * Send a message to the background script with comprehensive error handling
       * @param {Object} message - The message to send
       * @param {Function|any} rawCallback - Callback that might not be a function
       */
      sendMessageToBackground: (message, rawCallback) => {
        // Initialize safe fallback data that's always available
        const fallbackData = {
          btcPrice: 50000,
          satPrice: 0.0005,
          timestamp: Date.now(),
          source: 'fallback'
        };
        
        // Create safe callback handler
        const safeCallback = (data) => {
          window.bitcoinPriceTagBridge.safeCallback(rawCallback, data, 'sendMessageToBackground');
        };
        
        try {
          // Check bridge health before attempting to use it
          const bridgeHealth = window.bitcoinPriceTagBridge.checkBridgeHealth();
          
          if (!bridgeHealth.available) {
            console.debug('Bitcoin Price Tag: Bridge not available, using fallback', bridgeHealth);
            // Create object without spread operator
            const responseObj = Object.assign({}, fallbackData, {
              status: 'error',
              error: { 
                message: 'Messaging bridge not available',
                type: 'bridge',
                details: bridgeHealth
              },
              source: 'bridge_unavailable'
            });
            safeCallback(responseObj);
            return;
          }
          
          // If we explicitly know chrome runtime is not available, use fallback
          if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
            console.debug('Bitcoin Price Tag: Chrome runtime not available, using fallback');
            // Create object without spread operator
            const responseObj = Object.assign({}, fallbackData, {
              status: 'error',
              error: { message: 'Chrome runtime not available', type: 'runtime' },
              source: 'chrome_unavailable'
            });
            safeCallback(responseObj);
            
            // Record error to potentially update bridge status
            window.bitcoinPriceTagBridge.recordError({
              type: 'runtime_missing',
              message: 'Chrome runtime API not available'
            });
            return;
          }
          
          console.debug('Bitcoin Price Tag: Sending message to background', {
            action: message && message.action ? message.action : 'unknown'
          });
          
          try {
            // Verify sendMessage is actually a function before using it
            if (typeof chrome.runtime.sendMessage !== 'function') {
              throw new Error('chrome.runtime.sendMessage is not a function');
            }
            
            // Send message with error handling using our utility
            chrome.runtime.sendMessage(
              message, 
              safeCallbackUtils.safeChromeCallback(
                function(response) {
                  // Handle missing/invalid response
                  if (!response) {
                    console.debug('Bitcoin Price Tag: No response from background');
                    // Create object without spread operator
                    const responseObj = Object.assign({}, fallbackData, {
                      status: 'error',
                      error: { message: 'No response from background script', type: 'runtime' },
                      source: 'empty_response'
                    });
                    safeCallback(responseObj);
                    
                    // Record error to potentially update bridge status
                    window.bitcoinPriceTagBridge.recordError({
                      type: 'empty_response',
                      message: 'No response from background script'
                    });
                    return;
                  }
                  
                  // Store price data if available - but do it safely
                  try {
                    if (response.btcPrice && message.action === 'getBitcoinPrice') {
                      window.bitcoinPriceTagBridge.priceDataInfo = {
                        btcPrice: response.btcPrice,
                        satPrice: response.satPrice || 0.0005,
                        timestamp: response.timestamp || Date.now(),
                        freshness: response.freshness || 'fresh',
                        fromCache: !!response.fromCache,
                        lastUpdated: Date.now()
                      };
                    }
                  } catch (cacheError) {
                    console.debug('Bitcoin Price Tag: Error caching price data', { error: cacheError.message });
                    // Continue despite cache error - non-critical
                  }
                  
                  // Record success to update bridge health status
                  window.bitcoinPriceTagBridge.recordSuccess();
                  
                  // Return response through safe callback
                  safeCallback(response);
                },
                {
                  context: 'bridge_sendMessageToBackground',
                  fallback: () => {
                    // Create object without spread operator for fallback response
                    const responseObj = Object.assign({}, fallbackData, {
                      status: 'error',
                      error: { message: 'Error in Chrome messaging callback', type: 'callback' },
                      source: 'callback_error'
                    });
                    safeCallback(responseObj);
                    
                    // Record error to potentially update bridge status
                    window.bitcoinPriceTagBridge.recordError({
                      type: 'callback_error',
                      message: 'Error in Chrome messaging callback'
                    });
                  }
                }
              )
            );
          } catch (runtimeError) {
            console.debug('Bitcoin Price Tag: Error sending message', {
              error: runtimeError.message
            });
            
            // Record error to potentially update bridge status
            window.bitcoinPriceTagBridge.recordError({
              type: 'runtime_error',
              message: runtimeError.message
            });
            
            // Create object without spread operator
            const responseObj = Object.assign({}, fallbackData, {
              status: 'error',
              error: { message: runtimeError.message, type: 'runtime' },
              source: 'message_error'
            });
            safeCallback(responseObj);
          }
        } catch (error) {
          console.debug('Bitcoin Price Tag: Bridge error', {
            error: error.message
          });
          
          // Record bridge error
          window.bitcoinPriceTagBridge.recordError({
            type: 'bridge_error',
            message: error.message
          });
          
          // Create object without spread operator
          const responseObj = Object.assign({}, fallbackData, {
            status: 'error',
            error: { message: error.message, type: 'bridge' },
            source: 'bridge_error'
          });
          safeCallback(responseObj);
        }
      },
      
      /**
       * Check if we're in a context where extension APIs are available
       * @returns {Object} State of the extension context
       */
      isExtensionContextAvailable: () => {
        const result = {
          available: false,
          mode: 'unknown',
          hasChrome: false,
          hasRuntime: false,
          hasSendMessage: false,
          hasStorage: false,
          isRestricted: false,
          restrictionReason: null,
          isAmazonFrame: false,
          isIframe: false,
          details: {}
        };
        
        try {
          // Basic Chrome API checks
          result.hasChrome = typeof chrome !== 'undefined';
          result.hasRuntime = result.hasChrome && typeof chrome.runtime !== 'undefined';
          result.hasSendMessage = result.hasRuntime && typeof chrome.runtime.sendMessage === 'function';
          result.hasStorage = result.hasChrome && typeof chrome.storage !== 'undefined';
          result.available = result.hasSendMessage;
          
          // Frame context checks
          result.isIframe = window !== window.top;
          result.details.isIframe = result.isIframe;
          
          // Try to actively use the Runtime API to verify it works
          // This is more reliable than just checking existence
          if (result.hasSendMessage) {
            try {
              // Try to get extension ID - this will throw in some restricted contexts
              result.details.extensionId = chrome.runtime.id;
              
              // Try to get URL from runtime - this will throw in some CSP-restricted contexts
              result.details.extensionUrl = chrome.runtime.getURL('');
              
              // These successful calls suggest the runtime API is actually usable
              result.details.runtimeAccessConfirmed = true;
            } catch (runtimeError) {
              // Runtime exists but is not fully functional
              result.details.runtimeError = runtimeError.message;
              result.available = false;
              result.isRestricted = true;
              result.restrictionReason = 'runtime_api_blocked';
            }
          }
          
          // Detect cross-origin iframe restrictions
          if (result.isIframe) {
            try {
              // Try to access the parent window's location
              const parentOrigin = window.parent.location.origin;
              const currentOrigin = window.location.origin;
              result.details.parentOrigin = parentOrigin;
              result.details.currentOrigin = currentOrigin;
              result.details.crossOrigin = parentOrigin !== currentOrigin;
              
              if (result.details.crossOrigin) {
                result.isRestricted = true;
                result.restrictionReason = result.restrictionReason || 'cross_origin';
              }
            } catch (originError) {
              // Cannot access parent origin - definitely restricted
              result.isRestricted = true;
              result.restrictionReason = result.restrictionReason || 'cross_origin_access_denied';
              result.details.originAccessError = originError.message;
            }
            
            // Check for CSP restrictions more thoroughly
            try {
              const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
              if (meta) {
                const cspContent = meta.getAttribute('content');
                result.details.cspContent = cspContent;
                
                // Check for script-src restrictions
                if (cspContent && cspContent.includes('script-src') && 
                    (!cspContent.includes('unsafe-inline') || !cspContent.includes('unsafe-eval'))) {
                  result.isRestricted = true;
                  result.restrictionReason = result.restrictionReason || 'csp_restrictions';
                }
              }
            } catch (cspError) {
              // Error checking CSP - note it but don't change restriction status
              result.details.cspCheckError = cspError.message;
            }
            
            // Check for sandbox restrictions if we can access frameElement
            try {
              if (window.frameElement && window.frameElement.hasAttribute('sandbox')) {
                const sandbox = window.frameElement.getAttribute('sandbox');
                result.details.sandboxed = true;
                result.details.sandboxAttributes = sandbox;
                
                const allowScripts = sandbox.includes('allow-scripts');
                const allowSameOrigin = sandbox.includes('allow-same-origin');
                
                result.details.allowScripts = allowScripts;
                result.details.allowSameOrigin = allowSameOrigin;
                
                if (!allowScripts || !allowSameOrigin) {
                  result.isRestricted = true;
                  result.restrictionReason = result.restrictionReason || 'sandbox_restrictions';
                }
              }
            } catch (sandboxError) {
              // Cannot access frameElement, which suggests we're cross-origin
              result.details.frameElementError = sandboxError.message;
            }
          }
          
          // Check specifically for Amazon frame context
          try {
            const hostname = window.location.hostname || '';
            const url = window.location.href || '';
            
            result.details.hostname = hostname;
            
            // Detect amazon domains - check for major international ones
            const amazonDomains = [
              'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 
              'amazon.it', 'amazon.es', 'amazon.ca', 'amazon.in', 
              'amazon.jp', 'amazon.cn', 'amazon.com.au', 'amazon.com.mx',
              'amzn', 'a2z', 'amazon-adsystem'
            ];
            
            const isAmazonDomain = amazonDomains.some(domain => hostname.includes(domain));
            result.details.isAmazonDomain = isAmazonDomain;
            
            // Check for Amazon-specific URL patterns
            const amazonUrlPatterns = [
              '/gp/product/', '/dp/', '/Amazon', '/amzn', 
              'advertising', 'adsystem', 'adserver'
            ];
            
            const hasAmazonUrlPattern = amazonUrlPatterns.some(pattern => url.includes(pattern));
            result.details.hasAmazonUrlPattern = hasAmazonUrlPattern;
            
            const isAmazon = isAmazonDomain || hasAmazonUrlPattern;
            
            // Only mark as Amazon frame if it's both Amazon and in an iframe
            result.isAmazonFrame = isAmazon && result.isIframe;
            
            // If it's an Amazon iframe, check for additional restriction indicators
            if (result.isAmazonFrame) {
              // Look for restricted URL patterns
              const restrictedUrlPatterns = [
                'adSystem', 'adsystem', 'adserver', 'advertising', 
                'creatives', 'widget', 'recommendations', '/recs/', 
                'iframe', 'sandbox', 'popover', 'modal', 'overlay'
              ];
              
              result.details.hasRestrictedUrlPattern = restrictedUrlPatterns.some(pattern => 
                url.toLowerCase().includes(pattern.toLowerCase())
              );
              
              if (result.details.hasRestrictedUrlPattern) {
                result.isRestricted = true;
                result.restrictionReason = result.restrictionReason || 'amazon_restricted_url';
              }
              
              // Check for restricted DOM classes
              if (document.body) {
                result.details.hasPopoverClass = document.body.classList.contains('ap_popover_content');
                result.details.hasOverlayClass = document.body.classList.contains('a-overlay') ||
                                               document.body.classList.contains('aok-overlay');
                result.details.hasModalClass = document.body.classList.contains('a-modal') ||
                                             document.body.classList.contains('a-popover');
                
                result.details.hasAdClass = !!document.querySelector('[id*="ad-"], [class*="ad-"], [id*="ads"], [class*="ads"]');
                
                if (result.details.hasPopoverClass || 
                    result.details.hasOverlayClass || 
                    result.details.hasModalClass || 
                    result.details.hasAdClass) {
                  result.isRestricted = true;
                  result.restrictionReason = result.restrictionReason || 'amazon_restricted_content';
                }
              }
              
              // Check frame size - Amazon ads are often in small iframes
              try {
                const smallFrameThreshold = 350; // pixels
                const width = window.innerWidth || document.documentElement.clientWidth;
                const height = window.innerHeight || document.documentElement.clientHeight;
                
                result.details.frameWidth = width;
                result.details.frameHeight = height;
                result.details.isSmallFrame = width < smallFrameThreshold || height < smallFrameThreshold;
                
                if (result.details.isSmallFrame) {
                  result.isRestricted = true;
                  result.restrictionReason = result.restrictionReason || 'amazon_small_frame';
                }
              } catch (sizeError) {
                // Ignore size errors
              }
            }
          } catch (amazonError) {
            // Error during Amazon detection - could indicate restrictions
            result.details.amazonDetectionError = amazonError.message;
          }
          
          // Set the mode based on all our checks
          if (result.isRestricted) {
            result.mode = 'restricted';
          } else if (result.available) {
            result.mode = 'full';
          } else if (result.hasChrome) {
            result.mode = 'partial';
          } else {
            result.mode = 'fallback';
          }
          
          // Log context detection at debug level
          console.debug('Bitcoin Price Tag: Context detection result', {
            available: result.available,
            mode: result.mode,
            isRestricted: result.isRestricted,
            restrictionReason: result.restrictionReason,
            isAmazonFrame: result.isAmazonFrame,
            isIframe: result.isIframe
          });
          
          return result;
        } catch (e) {
          // If our detection logic itself fails, assume a restricted context
          console.warn('Bitcoin Price Tag: Error in context detection, assuming restricted', e.message);
          return {
            available: false,
            mode: 'error',
            isRestricted: true,
            restrictionReason: 'detection_error',
            isIframe: window !== window.top,
            error: e.message
          };
        }
      },
      
      /**
       * Gets cached or emergency fallback price data
       * @returns {Object} Price data
       */
      getFallbackPriceData: () => {
        try {
          // Try to get data from priceDataInfo if already populated
          if (window.bitcoinPriceTagBridge.priceDataInfo && 
              window.bitcoinPriceTagBridge.priceDataInfo.btcPrice) {
            return {
              ...window.bitcoinPriceTagBridge.priceDataInfo,
              source: 'bridge_cache'
            };
          }
          
          // If nothing else is available, use emergency fallback
          return {
            btcPrice: 50000,
            satPrice: 0.0005,
            timestamp: Date.now(),
            freshness: 'stale',
            source: 'emergency_fallback',
            warning: 'Using estimated price - could not retrieve actual data'
          };
        } catch (e) {
          // Absolute last resort
          return {
            btcPrice: 50000,
            satPrice: 0.0005,
            timestamp: Date.now(),
            source: 'error_fallback'
          };
        }
      },
      
      // Conversion utilities for price formatting
      conversionUtils,
      
      // Price data information (populated when prices are fetched)
      priceDataInfo: {
        btcPrice: null,
        satPrice: null,
        timestamp: null,
        freshness: 'fresh',
        fromCache: false,
        lastUpdated: null
      }
    };
    
    try {
      // Perform detailed context detection before trying to load any module
      const contextState = window.bitcoinPriceTagBridge.isExtensionContextAvailable();
      
      // Set default logging based on environment
      if (contextState.isRestricted || contextState.isAmazonFrame) {
        // In restricted environments, set logging to minimal to avoid noise
        if (typeof configureLogging === 'function') {
          configureLogging({ minLevel: 'error', verbose: false });
        }
      }
      
      // Start bridge health monitoring
      window.bitcoinPriceTagBridge.startHealthMonitoring();
      
      // Log context information to help with debugging
      console.debug('Bitcoin Price Tag: Context detection results', {
        mode: contextState.mode,
        isRestricted: contextState.isRestricted,
        reason: contextState.restrictionReason,
        isAmazonFrame: contextState.isAmazonFrame
      });
      
      // If we're in a highly restricted context, exit very early to avoid any potential issues
      if (contextState.isRestricted && contextState.restrictionReason === 'sandbox_restrictions') {
        console.warn(`Bitcoin Price Tag: Exiting early due to sandbox restrictions`);
        return; // Exit early, don't load anything in sandbox-restricted frames
      }
      
      // For Amazon frames with specific restrictions, exit early unless we know it's safe
      if (contextState.isAmazonFrame && contextState.isRestricted) {
        console.warn(`Bitcoin Price Tag: Exiting early in restricted Amazon frame - ${contextState.restrictionReason}`);
        return; // Exit early in restricted Amazon frames 
      }
      
      // Define Node if it's not already defined to prevent reference errors
      if (typeof Node === 'undefined') {
        try {
          // Create a basic Node definition - just enough for type checking
          window.Node = {
            ELEMENT_NODE: 1,
            ATTRIBUTE_NODE: 2,
            TEXT_NODE: 3,
            CDATA_SECTION_NODE: 4,
            PROCESSING_INSTRUCTION_NODE: 7,
            COMMENT_NODE: 8,
            DOCUMENT_NODE: 9,
            DOCUMENT_TYPE_NODE: 10,
            DOCUMENT_FRAGMENT_NODE: 11
          };
          console.debug('Bitcoin Price Tag: Added Node polyfill for restricted environments');
        } catch (polyfillError) {
          console.warn('Bitcoin Price Tag: Unable to add Node polyfill', polyfillError.message);
        }
      }
      
      // Check if there's any risk of CSP issues or other restrictions
      const hasPotentialCSPIssues = contextState.isRestricted && 
                                  (contextState.restrictionReason === 'csp_restrictions' || 
                                   contextState.restrictionReason === 'runtime_api_blocked');
      
      // Load in appropriate mode based on environment
      if (contextState.available && !hasPotentialCSPIssues) {
        // Get extension URL for the bootstrap module
        try {
          const bootstrapUrl = chrome.runtime.getURL('bootstrap-module.js');
          console.debug('Bitcoin Price Tag: Loading bootstrap module from', bootstrapUrl);
          
          // Create the module script element referencing the external file
          const moduleScript = document.createElement('script');
          moduleScript.type = 'module';
          moduleScript.src = bootstrapUrl;
          
          // Add comprehensive error handling for the script
          moduleScript.onerror = (event) => {
            // Log detailed information about the error
            console.warn('Bitcoin Price Tag: Failed to load bootstrap module', {
              url: bootstrapUrl,
              error: event.type || 'unknown_error',
              errorDetails: event instanceof ErrorEvent ? event.message : 'no details available',
              timestamp: new Date().toISOString()
            });
            
            // Try to diagnose the issue
            diagnoseModuleLoadingIssue(bootstrapUrl, contextState).then(diagnosis => {
              console.debug('Bitcoin Price Tag: Module loading diagnosis', diagnosis);
              
              // Try to load via fallback method if initial load fails and not in restricted context
              if (!contextState.isRestricted) {
                console.debug('Bitcoin Price Tag: Attempting fallback module loading');
                loadFallbackModule();
              }
            });
          };
          
          // Add load event handling for better diagnostics
          moduleScript.onload = () => {
            console.debug('Bitcoin Price Tag: Bootstrap module loaded successfully', {
              url: bootstrapUrl,
              timestamp: new Date().toISOString()
            });
          };
          
          // Append to document to execute it - try documentElement if head isn't available
          try {
            (document.head || document.documentElement).appendChild(moduleScript);
            console.debug('Bitcoin Price Tag: Appended bootstrap module script to DOM');
          } catch (appendError) {
            console.error('Bitcoin Price Tag: Failed to append bootstrap module script', {
              error: appendError.message,
              url: bootstrapUrl
            });
            
            // If appending fails, try the fallback
            if (!contextState.isRestricted) {
              loadFallbackModule();
            }
          }
          
          console.debug('Bitcoin Price Tag loader executed in standard mode');
        } catch (runtimeError) {
          console.warn('Bitcoin Price Tag: Error accessing runtime API', runtimeError.message);
          
          // Only try fallback if not restricted
          if (!contextState.isRestricted) {
            loadFallbackModule();
          }
        }
      } else if (!contextState.isRestricted || contextState.mode === 'partial') {
        // In environments with limited extension API access but not fully restricted,
        // inject a simplified module without extension APIs
        console.debug('Bitcoin Price Tag: Running in fallback mode, using minimal module');
        loadFallbackModule();
      } else {
        // In fully restricted environments, log and exit
        console.warn(`Bitcoin Price Tag: Skipping module loading in restricted context - ${contextState.restrictionReason}`);
      }
      
      /**
       * Function to load fallback module for limited functionality environments
       * Enhanced with better error handling and diagnostic logging
       */
      function loadFallbackModule() {
        console.debug('Bitcoin Price Tag: Attempting to load fallback module');
        
        try {
          // First check if we're in a context where script injection might fail
          const isIframe = window !== window.top;
          const hasRestrictions = isIframe && (() => {
            try {
              // Try to access parent - will throw in cross-origin contexts
              const parent = window.parent.location.href;
              return false; // No restrictions detected
            } catch (e) {
              return true; // Restricted context
            }
          })();
          
          // If we're in a restricted iframe, don't even try to inject scripts
          if (hasRestrictions) {
            console.warn('Bitcoin Price Tag: Skipping fallback module in restricted iframe');
            return;
          }
          
          // Check if we can actually modify the DOM before proceeding
          if (!document || !document.head || !document.documentElement) {
            console.warn('Bitcoin Price Tag: Cannot inject fallback module - DOM unavailable');
            return;
          }
          
          // Check for CSP restrictions that might block script injection
          const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
          if (cspMeta) {
            const cspContent = cspMeta.getAttribute('content') || '';
            if (cspContent.includes('script-src') && !cspContent.includes('unsafe-inline')) {
              console.warn('Bitcoin Price Tag: CSP blocks inline scripts, trying non-inline approach');
              return tryNonInlineScriptInsertion();
            }
          }
          
          // Try to create the fallback script element
          let fallbackScript;
          try {
            fallbackScript = document.createElement('script');
          } catch (createElementError) {
            console.error('Bitcoin Price Tag: Failed to create script element', {
              error: createElementError.message,
              context: 'fallback_module'
            });
            return;
          }
          
          // Instead of using inline script content which violates CSP,
          // use an external script reference - this is more CSP-friendly
          try {
            // Get URL to our dedicated minified fallback module
            const fallbackUrl = chrome.runtime.getURL('minified-fallback.js');
            fallbackScript.src = fallbackUrl;
            fallbackScript.async = true;
            console.debug('Bitcoin Price Tag: Using CSP-friendly minimal fallback:', fallbackUrl);
          } catch (urlError) {
            console.error('Bitcoin Price Tag: Failed to get fallback script URL', {
              error: urlError.message
            });
            return false;
          }
          
          // Add error handling for the script element
          fallbackScript.onerror = (event) => {
            console.error('Bitcoin Price Tag: Fallback script load error', {
              error: event instanceof ErrorEvent ? event.message : 'unknown script error',
              type: event.type
            });
          };
          
          // Try to inject the fallback script
          try {
            (document.head || document.documentElement).appendChild(fallbackScript);
            console.debug('Bitcoin Price Tag: Fallback script injected successfully');
            return true;
          } catch (appendError) {
            console.error('Bitcoin Price Tag: Failed to append fallback script', {
              error: appendError.message
            });
            return false;
          }
        } catch (fallbackError) {
          console.error('Bitcoin Price Tag: Critical error in fallback module function', {
            error: fallbackError.message,
            stack: fallbackError.stack ? fallbackError.stack.split('\n')[0] : 'no stack available'
          });
          return false;
        }
      }
      
      /**
       * Alternative approach using external script for CSP-restricted environments
       */
      function tryNonInlineScriptInsertion() {
        try {
          // Use our dedicated minimal fallback script file that's CSP-friendly
          let scriptUrl;
          try {
            scriptUrl = chrome.runtime.getURL('minified-fallback.js');
            
            // Create the script element
            const scriptEl = document.createElement('script');
            scriptEl.src = scriptUrl;
            scriptEl.async = true;
            
            // Add error handling
            scriptEl.onerror = (event) => {
              console.error('Bitcoin Price Tag: Non-inline script load error', {
                error: event instanceof ErrorEvent ? event.message : 'unknown error',
                url: scriptUrl
              });
            };
            
            // Add load event for diagnostic purposes
            scriptEl.onload = () => {
              console.debug('Bitcoin Price Tag: Minified fallback loaded successfully', {
                url: scriptUrl,
                timestamp: new Date().toISOString()
              });
            };
            
            // Inject it
            (document.head || document.documentElement).appendChild(scriptEl);
            console.debug('Bitcoin Price Tag: CSP-friendly fallback approach used');
            return true;
          } catch (runtimeError) {
            console.error('Bitcoin Price Tag: Failed to get fallback script URL', {
              error: runtimeError.message
            });
            return false;
          }
        } catch (error) {
          console.error('Bitcoin Price Tag: Non-inline script insertion failed', {
            error: error.message
          });
          return false;
        }
      }
          
          // Note: The original fallback module implementation has been refactored and moved above.
      }
      
      // Listen for messages from the page context that need to access extension APIs
      window.addEventListener('message', (event) => {
        // Only accept messages from the same window
        if (event.source !== window) return;
        
        try {
          // Check if this is a message for our bridge
          if (event.data && event.data.type === 'BITCOIN_PRICE_TAG_BRIDGE_REQUEST') {
            const { id, action, data } = event.data;
            
            // Use safeCallback to handle responses
            const respondToPage = (response) => {
              try {
                window.postMessage({
                  type: 'BITCOIN_PRICE_TAG_BRIDGE_RESPONSE',
                  id,
                  response
                }, '*');
              } catch (e) {
                console.debug('Bitcoin Price Tag: Error sending response to page', e.message);
              }
            };
            
            // Handle different types of actions
            if (action === 'sendMessageToBackground' && contextState.available) {
              // Forward the message to background script
              window.bitcoinPriceTagBridge.sendMessageToBackground(data, respondToPage);
            } else {
              // Return fallback data for unavailable actions
              // Get fallback data
              const fallbackData = window.bitcoinPriceTagBridge.getFallbackPriceData();
              // Create object without spread operator
              const responseObj = Object.assign({}, fallbackData, {
                status: 'error',
                error: { message: 'Action not available in this context', type: 'context' }
              });
              respondToPage(responseObj);
            }
          }
        } catch (messageError) {
          console.debug('Bitcoin Price Tag: Error processing message', messageError.message);
        }
      });
    } catch (loaderError) {
      // Log detailed error information with minimal details to avoid console noise
      console.warn('Bitcoin Price Tag loader error:', loaderError.message);
    }
  } catch (rootError) {
    // Absolute last resort error handling
    console.warn('Bitcoin Price Tag: Critical initialization error', rootError.message);
  }
})();