/**
 * Shared types and interfaces for the Bitcoin Price Tag extension
 */

/**
 * Message sent from content script to service worker to request Bitcoin price data
 */
export interface PriceRequestMessage {
  /** Unique identifier for the request to correlate with response */
  readonly requestId: string;
  /** Type of message */
  readonly type: 'PRICE_REQUEST';
  /** Timestamp when the request was created */
  readonly timestamp: number;
}

/**
 * Bitcoin price data structure
 */
export interface PriceData {
  /** BTC price in USD */
  readonly usdRate: number;
  /** Satoshi price in USD (1 satoshi = 0.00000001 BTC) */
  readonly satoshiRate: number;
  /** Timestamp when the price was fetched */
  readonly fetchedAt: number;
  /** Source of the price data */
  readonly source: string;
}

/**
 * Message sent from service worker to content script with price data
 */
export interface PriceResponseMessage {
  /** Unique identifier matching the original request */
  readonly requestId: string;
  /** Type of message */
  readonly type: 'PRICE_RESPONSE';
  /** Status of the response */
  readonly status: 'success' | 'error';
  /** Price data (present if status is success) */
  readonly data?: PriceData;
  /** Error information (present if status is error) */
  readonly error?: {
    readonly message: string;
    readonly code: string;
  };
  /** Timestamp when the response was created */
  readonly timestamp: number;
}

/**
 * Structure for caching price data in chrome.storage.local
 */
export interface LocalStorageCache {
  /** The cached price data */
  readonly priceData: PriceData;
  /** When the cache was created */
  readonly cachedAt: number;
  /** Version of the cache format for potential migrations */
  readonly version: number;
}

/**
 * Structure representing the response from the CoinDesk API
 * Based on https://api.coindesk.com/v1/bpi/currentprice/USD.json format
 */
export interface CoinDeskApiResponse {
  readonly time: {
    readonly updated: string;
    readonly updatedISO: string;
    readonly updateduk: string;
  };
  readonly disclaimer: string;
  readonly bpi: {
    readonly USD: {
      readonly code: string;
      readonly rate: string;
      readonly description: string;
      readonly rate_float: number;
    };
  };
}