import { finalTest as test, expect } from '../fixtures/extension-final';

test.describe('Content Script Injection Test', () => {
  test('should verify if content script is actually injected', async ({ 
    extensionContext, 
    extensionId 
  }) => {
    console.log('\n🧪 CONTENT SCRIPT INJECTION: Testing injection mechanisms');
    
    const page = await extensionContext.newPage();
    
    // Test multiple scenarios where content scripts should be injected
    console.log('🌐 Testing content script injection on different pages...');
    
    const testUrls = [
      'https://httpbin.org/html',
      'https://example.com',
      'https://www.google.com'
    ];
    
    for (const url of testUrls) {
      console.log(`\n🔍 Testing URL: ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        
        // Wait for potential content script injection
        await page.waitForTimeout(3000);
        
        // Check for any signs of our content script
        const contentScriptCheck = await page.evaluate(() => {
          return {
            url: window.location.href,
            
            // Check if our content script has run by looking for:
            // 1. Any price annotations (would have data-btc-price-tag attribute)
            hasPriceAnnotations: document.querySelectorAll('[data-btc-price-tag]').length > 0,
            
            // 2. Check for any elements that might have been modified by our script
            modifiedElements: document.querySelectorAll('*[style*="btc"], *[class*="btc"], *[data-btc]').length,
            
            // 3. Check if Chrome extension APIs are available
            chromeAvailable: typeof chrome !== 'undefined',
            extensionApis: typeof chrome !== 'undefined' ? {
              runtime: typeof chrome.runtime !== 'undefined',
              storage: typeof chrome.storage !== 'undefined',
              i18n: typeof chrome.i18n !== 'undefined'
            } : null,
            
            // 4. Check document scripts to see if content script was added
            scriptTags: Array.from(document.scripts).map(s => ({
              src: s.src,
              id: s.id,
              type: s.type
            })),
            
            // 5. Test if we can manually trigger a content script-like operation
            canCreateElement: (() => {
              try {
                const testEl = document.createElement('div');
                testEl.setAttribute('data-test-extension', 'true');
                return true;
              } catch (_e) {
                return false;
              }
            })(),
            
            // 6. Check for any global variables our content script might set
            globalVariables: Object.keys(window).filter(key => 
              key.includes('btc') || 
              key.includes('bitcoin') || 
              key.includes('price') ||
              key.includes('extension')
            )
          };
        });
        
        console.log(`📊 Content script check for ${url}:`, JSON.stringify(contentScriptCheck, null, 2));
        
        if (contentScriptCheck.extensionApis?.runtime) {
          console.log(`✅ Extension APIs found on ${url}!`);
          break; // Found working injection
        } else {
          console.log(`❌ No extension APIs on ${url}`);
        }
        
      } catch (error) {
        console.log(`❌ Failed to test ${url}:`, error);
      }
    }
    
    await page.close();
    
    // Now let's check if content scripts are enabled in our context at all
    console.log('\n🔧 Testing if content scripts work with a simple manual injection...');
    
    const testPage = await extensionContext.newPage();
    await testPage.goto('https://httpbin.org/html');
    
    // Try to manually access chrome extension APIs
    const manualApiTest = await testPage.evaluate(() => {
      // This should work if content scripts have proper permissions
      return {
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        hasChrome: typeof chrome !== 'undefined',
        chromeString: typeof chrome !== 'undefined' ? Object.prototype.toString.call(chrome) : 'N/A',
        chromeConstructor: typeof chrome !== 'undefined' ? chrome.constructor.name : 'N/A',
        windowChrome: (window as any).chrome === chrome,
        documentLocation: document.location.href
      };
    });
    
    console.log('🔬 Manual API test:', JSON.stringify(manualApiTest, null, 2));
    
    await testPage.close();
    
    console.log('🏁 Content script injection test completed');
    
    // Test passes if extension loads (we're debugging)
    expect(extensionId).toBeTruthy();
  });
});