/**
 * In production, silence verbose console output (log / debug / info) so we never
 * leak user identity, session objects, or business data to the browser console.
 * `console.warn` and `console.error` are kept - they feed real error reporting
 * and are low-volume. In dev (import.meta.env.DEV) everything stays on.
 *
 * This is a blanket guard so we don't have to hunt down every debug `console.log`
 * across the codebase; new ones added during development are auto-silenced in prod.
 */
export function silenceConsoleInProduction() {
  if (import.meta.env.PROD) {
    const noop = () => {};
    // eslint-disable-next-line no-console
    console.log = noop;
    // eslint-disable-next-line no-console
    console.debug = noop;
    // eslint-disable-next-line no-console
    console.info = noop;
  }
}
