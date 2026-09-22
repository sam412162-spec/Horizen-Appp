import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

type AsyncState<T> = {
  /** Latest data. Kept while a refetch is in flight (stale-while-revalidate). */
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
};

/**
 * Minimal data-fetching hook for the service layer. Deps must be primitives.
 * Swap for TanStack Query once the real backend is connected if you need
 * caching/retries.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify([...deps, nonce]);
  const [result, setResult] = useState<{ key?: string; data?: T; error?: Error }>({});

  const fnRef = useRef(fn);
  // Declared first so it runs before the fetch effect below.
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let cancelled = false;
    fnRef
      .current()
      .then((data) => !cancelled && setResult({ key, data }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setResult((prev) => ({ key, data: prev.data, error: e instanceof Error ? e : new Error(String(e)) })),
      );
    return () => {
      cancelled = true;
    };
  }, [key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const settled = result.key === key;
  return { data: result.data, error: settled ? result.error : undefined, loading: !settled, reload };
}
