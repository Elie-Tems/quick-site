// Anniversary billing schedule. A subscription is charged on the same day-of-month the
// merchant joined (billing_anchor_day), NOT the 1st of the month. Shared by the first
// charge (billing-cardcom-webhook) and the monthly cron (billing-charge-run) so the
// date logic never drifts between them.

/** Last day-of-month for (year, monthIndex 0-11). */
function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * The next charge timestamp (UTC ms, 00:00) on the anniversary day-of-month AFTER
 * `fromMs`. The anchor day is clamped to the target month's length (joined on the 31st
 * -> the 28th/30th in shorter months). `minDays` guards against a too-soon first charge
 * (e.g. joined on the 31st, next month is short) by skipping to the following month.
 */
export function nextAnniversaryChargeMs(fromMs: number, anchorDay: number, minDays = 0): number {
  const day = Math.min(Math.max(1, Math.floor(anchorDay) || 1), 31);
  const d = new Date(fromMs);
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth(); // 0-11 (current month)

  const advance = () => { m++; if (m > 11) { m = 0; y++; } };
  advance(); // start from NEXT month
  let ms = Date.UTC(y, m, Math.min(day, lastDayOfMonth(y, m)), 0, 0, 0);
  while (ms - fromMs < minDays * 864e5) {
    advance();
    ms = Date.UTC(y, m, Math.min(day, lastDayOfMonth(y, m)), 0, 0, 0);
  }
  return ms;
}

/** Whole days from `fromMs` until `toMs` (floored, never negative). */
export function daysBetween(fromMs: number, toMs: number): number {
  return Math.max(0, Math.floor((toMs - fromMs) / 864e5));
}
