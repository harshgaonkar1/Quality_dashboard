// ============================================================
// useFetch Hook
// ------------------------------------------------------------
// Generic hook for calling an async service function whenever
// its dependency array changes. Tracks loading/error/data state
// so pages don't repeat the same boilerplate.
// ============================================================

import { useEffect, useState, useCallback } from 'react';

/**
 * @param {() => Promise<any>} fetchFn - async function to call (should be stable/memoized by caller)
 * @param {any[]} deps - dependency array; refetches when these change
 */
export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchFn()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const cancel = refetch();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch]);

  return { data, loading, error, refetch };
}
