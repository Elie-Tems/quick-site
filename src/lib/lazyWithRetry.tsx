import { lazy, type ComponentType, type LazyExoticComponent } from "react";

// React.lazy that retries the dynamic import a few times before giving up.
//
// A single failed chunk fetch (a transient network blip, a backgrounded tab, or a
// mid-session redeploy that changed chunk hashes) would otherwise throw and unwind
// the tree - in the onboarding flow that surfaced as the whole wizard resetting to
// step 1 and losing all progress. Retrying with a short backoff recovers from the
// common transient case; a genuinely-missing chunk still fails after the retries,
// where a surrounding boundary can show a friendly fallback.
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  delayMs = 400,
): LazyExoticComponent<T> {
  return lazy(() =>
    (async () => {
      let lastErr: unknown;
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          return await factory();
        } catch (err) {
          lastErr = err;
          // Linear backoff: 400ms, 800ms, 1200ms.
          await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        }
      }
      throw lastErr;
    })(),
  );
}
