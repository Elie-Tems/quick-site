import { useSyncExternalStore } from "react";

// The "active" business a merchant is currently managing, persisted across reloads.
// A single account can own several sites (e.g. a chain / test stores); the dashboard
// shows one at a time and the site switcher flips this value. useMyBusiness reads it
// reactively so every dashboard screen follows the switch at once.

const KEY = "siango_active_business_id";
const listeners = new Set<() => void>();

export function getActiveBusinessId(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setActiveBusinessId(id: string | null): void {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch { /* private mode / storage disabled */ }
  listeners.forEach((l) => l());
}

/** Reactive hook: re-renders when the active business changes. */
export function useActiveBusinessId(): string | null {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    getActiveBusinessId,
    () => null, // SSR fallback
  );
}
