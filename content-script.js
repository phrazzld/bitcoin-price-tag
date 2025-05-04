// Non-module content script that loads the real content module via an external file
// and provides a messaging bridge between page context and extension context
(async function() {
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
    
    // Create a messaging bridge before loading the module
    // This will allow the module to communicate with the extension
    window.bitcoinPriceTagBridge = {
      // Method to send messages to the background script
      /**
       * Safe callback executor that ensures callback is a function and handles exceptions
       * @param {Function|any} callback - The callback to safely execute
       * @param {Object} data - Data to pass to the callback
       * @param {string} context - Context for error logging
       */
      safeCallback: (callback, data, context = 'unknown') => {
        // Safety check and standardization for all callback executions
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
       * Send a message to the background script with enhanced error handling
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
          // Check if chrome runtime is available
          if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
            console.debug('Bitcoin Price Tag: Chrome runtime not available, using fallback');
            // Create object without spread operator
            const responseObj = Object.assign({}, fallbackData, {
              status: 'error',
              error: { message: 'Chrome runtime not available', type: 'runtime' },
              source: 'chrome_unavailable'
            });
            safeCallback(responseObj);
            return;
          }
          
          console.debug('Bitcoin Price Tag: Sending message to background', {
            action: message && message.action ? message.action : 'unknown'
          });
          
          try {
            // Send message with error handling
            chrome.runtime.sendMessage(message, function(response) {
              // Handle runtime errors first
              if (chrome.runtime.lastError) {
                console.debug('Bitcoin Price Tag: Chrome runtime error', {
                  error: chrome.runtime.lastError.message
                });
                
                // Create object without spread operator
                const responseObj = Object.assign({}, fallbackData, {
                  status: 'error',
                  error: { message: chrome.runtime.lastError.message, type: 'runtime' },
                  source: 'runtime_error'
                });
                safeCallback(responseObj);
                return;
              }
              
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
              
              // Return response through safe callback
              safeCallback(response);
            });
          } catch (runtimeError) {
            console.debug('Bitcoin Price Tag: Error sending message', {
              error: runtimeError.message
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
          
          // Add error handling for the script
          moduleScript.onerror = (event) => {
            console.warn('Bitcoin Price Tag: Failed to load bootstrap module', {
              url: bootstrapUrl,
              error: event.type || 'unknown_error'
            });
            
            // Try to load via fallback method if initial load fails
            if (!contextState.isRestricted) {
              loadFallbackModule();
            }
          };
          
          // Append to document to execute it
          (document.head || document.documentElement).appendChild(moduleScript);
          
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
      
      // Function to load fallback module for limited functionality environments
      function loadFallbackModule() {
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
          
          // Simple inline module for environments with limited extension API access
          const fallbackScript = document.createElement('script');
          fallbackScript.textContent = `
            // Bitcoin Price Tag fallback module
            console.debug('Bitcoin Price Tag: Running fallback module with limited functionality');
            
            // Use a very minimal implementation with no DOM manipulation
            const minimalBitcoinTagger = {
              btcPrice: 50000,
              satPrice: 0.0005,
              
              init: function() {
                try {
                  // Very basic initialization that doesn't rely on extension APIs
                  if (typeof window.bitcoinPriceTagBridge !== 'undefined' && 
                      typeof window.bitcoinPriceTagBridge.getFallbackPriceData === 'function') {
                    try {
                      // Use bridge data if available, but safely check it first
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
                    const hasScriptRestrictions = cspContent.includes('script-src') && 
                                                (!cspContent.includes('unsafe-inline') || 
                                                 !cspContent.includes('unsafe-eval'));
                    
                    if (hasScriptRestrictions) {
                      console.debug('Bitcoin Price Tag: CSP restrictions detected, skipping DOM operations');
                      return;
                    }
                  }
                  
                  // No obvious restrictions detected, try very limited processing
                  this.limitedProcessing();
                } catch (initError) {
                  console.debug('Bitcoin Price Tag: Fallback initialization error:', initError.message);
                }
              },
              
              // Very limited processing that does minimal DOM operations
              limitedProcessing: function() {
                console.debug('Bitcoin Price Tag: Fallback mode active - price processing limited');
                // No DOM manipulation in fallback mode to avoid potential issues
              }
            };
            
            // Initialize the fallback module with careful error handling
            try {
              minimalBitcoinTagger.init();
            } catch (e) {
              console.debug('Bitcoin Price Tag: Fallback module execution error:', e.message);
            }
          `;
          
          // Extra safety - wrap script injection in try-catch
          try {
            // Append to document to execute it
            (document.head || document.documentElement).appendChild(fallbackScript);
          } catch (injectionError) {
            console.warn('Bitcoin Price Tag: Script injection failed:', injectionError.message);
          }
        } catch (fallbackError) {
          console.warn('Bitcoin Price Tag: Failed to load fallback module', fallbackError.message);
        }
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