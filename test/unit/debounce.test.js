/**
 * Unit tests for debouncing utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { debounce, throttle, coalesce, batchProcessor } from '../../debounce.js';

describe('Debouncing Utilities', () => {
  // Setup for testing timers
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debounce function', () => {
    it('should delay function execution', () => {
      const func = vi.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      expect(func).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(func).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('should only execute once for multiple rapid calls', () => {
      const func = vi.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      debouncedFunc();
      debouncedFunc();

      expect(func).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('should use the most recent arguments', () => {
      const func = vi.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc('first');
      debouncedFunc('second');
      debouncedFunc('third');

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledWith('third');
    });

    it('should support leading edge execution', () => {
      const func = vi.fn();
      const debouncedFunc = debounce(func, 100, { leading: true });

      debouncedFunc('first');
      expect(func).toHaveBeenCalledTimes(1);
      expect(func).toHaveBeenCalledWith('first');

      debouncedFunc('second');
      expect(func).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(2);
      expect(func).toHaveBeenLastCalledWith('second');
    });

    it('should support cancellation', () => {
      const func = vi.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      debouncedFunc.cancel();

      vi.advanceTimersByTime(100);
      expect(func).not.toHaveBeenCalled();
    });

    it('should support flush', () => {
      const func = vi.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc('test');
      debouncedFunc.flush();

      expect(func).toHaveBeenCalledTimes(1);
      expect(func).toHaveBeenCalledWith('test');

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle function', () => {
    it('should limit function execution to once per wait period', () => {
      const func = vi.fn();
      const throttledFunc = throttle(func, 100);

      throttledFunc();
      expect(func).toHaveBeenCalledTimes(1);

      throttledFunc();
      throttledFunc();
      expect(func).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(2);
    });

    it('should execute on leading edge by default', () => {
      const func = vi.fn();
      const throttledFunc = throttle(func, 100);

      throttledFunc();
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('should support disabling leading edge execution', () => {
      const func = vi.fn();
      const throttledFunc = throttle(func, 100, { leading: false });

      throttledFunc();
      expect(func).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('should support disabling trailing edge execution', () => {
      const func = vi.fn();
      const throttledFunc = throttle(func, 100, { trailing: false });

      throttledFunc();
      expect(func).toHaveBeenCalledTimes(1);

      throttledFunc();
      throttledFunc();

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('should use the most recent arguments for trailing edge', () => {
      const func = vi.fn();
      const throttledFunc = throttle(func, 100, { leading: false });

      throttledFunc('first');
      throttledFunc('second');
      throttledFunc('third');

      vi.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledWith('third');
    });
  });

  describe('coalesce function', () => {
    it('should coalesce similar requests', async () => {
      const func = vi.fn().mockImplementation(() => Promise.resolve('result'));
      const keyExtractor = (...args) => args.join('-');
      const coalescedFunc = coalesce(func, keyExtractor, 50);

      const promise1 = coalescedFunc('test');
      const promise2 = coalescedFunc('test');

      vi.advanceTimersByTime(50);
      await Promise.resolve(); // Let promises resolve

      expect(func).toHaveBeenCalledTimes(1);
      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toBe('result');
      expect(result2).toBe('result');
    });

    it('should handle different keys separately', async () => {
      const func = vi
        .fn()
        .mockImplementationOnce(() => Promise.resolve('result1'))
        .mockImplementationOnce(() => Promise.resolve('result2'));
      const keyExtractor = (...args) => args.join('-');
      const coalescedFunc = coalesce(func, keyExtractor, 50);

      const promise1 = coalescedFunc('test1');
      const promise2 = coalescedFunc('test2');

      vi.advanceTimersByTime(50);
      await Promise.resolve(); // Let promises resolve

      expect(func).toHaveBeenCalledTimes(2);
      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });

    it('should propagate errors to all waiting promises', async () => {
      const error = new Error('Test error');
      const func = vi.fn().mockImplementation(() => Promise.reject(error));
      const keyExtractor = (...args) => args.join('-');
      const coalescedFunc = coalesce(func, keyExtractor, 50);

      const promise1 = coalescedFunc('test');
      const promise2 = coalescedFunc('test');

      vi.advanceTimersByTime(50);
      await Promise.resolve(); // Let promises resolve

      await expect(promise1).rejects.toThrow(error);
      await expect(promise2).rejects.toThrow(error);
    });
  });

  describe('batchProcessor function', () => {
    it('should collect items and process them in batch', async () => {
      const processor = vi.fn().mockResolvedValue('processed');
      const batcher = batchProcessor(processor, 100, 10);

      batcher('item1');
      batcher('item2');
      batcher('item3');

      vi.advanceTimersByTime(100);
      await Promise.resolve(); // Let promises resolve

      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith(['item1', 'item2', 'item3']);
    });

    it('should process immediately when batch size is reached', async () => {
      const processor = vi.fn().mockResolvedValue('processed');
      const batcher = batchProcessor(processor, 100, 3);

      batcher('item1');
      batcher('item2');
      batcher('item3'); // This should trigger processing

      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith(['item1', 'item2', 'item3']);

      // Timer should have been cleared
      vi.advanceTimersByTime(100);
      expect(processor).toHaveBeenCalledTimes(1);
    });

    it('should support flush to process immediately', async () => {
      const processor = vi.fn().mockResolvedValue('processed');
      const batcher = batchProcessor(processor, 100);

      batcher('item1');
      batcher('item2');
      batcher.flush();

      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith(['item1', 'item2']);
    });

    it('should support cancellation', async () => {
      const processor = vi.fn();
      const batcher = batchProcessor(processor, 100);

      batcher('item1');
      batcher('item2');
      batcher.cancel();

      vi.advanceTimersByTime(100);
      expect(processor).not.toHaveBeenCalled();
    });
  });
});
