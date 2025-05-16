/**
 * Service worker entry point for the Bitcoin Price Tag extension
 * This file sets up all the event listeners required for the service worker
 */

import { REFRESH_ALARM_NAME } from '../common/constants';

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
function handleStartup(): void {
  console.log('Service worker starting up');
  // TODO: Implement cache rehydration and state restoration
}

/**
 * Handler for alarm events
 * This is where we'll handle periodic price updates
 */
function handleAlarm(alarm: chrome.alarms.Alarm): void {
  console.log('Alarm fired:', alarm.name);
  // TODO: Implement price refresh logic based on alarm name
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
  
  // TODO: Implement message processing logic
  // For now, just acknowledge the message
  sendResponse({ status: 'received' });
  
  // Return true to indicate we'll send a response asynchronously
  return true;
}

// Register all event listeners
chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleStartup);
chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.runtime.onMessage.addListener(handleMessage);