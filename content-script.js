// Non-module content script that loads the real content module
(async function() {
  try {
    // Create the module script element
    const moduleScript = document.createElement('script');
    moduleScript.type = 'module';
    
    // We'll use a self-executing module with inline content
    // This approach avoids the content script needing to be a module itself
    moduleScript.textContent = `
      import { initBitcoinPriceTag } from '/content-module.js';
      
      // Initialize the module
      try {
        initBitcoinPriceTag();
        console.log('Bitcoin Price Tag module initialized successfully');
      } catch (error) {
        console.error('Bitcoin Price Tag module initialization error:', error);
      }
    `;
    
    // Append to document to execute it
    (document.head || document.documentElement).appendChild(moduleScript);
    
    // Optional: Remove after execution (though this may not be necessary)
    moduleScript.parentNode.removeChild(moduleScript);
    
    console.log('Bitcoin Price Tag loader executed');
  } catch (error) {
    console.error('Bitcoin Price Tag loader error:', error);
  }
})();