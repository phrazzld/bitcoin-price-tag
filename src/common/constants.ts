/**
 * Shared constants for the Bitcoin Price Tag extension
 */

/**
 * Key for storing price data in chrome.storage.local
 */
export const PRICE_CACHE_KEY = 'btc_price_data';

/**
 * Name for the alarm that triggers periodic price refreshes
 */
export const REFRESH_ALARM_NAME = 'btc_price_refresh';

/**
 * Cache time-to-live (15 minutes)
 * 
 * This balances data freshness with minimizing API calls.
 * 
 * Trade-offs:
 * - Shorter TTL: More accurate prices but higher API usage
 * - Longer TTL: Less API usage but potentially outdated prices during market volatility
 * 
 * @see src/service-worker/cache.ts
 */
export const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Debounce delay for DOM mutation observer (250ms)
 * 
 * Controls how frequently price annotation occurs when detecting DOM changes.
 * 
 * Trade-offs:
 * - Shorter delay: More responsive price annotations but higher CPU usage
 * - Longer delay: Better performance by batching updates but delayed annotations
 * 
 * @see src/content-script/dom-observer.ts
 */
export const DOM_OBSERVER_DEBOUNCE_MS = 250;