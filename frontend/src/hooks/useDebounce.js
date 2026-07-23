// ============================================================
// useDebounce Hook
// ------------------------------------------------------------
// Delays updating a value until the input has stopped changing
// for `delay` ms. Used for search boxes so we don't fire an API
// request on every keystroke.
// ============================================================

import { useEffect, useState } from 'react';

export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
