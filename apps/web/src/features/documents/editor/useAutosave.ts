import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface AutosaveOptions {
  delay?: number;
  /** Retries after the first failed attempt, with exponential backoff. */
  retries?: number;
  retryBaseMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Debounced, coalescing autosave. `queue` merges a partial patch and (re)starts the timer; `flush` saves
 * immediately. Saves are serialized; a failed patch is merged back under newer edits and kept for `retry`.
 * Flushes on unmount (route leave) and warns + flushes on `beforeunload`.
 */
export function useAutosave<P extends object>(save: (patch: Partial<P>) => Promise<unknown>, options: AutosaveOptions = {}) {
  const { delay = 1000, retries = 2, retryBaseMs = 600 } = options;
  const saveRef = useRef(save);
  saveRef.current = save;
  const pending = useRef<Partial<P>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  const [status, setStatusState] = useState<SaveStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const setStatus = useCallback((next: SaveStatus) => {
    if (mounted.current) setStatusState(next);
  }, []);

  const hasPending = () => Object.keys(pending.current).length > 0;

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    while (inFlight.current) await inFlight.current;
    if (!hasPending()) return;
    const patch = pending.current;
    pending.current = {};
    setStatus('saving');
    const attempt = (async () => {
      for (let tryIndex = 0; ; tryIndex += 1) {
        try {
          await saveRef.current(patch);
          if (mounted.current) setError(null);
          setStatus(hasPending() ? 'pending' : 'saved');
          return;
        } catch (caught) {
          if (tryIndex >= retries) {
            pending.current = { ...patch, ...pending.current };
            if (mounted.current) setError(caught instanceof Error ? caught : new Error('Save failed'));
            setStatus('error');
            return;
          }
          await sleep(retryBaseMs * 2 ** tryIndex);
        }
      }
    })();
    inFlight.current = attempt;
    try {
      await attempt;
    } finally {
      inFlight.current = null;
    }
  }, [retries, retryBaseMs, setStatus]);

  const queue = useCallback(
    (patch: Partial<P>) => {
      pending.current = { ...pending.current, ...patch };
      setStatus('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void flush();
      }, delay);
    },
    [delay, flush, setStatus]
  );

  /** Queue and save right away (e.g. client/project assignment). */
  const saveNow = useCallback(
    (patch: Partial<P>) => {
      pending.current = { ...pending.current, ...patch };
      return flush();
    },
    [flush]
  );

  useEffect(() => {
    mounted.current = true;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasPending() || inFlight.current) {
        void flush();
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      mounted.current = false;
      void flush();
    };
  }, [flush]);

  return { status, error, queue, flush, saveNow, retry: flush, isDirty: () => hasPending() || Boolean(inFlight.current) };
}
