// Non-module content script that loads the real content module via an external file
(async function() {
  try {
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
  } catch (error) {
    // Log detailed error information
    console.error('Bitcoin Price Tag loader error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
})();