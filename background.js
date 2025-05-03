import { calculateSatPrice } from './conversion.js';

// Constants
const PRICE_STORAGE_KEY = 'btcPriceData';
const PRICE_FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const COINDESK_API_URL = 'https://api.coindesk.com/v1/bpi/currentprice/USD.json';

// Fetch and store the Bitcoin price
async function fetchAndStoreBitcoinPrice() {
  try {
    const response = await fetch(COINDESK_API_URL);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract price data
    const btcPrice = parseFloat(data.bpi.USD.rate.replace(',', ''));
    const satPrice = calculateSatPrice(btcPrice);
    
    // Create price data object
    const priceData = {
      btcPrice,
      satPrice,
      timestamp: Date.now()
    };
    
    // Store in local storage
    await chrome.storage.local.set({ [PRICE_STORAGE_KEY]: priceData });
    
    return priceData;
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error);
    // Return cached data if available, otherwise null
    const data = await chrome.storage.local.get(PRICE_STORAGE_KEY);
    return data[PRICE_STORAGE_KEY] || null;
  }
}

// Initialize by fetching price when service worker starts
fetchAndStoreBitcoinPrice();

// Set up alarm for periodic price updates
chrome.alarms.create('updateBitcoinPrice', {
  periodInMinutes: PRICE_FETCH_INTERVAL / (60 * 1000)
});

// Handle alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateBitcoinPrice') {
    fetchAndStoreBitcoinPrice();
  }
});

// Respond to content script requests for price data
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getBitcoinPrice') {
    chrome.storage.local.get(PRICE_STORAGE_KEY, (result) => {
      const priceData = result[PRICE_STORAGE_KEY];
      
      // If we have cached data that's fresh enough, return it
      if (priceData && Date.now() - priceData.timestamp < PRICE_FETCH_INTERVAL) {
        sendResponse(priceData);
      } else {
        // Otherwise fetch new data
        fetchAndStoreBitcoinPrice()
          .then(newPriceData => sendResponse(newPriceData));
        return true; // Indicates we will respond asynchronously
      }
    });
    return true; // Indicates we will respond asynchronously
  }
});