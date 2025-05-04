// Non-module content script that loads the real content module via an external file
// and provides a messaging bridge between page context and extension context
(async function() {
  try {
    // Create a messaging bridge before loading the module
    // This will allow the module to communicate with the extension
    window.bitcoinPriceTagBridge = {
      // Method to send messages to the background script
      sendMessageToBackground: (message, callback) => {
        try {
          console.log('Bitcoin Price Tag: Bridge sending message to background', message);
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Bitcoin Price Tag: Chrome runtime error in bridge', {
                message: chrome.runtime.lastError.message,
                originalMessage: message
              });
              callback({ 
                status: 'error', 
                error: { 
                  message: chrome.runtime.lastError.message,
                  type: 'runtime'
                }
              });
              return;
            }
            
            // Pass the response back through the callback
            callback(response);
          });
        } catch (error) {
          console.error('Bitcoin Price Tag: Bridge error sending message', {
            message: error.message,
            originalMessage: message
          });
          callback({ 
            status: 'error', 
            error: { 
              message: error.message,
              type: 'bridge'
            } 
          });
        }
      },
      
      // Method to check if extension APIs are available
      // This can be used to determine if fallback behavior is needed
      isExtensionContextAvailable: () => {
        return true; // This function existing means extension is available
      }
    };
    
    // Get extension URL for the bootstrap module
    const bootstrapUrl = chrome.runtime.getURL('bootstrap-module.js');
    console.log('Bitcoin Price Tag: Loading bootstrap module from', bootstrapUrl);
    
    // Create the module script element referencing the external file
    const moduleScript = document.createElement('script');
    moduleScript.type = 'module';
    moduleScript.src = bootstrapUrl;
    
    // Add error handling for the script
    moduleScript.onerror = (event) => {
      console.error('Bitcoin Price Tag: Failed to load bootstrap module', {
        url: bootstrapUrl,
        event: event.type,
        target: event.target.outerHTML
      });
    };
    
    // Append to document to execute it
    (document.head || document.documentElement).appendChild(moduleScript);
    
    // Log successful loader execution
    console.log('Bitcoin Price Tag loader executed successfully');
    
    // Listen for messages from the page context that need to access extension APIs
    window.addEventListener('message', (event) => {
      // Only accept messages from the same window
      if (event.source !== window) return;
      
      // Check if this is a message for our bridge
      if (event.data.type === 'BITCOIN_PRICE_TAG_BRIDGE_REQUEST') {
        const { id, action, data } = event.data;
        
        // Handle different types of actions
        if (action === 'sendMessageToBackground') {
          chrome.runtime.sendMessage(data, (response) => {
            // Send the response back to the page
            window.postMessage({
              type: 'BITCOIN_PRICE_TAG_BRIDGE_RESPONSE',
              id,
              response
            }, '*');
          });
        }
      }
    });
    
  } catch (error) {
    // Log detailed error information
    console.error('Bitcoin Price Tag loader error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
})();