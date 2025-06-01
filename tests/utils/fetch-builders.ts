/**
 * Fetch API test builders using satisfies operator
 */

import { vi } from 'vitest';

/**
 * Create a mock Response object
 */
export const createMockResponse = (data: any, options?: Partial<Response>): Response => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: new Headers(),
  redirected: false,
  type: 'basic',
  url: 'https://api.example.com',
  clone: vi.fn().mockReturnThis(),
  body: null,
  bodyUsed: false,
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  blob: vi.fn().mockResolvedValue(new Blob()),
  formData: vi.fn().mockResolvedValue(new FormData()),
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  ...options
} satisfies Response);

/**
 * Create a mock fetch function
 */
export const createMockFetch = (responses?: Map<string, Response>) => {
  const defaultResponse = createMockResponse({ bitcoin: { usd: 50000 } });
  
  return vi.fn().mockImplementation((url: string, _init?: RequestInit) => {
    const response = responses?.get(url) || defaultResponse;
    return Promise.resolve(response);
  });
};

/**
 * Create a failed response
 */
export const createFailedResponse = (status: number, statusText: string): Response =>
  createMockResponse(null, {
    ok: false,
    status,
    statusText,
    json: vi.fn().mockRejectedValue(new Error('Failed to parse JSON'))
  });

/**
 * Create a network error fetch
 */
export const createNetworkErrorFetch = () =>
  vi.fn().mockRejectedValue(new Error('Network error'));