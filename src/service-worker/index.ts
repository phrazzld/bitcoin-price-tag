/**
 * Service worker entry point for the Bitcoin Price Tag extension
 * This file sets up all the event listeners required for the service worker
 */

import { REFRESH_ALARM_NAME, DEFAULT_CACHE_TTL_MS } from '../common/constants';
import { PriceRequestMessage, PriceResponseMessage } from '../common/types';
import { rehydrateCache, setCachedPrice, getCachedPrice } from './cache';
import { fetchBtcPrice } from './api';
import { createLogger } from '../shared/logger';
import { SecureValidation } from '../common/schema-validation';

/** Logger instance for this module */
const logger = createLogger('service-worker');

/**
 * Handler for when the extension is installed or updated
 * This is where we'll set up the initial state and create alarms
 */
async function handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
  logger.info('Extension installed/updated', {
    function_name: 'handleInstalled',
    reason: details.reason,
    previousVersion: details.previousVersion
  });

  try {
    // Clear any existing alarm first to prevent duplicates
    await chrome.alarms.clear(REFRESH_ALARM_NAME);

    // Convert TTL from milliseconds to minutes for Chrome alarms API
    const periodInMinutes = DEFAULT_CACHE_TTL_MS / (60 * 1000);

    // Create a periodic alarm for refreshing Bitcoin price
    // Fires periodically, matching our cache TTL
    await chrome.alarms.create(REFRESH_ALARM_NAME, {
      periodInMinutes: periodInMinutes,
      // Fire the first alarm 1 minute after installation to get initial price
      delayInMinutes: 1
    });

    logger.info('Alarm created successfully', {
      function_name: 'handleInstalled',
      alarmName: REFRESH_ALARM_NAME,
      periodInMinutes: periodInMinutes,
      delayInMinutes: 1
    });
  } catch (error) {
    logger.error('Failed to create alarm', error, {
      function_name: 'handleInstalled',
      alarmName: REFRESH_ALARM_NAME
    });
  }
}

/**
 * Handler for when the browser starts up
 * This is where we'll rehydrate any in-memory state from storage
 */
async function handleStartup(): Promise<void> {
  logger.info('Service worker starting up', {
    function_name: 'handleStartup'
  });

  try {
    // Rehydrate the in-memory cache from chrome.storage.local
    await rehydrateCache();
    logger.info('Cache successfully rehydrated', {
      function_name: 'handleStartup'
    });
  } catch (error) {
    // Don't let cache rehydration failures break the service worker
    logger.error('Failed to rehydrate cache', error, {
      function_name: 'handleStartup'
    });
  }
}

/**
 * Handler for alarm events
 * This is where we'll handle periodic price updates
 */
async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  logger.info('Alarm fired', {
    function_name: 'handleAlarm',
    alarmName: alarm.name
  });

  // Check if this is our price refresh alarm
  if (alarm.name === REFRESH_ALARM_NAME) {
    logger.info('Starting price refresh', {
      function_name: 'handleAlarm',
      alarmName: alarm.name
    });

    try {
      // Fetch fresh price data from the API
      const freshPriceData = await fetchBtcPrice(logger);
      logger.info('Price data fetched successfully', {
        function_name: 'handleAlarm',
        alarmName: alarm.name,
        priceData: {
          usdRate: freshPriceData.usdRate,
          fetchedAt: freshPriceData.fetchedAt,
          source: freshPriceData.source
        }
      });

      // Store the fresh data in the cache
      await setCachedPrice(freshPriceData);
      logger.info('Price data cached successfully', {
        function_name: 'handleAlarm',
        alarmName: alarm.name
      });
    } catch (error) {
      // Log the error but don't let it break the service worker
      logger.error('Failed to refresh price data', error, {
        function_name: 'handleAlarm',
        alarmName: alarm.name
      });
    }
  }
}

/**
 * Handler for incoming messages from content scripts or other extension parts
 * This is where we'll handle price data requests
 */
function handleMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): boolean {
  logger.info('Message received', {
    function_name: 'handleMessage',
    sender: {
      tab: sender.tab ? { id: sender.tab.id, url: sender.tab.url } : undefined,
      frameId: sender.frameId,
      origin: sender.origin
    }
  });

  // Perform comprehensive security validation
  const validationResult = SecureValidation.validateChromeMessage(message, sender, 'PRICE_REQUEST');
  
  if (!validationResult.isValid) {
    // Extract requestId for response correlation if possible (best effort)
    const requestId = typeof message === 'object' && message !== null && 'requestId' in message && typeof message.requestId === 'string' 
      ? message.requestId 
      : 'unknown';

    // Create error summary from validation errors
    const primaryError = validationResult.errors[0];
    const errorMessage = primaryError 
      ? `${primaryError.message} (${primaryError.code})`
      : 'Invalid message format';

    sendResponse({
      requestId,
      type: 'PRICE_RESPONSE',
      status: 'error',
      error: {
        message: errorMessage,
        code: 'validation_error'
      },
      timestamp: Date.now()
    } as PriceResponseMessage);

    return true; // We've handled the message
  }

  // Safe to proceed - message is validated as PriceRequestMessage
  const validMessage = validationResult.data as PriceRequestMessage;
  
  handlePriceRequest(validMessage, sendResponse).catch(error => {
    logger.error('Unhandled error in handlePriceRequest', error, {
      function_name: 'handleMessage',
      requestId: validMessage.requestId
    });
    // Send error response as fallback
    sendResponse({
      requestId: validMessage.requestId,
      type: 'PRICE_RESPONSE',
      status: 'error',
      error: {
        message: 'Internal error processing request',
        code: 'internal_error'
      },
      timestamp: Date.now()
    });
  });
  
  // Return true to indicate we'll send a response asynchronously
  return true;
}


/**
 * Handles price request messages by checking cache and fetching from API if needed
 */
async function handlePriceRequest(
  request: PriceRequestMessage,
  sendResponse: (response: PriceResponseMessage) => void
): Promise<void> {
  const requestId = request.requestId;
  const correlationLogger = logger.child({ correlationId: requestId });
  
  correlationLogger.info('Processing price request', {
    function_name: 'handlePriceRequest',
    timestamp: request.timestamp
  });

  try {
    // First, try to get the price from cache
    const cachedPrice = await getCachedPrice();

    if (cachedPrice) {
      correlationLogger.info('Price found in cache', {
        function_name: 'handlePriceRequest',
        cached: true,
        priceData: {
          usdRate: cachedPrice.usdRate,
          fetchedAt: cachedPrice.fetchedAt,
          source: cachedPrice.source
        }
      });
      
      sendResponse({
        requestId: requestId,
        type: 'PRICE_RESPONSE',
        status: 'success',
        data: cachedPrice,
        timestamp: Date.now()
      });
      return;
    }

    // Cache miss or expired - fetch from API
    correlationLogger.info('Cache miss - fetching from API', {
      function_name: 'handlePriceRequest',
      cached: false
    });
    
    const freshPrice = await fetchBtcPrice(correlationLogger);

    // Store in cache for future requests
    await setCachedPrice(freshPrice);
    
    correlationLogger.info('Price data cached and sending response', {
      function_name: 'handlePriceRequest',
      priceData: {
        usdRate: freshPrice.usdRate,
        fetchedAt: freshPrice.fetchedAt,
        source: freshPrice.source
      }
    });

    // Send the fresh data
    sendResponse({
      requestId: requestId,
      type: 'PRICE_RESPONSE',
      status: 'success',
      data: freshPrice,
      timestamp: Date.now()
    });
  } catch (error) {
    correlationLogger.error('Failed to get price data', error, {
      function_name: 'handlePriceRequest'
    });

    // Send error response
    sendResponse({
      requestId: requestId,
      type: 'PRICE_RESPONSE',
      status: 'error',
      error: {
        message: error instanceof Error ? error.message : 'Failed to get price data',
        code: 'price_fetch_error'
      },
      timestamp: Date.now()
    });
  }
}

// Register all event listeners with error handling
chrome.runtime.onInstalled.addListener((details) => {
  handleInstalled(details).catch(error => {
    logger.error('Unhandled error in onInstalled handler', error, {
      function_name: 'onInstalled_wrapper'
    });
  });
});

chrome.runtime.onStartup.addListener(() => {
  handleStartup().catch(error => {
    logger.error('Unhandled error in onStartup handler', error, {
      function_name: 'onStartup_wrapper'
    });
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  handleAlarm(alarm).catch(error => {
    logger.error('Unhandled error in onAlarm handler', error, {
      function_name: 'onAlarm_wrapper',
      alarmName: alarm.name
    });
  });
});

// onMessage handler is not async, so no wrapper needed
chrome.runtime.onMessage.addListener(handleMessage);