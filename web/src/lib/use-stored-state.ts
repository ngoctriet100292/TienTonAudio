'use client';

import type { SetStateAction } from 'react';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
const parseJSON = <T,>(raw: string): T => JSON.parse(raw) as T;

export function useStoredState<T>(key: string, initial: T, parse: (raw: string) => T = parseJSON) {
  const subscribe = useCallback((notify: () => void) => {
    const onChange = () => notify();
    window.addEventListener('storage', onChange);
    window.addEventListener('tienton-storage-change', onChange);
    return () => { window.removeEventListener('storage', onChange); window.removeEventListener('tienton-storage-change', onChange); };
  }, []);
  const getSnapshot = useCallback(() => { try { return localStorage.getItem(key); } catch { return null; } }, [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const value = useMemo(() => { if (raw === null) return initial; try { return parse(raw); } catch { return initial; } }, [raw, initial, parse]);
  const setValue = useCallback((update: SetStateAction<T>) => {
    const previous = getSnapshot();
    let current = initial;
    if (previous !== null) { try { current = parse(previous); } catch { } }
    const next = typeof update === 'function' ? (update as (value: T) => T)(current) : update;
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event('tienton-storage-change'));
  }, [key, initial, parse, getSnapshot]);
  return [value, setValue] as const;
}
