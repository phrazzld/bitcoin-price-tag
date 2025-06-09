import { finalTest as test, expect } from '../fixtures/extension-final';

test.describe('Chrome API Debugging', () => {
  test('should analyze Chrome API availability in detail', async ({ 
    extensionContext, 
    extensionId 
  }) => {
    console.log('\n🔍 CHROME API DEBUG: Analyzing API availability');
    
    const page = await extensionContext.newPage();
    
    // Navigate to a test webpage
    await page.goto('https://httpbin.org/html', { waitUntil: 'domcontentloaded' });
    
    // Wait longer for content script injection
    await page.waitForTimeout(5000);
    
    // Analyze Chrome API availability in detail
    const chromeApiAnalysis = await page.evaluate(() => {
      const analysis = {
        // Basic availability
        chromeExists: typeof chrome !== 'undefined',
        chromeToString: typeof chrome !== 'undefined' ? chrome.toString() : 'N/A',
        
        // Runtime API
        runtimeExists: typeof chrome?.runtime !== 'undefined',
        runtimeId: chrome?.runtime?.id,
        runtimeLastError: chrome?.runtime?.lastError,
        runtimeSendMessage: typeof chrome?.runtime?.sendMessage,
        
        // Other APIs content scripts should have access to
        storageExists: typeof chrome?.storage !== 'undefined',
        i18nExists: typeof chrome?.i18n !== 'undefined',
        
        // Extension context info
        location: window.location.href,
        
        // Check for any errors in console
        errors: [],
        
        // Check if content script file loaded
        scriptsInPage: Array.from(document.scripts).map(s => ({
          src: s.src,
          type: s.type
        })),
        
        // Document state
        documentReady: document.readyState,
        
        // Available chrome properties
        chromeProperties: typeof chrome !== 'undefined' ? Object.keys(chrome) : []
      };
      
      // Try to detect any runtime errors
      try {
        if (typeof chrome !== 'undefined') {
          // Test chrome.runtime access
          analysis.runtimeAccess = {
            canAccessId: !!chrome.runtime?.id,
            canAccessSendMessage: typeof chrome.runtime?.sendMessage === 'function',
            runtimeType: typeof chrome.runtime
          };
        }
      } catch (error) {
        analysis.errors.push(`Error accessing chrome.runtime: ${error}`);
      }
      
      return analysis;
    });
    
    console.log('\n📊 Chrome API Analysis:', JSON.stringify(chromeApiAnalysis, null, 2));
    
    // Check if there are any console errors
    const consoleMessages: any[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text(),
          location: msg.location()
        });
      }
    });
    
    // Wait a bit more to catch any delayed errors
    await page.waitForTimeout(2000);
    
    if (consoleMessages.length > 0) {
      console.log('\n❌ Console Errors:', JSON.stringify(consoleMessages, null, 2));
    } else {
      console.log('\n✅ No console errors detected');
    }
    
    // Test if we can manually inject chrome.runtime
    const manualRuntimeTest = await page.evaluate(() => {
      try {
        // Check if chrome.runtime is actually there but not enumerable
        const hasRuntimeProp = 'runtime' in chrome;
        const runtimeDescriptor = Object.getOwnPropertyDescriptor(chrome, 'runtime');
        
        return {
          hasRuntimeProperty: hasRuntimeProp,
          runtimeDescriptor: runtimeDescriptor ? {
            enumerable: runtimeDescriptor.enumerable,
            configurable: runtimeDescriptor.configurable,
            writable: runtimeDescriptor.writable,
            hasValue: !!runtimeDescriptor.value,
            hasGetter: !!runtimeDescriptor.get
          } : null,
          prototypeChain: chrome.constructor.name,
          chromeKeys: Object.getOwnPropertyNames(chrome),
          chromeOwnProps: Object.getOwnPropertyDescriptors(chrome)
        };
      } catch (error) {
        return { error: String(error) };
      }
    });
    
    console.log('\n🔬 Runtime Property Analysis:', JSON.stringify(manualRuntimeTest, null, 2));
    
    await page.close();
    
    // Test passes if extension loads (we're debugging, not failing)
    expect(extensionId).toBeTruthy();
    
    console.log('🏁 Chrome API debugging completed');
  });
});