/**
 * Service worker entry point for the Bitcoin Price Tag extension
 * This file sets up all the event listeners required for the service worker
 */

import { REFRESH_ALARM_NAME } from '../common/constants';
import { PriceRequestMessage, PriceResponseMessage } from '../common/types';
import { rehydrateCache, setCachedPrice, getCachedPrice } from './cache';
import { fetchBtcPrice } from './api';

/**
 * Handler for when the extension is installed or updated
 * This is where we'll set up the initial state and create alarms
 */
async function handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
  console.log('Extension installed/updated:', details.reason);
  if (details.previousVersion) {
    console.log('Previous version:', details.previousVersion);
  }

  try {
    // Clear any existing alarm first to prevent duplicates
    await chrome.alarms.clear(REFRESH_ALARM_NAME);

    // Create a periodic alarm for refreshing Bitcoin price
    // Fires every 15 minutes, matching our cache TTL
    await chrome.alarms.create(REFRESH_ALARM_NAME, {
      periodInMinutes: 15,
      // Fire the first alarm 1 minute after installation to get initial price
      delayInMinutes: 1
    });

    console.log(`Alarm "${REFRESH_ALARM_NAME}" created successfully`);
  } catch (error) {
    console.error('Failed to create alarm:', error);
  }
}

/**
 * Handler for when the browser starts up
 * This is where we'll rehydrate any in-memory state from storage
 */
async function handleStartup(): Promise<void> {
  console.log('Service worker starting up');

  try {
    // Rehydrate the in-memory cache from chrome.storage.local
    await rehydrateCache();
    console.log('Cache successfully rehydrated');
  } catch (error) {
    // Don't let cache rehydration failures break the service worker
    console.error('Failed to rehydrate cache:', error);
  }
}

/**
 * Handler for alarm events
 * This is where we'll handle periodic price updates
 */
async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  console.log('Alarm fired:', alarm.name);

  // Check if this is our price refresh alarm
  if (alarm.name === REFRESH_ALARM_NAME) {
    console.log('Starting price refresh...');

    try {
      // Fetch fresh price data from the API
      const freshPriceData = await fetchBtcPrice();
      console.log('Price data fetched successfully:', freshPriceData);

      // Store the fresh data in the cache
      await setCachedPrice(freshPriceData);
      console.log('Price data cached successfully');
    } catch (error) {
      // Log the error but don't let it break the service worker
      console.error('Failed to refresh price data:', error);
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
  console.log('Message received:', message, 'from:', sender);

  // Type check and handle price request messages
  if (isPriceRequestMessage(message)) {
    handlePriceRequest(message, sendResponse);
    // Return true to indicate we'll send a response asynchronously
    return true;
  }

  // Unknown message type - send error response
  sendResponse({
    type: 'PRICE_RESPONSE',
    status: 'error',
    error: {
      message: 'Unknown message type',
      code: 'unknown_message'
    },
    timestamp: Date.now()
  } as PriceResponseMessage);

  return false;
}

/**
 * Type guard to check if a message is a PriceRequestMessage
 */
function isPriceRequestMessage(message: unknown): message is PriceRequestMessage {
  return (
    message !== null &&
    typeof message === 'object' &&
    'type' in message &&
    message.type === 'PRICE_REQUEST' &&
    'requestId' in message &&
    'timestamp' in message
  );
}

/**
 * Handles price request messages by checking cache and fetching from API if needed
 */
async function handlePriceRequest(
  request: PriceRequestMessage,
  sendResponse: (response: PriceResponseMessage) => void
): Promise<void> {
  console.log('Processing price request:', request.requestId);

  try {
    // First, try to get the price from cache
    const cachedPrice = await getCachedPrice();

    if (cachedPrice) {
      console.log('Price found in cache');
      sendResponse({
        requestId: request.requestId,
        type: 'PRICE_RESPONSE',
        status: 'success',
        data: cachedPrice,
        timestamp: Date.now()
      });
      return;
    }

    // Cache miss or expired - fetch from API
    console.log('Cache miss - fetching from API');
    const freshPrice = await fetchBtcPrice();

    // Store in cache for future requests
    await setCachedPrice(freshPrice);

    // Send the fresh data
    sendResponse({
      requestId: request.requestId,
      type: 'PRICE_RESPONSE',
      status: 'success',
      data: freshPrice,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to get price data:', error);

    // Send error response
    sendResponse({
      requestId: request.requestId,
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

// Register all event listeners
chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleStartup);
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.runtime.onMessage.addListener(handleMessage);