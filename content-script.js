// Non-module content script that loads the real content module via an external file
(async function() {
  try {
    // Get extension URL for the bootstrap module
    const bootstrapUrl = chrome.runtime.getURL('bootstrap-module.js');
    
    // Create the module script element referencing the external file
    const moduleScript = document.createElement('script');
    moduleScript.type = 'module';
    moduleScript.src = bootstrapUrl;
    
    // Append to document to execute it
    (document.head || document.documentElement).appendChild(moduleScript);
    
    // Log successful loader execution
    console.log('Bitcoin Price Tag loader executed');
  } catch (error) {
    console.error('Bitcoin Price Tag loader error:', error);
  }
})();