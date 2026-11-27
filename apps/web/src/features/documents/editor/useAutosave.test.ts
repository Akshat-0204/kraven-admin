import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutosave } from './useAutosave';

type Patch = { title: string; html: string };

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces edits into one merged PATCH', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useAutosave<Patch>(save, { delay: 1000 }));
    act(() => {
      result.current.queue({ title: 'A' });
      result.current.queue({ html: '<p>x</p>' });
      result.current.queue({ title: 'B' });
    });
    expect(result.current.status).toBe('pending');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ title: 'B', html: '<p>x</p>' });
    expect(result.current.status).toBe('saved');
  });

  it('retries, then reports an error and keeps the patch for retry', async () => {
    const save = vi.fn().mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useAutosave<Patch>(save, { delay: 10, retries: 1, retryBaseMs: 5 }));
    act(() => result.current.queue({ title: 'A' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('error');
    save.mockResolvedValueOnce({});
    await act(async () => {
      await result.current.retry();
    });
    expect(save).toHaveBeenLastCalledWith({ title: 'A' });
    expect(result.current.status).toBe('saved');
  });
});
