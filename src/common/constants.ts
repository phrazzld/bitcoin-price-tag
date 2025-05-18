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
 * 
 * This defines how long cached price data should be considered valid before requiring a refresh.
 * The value balances data freshness with minimizing API calls to the CoinDesk API.
 * 
 * Current value: 15 minutes (900,000 milliseconds)
 * 
 * To adjust this value:
 * - Decrease for more frequent updates and fresher data (increases API calls)
 * - Increase for less frequent updates and reduced API load (data may be staler)
 * 
 * Examples:
 * - 5 minutes:  5 * 60 * 1000  (more frequent updates)
 * - 30 minutes: 30 * 60 * 1000 (less frequent updates)
 * - 1 hour:     60 * 60 * 1000 (hourly updates)
 * 
 * Trade-offs:
 * - Shorter TTL: More accurate prices, higher API usage, potentially hitting rate limits
 * - Longer TTL: Less API usage, potentially outdated prices during volatile market conditions
 * 
 * This constant is used by:
 * - Service worker cache module for TTL validation
 * - Background alarm scheduling for periodic updates
 * 
 * @see src/service-worker/cache.ts
 */
export const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds