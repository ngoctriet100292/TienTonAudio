'use client';

import type { SetStateAction } from 'react';
import { useCallback, useEffect, useEffectEvent, useReducer, useState } from 'react';

// Query identity controls loading state. Responses from replaced queries are discarded.
export function useAsyncResource<T>(key: string | null, load: () => Promise<T>, initial: T) {
  const [revision, reload] = useReducer((value: number) => value + 1, 0);
  const [result, setResult] = useState<{ key: string | null; revision: number; data: T; error: unknown }>({ key: null, revision: 0, data: initial, error: null });
  const fetchData = useEffectEvent(load);
  const fallback = useEffectEvent(() => initial);
  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    fetchData().then((data) => {
      if (!cancelled) setResult({ key, revision, data, error: null });
    }).catch((error: unknown) => {
      if (!cancelled) setResult({ key, revision, data: fallback(), error });
    });
    return () => { cancelled = true; };
  }, [key, revision]);
  const setData = useCallback((update: SetStateAction<T>) => {
    setResult((previous) => {
      const data = previous.key === key ? previous.data : initial;
      return { key, revision, data: typeof update === 'function' ? (update as (value: T) => T)(data) : update, error: null };
    });
  }, [key, revision, initial]);
  return { data: result.key === key ? result.data : initial, setData, reload, loading: key !== null && (result.key !== key || result.revision !== revision), error: result.key === key ? result.error : null };
}
