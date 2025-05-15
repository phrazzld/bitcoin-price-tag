/**
 * Shared constants for the Bitcoin Price Tag extension
 */

/**
 * Key used for storing the BTC price data in chrome.storage.local
 * This provides a consistent access point for all components that need to read or write cache data
 */
export const PRICE_CACHE_KEY = 'btc_price_data';

/**
 * Name used for the alarm that triggers periodic price refreshes
 * This identifier is used when creating, querying, or responding to the refresh alarm
 */
export const REFRESH_ALARM_NAME = 'btc_price_refresh';

/**
 * Default time-to-live for cached price data in milliseconds (15 minutes)
 * This defines how long cached price data should be considered valid before requiring a refresh
 * The value balances data freshness with minimizing API calls
 */
export const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds