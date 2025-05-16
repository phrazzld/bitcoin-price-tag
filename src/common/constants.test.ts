import { describe, it, expect } from 'vitest';
import { PRICE_CACHE_KEY, REFRESH_ALARM_NAME, DEFAULT_CACHE_TTL_MS } from './constants';

describe('Constants', () => {
  it('should export PRICE_CACHE_KEY', () => {
    expect(PRICE_CACHE_KEY).toBe('btc_price_data');
  });

  it('should export REFRESH_ALARM_NAME', () => {
    expect(REFRESH_ALARM_NAME).toBe('btc_price_refresh');
  });

  it('should export DEFAULT_CACHE_TTL_MS as 15 minutes', () => {
    expect(DEFAULT_CACHE_TTL_MS).toBe(15 * 60 * 1000);
  });
});