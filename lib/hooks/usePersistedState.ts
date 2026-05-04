"use client";

/**
 * usePersistedState — drop-in replacement for `useState` that mirrors the
 * value to `localStorage` so it survives page reloads and cross-page
 * navigation.
 *
 * Used by the Flight / Hotel / Series-Fare search pages to remember the
 * agent's last-used sidebar filters (sort, stops, refund policy, airlines,
 * price cap). Without this, every time they bounce back to the page they
 * have to re-pick the same filters they picked yesterday.
 *
 * Behaviour:
 *   • First mount   — reads `localStorage[key]`. If valid JSON, hydrates
 *                     state with it; otherwise uses `initial`.
 *   • Every update  — writes the new value back to `localStorage[key]`.
 *   • SSR safe      — falls back to `initial` on the server / in Node.
 *
 * Limits:
 *   • Don't put huge objects in here — localStorage is ~5 MB total per origin.
 *   • Don't use it for sensitive data — it's plain text in the user's browser.
 */

import { useEffect, useRef, useState } from "react";

export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // We *cannot* read localStorage in the initial useState() call because that
  // would diverge between SSR and the first client render and React would warn
  // about hydration mismatch. Instead we read it on first mount via effect.
  const [value, setValue] = useState<T>(initial);
  const hydratedRef = useRef(false);

  // Hydrate from localStorage on mount (client-only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as T;
        setValue(parsed);
      }
    } catch {
      // Bad JSON — wipe it so we don't keep failing
      try { window.localStorage.removeItem(key); } catch { /* ignore */ }
    }
    hydratedRef.current = true;
  }, [key]);

  // Persist after the first hydrate (so we don't immediately overwrite the
  // saved value with the initial one before we've had a chance to read it).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota / privacy mode — ignore */
    }
  }, [key, value]);

  return [value, setValue];
}
