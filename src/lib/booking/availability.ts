/**
 * Pure slot-availability engine for the booking module - the algorithmic heart.
 * No I/O, no Deno/DB deps, so it is unit-testable AND usable both by the
 * server-authoritative edge function (which is the source of truth) and by the
 * frontend for optimistic display. All times are epoch-ms (UTC). Local working
 * hours are resolved to concrete UTC intervals by the CALLER (timezone/DST is a
 * separate, Intl-based concern) and passed in as `workingIntervals`.
 *
 * See docs/design-calendar-sync.md.
 */

export interface Interval {
  /** epoch ms, inclusive start */
  start: number;
  /** epoch ms, exclusive end */
  end: number;
}

export interface SlotOptions {
  /** service length in minutes */
  durationMin: number;
  /** prep padding before the appointment (kept free) */
  bufferBeforeMin?: number;
  /** cleanup padding after the appointment (kept free) */
  bufferAfterMin?: number;
  /** slot step in minutes (e.g. 15 -> :00 :15 :30 :45). Defaults to durationMin. */
  granularityMin?: number;
  /** earliest allowed start (epoch ms) - e.g. now + minNotice. Defaults 0. */
  minStart?: number;
  /** latest allowed start (epoch ms) - e.g. now + maxAdvance. Defaults Infinity. */
  maxStart?: number;
}

const MIN = 60_000;

/** True if [aStart,aEnd) overlaps [bStart,bEnd). Touching edges do NOT overlap. */
export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Generate available slot START times (epoch ms) within the given working
 * intervals, excluding anything that collides with a busy interval (appointments,
 * blackouts, external calendar busy) once the service's buffers are applied.
 */
export function generateSlots(
  workingIntervals: Interval[],
  busyIntervals: Interval[],
  opts: SlotOptions,
): number[] {
  const duration = Math.max(1, opts.durationMin) * MIN;
  const before = Math.max(0, opts.bufferBeforeMin ?? 0) * MIN;
  const after = Math.max(0, opts.bufferAfterMin ?? 0) * MIN;
  const step = Math.max(1, opts.granularityMin ?? opts.durationMin) * MIN;
  const minStart = opts.minStart ?? 0;
  const maxStart = opts.maxStart ?? Number.POSITIVE_INFINITY;

  const busy = [...busyIntervals].sort((a, b) => a.start - b.start);
  const out: number[] = [];

  for (const win of workingIntervals) {
    // last start that still fits the service inside this working interval
    const lastStart = win.end - duration;
    for (let t = win.start; t <= lastStart; t += step) {
      if (t < minStart || t > maxStart) continue;
      const occStart = t - before;         // buffered occupied range that must be free
      const occEnd = t + duration + after;
      let free = true;
      for (const b of busy) {
        if (b.start >= occEnd) break;      // sorted: no later busy can overlap
        if (overlaps(occStart, occEnd, b.start, b.end)) { free = false; break; }
      }
      if (free) out.push(t);
    }
  }
  return out;
}

/**
 * Resolve a weekday + local minute-of-day to a concrete UTC epoch-ms for a given
 * calendar date, honoring the IANA timezone (DST-correct). Used by the caller to
 * turn `booking_working_hours` rows into `workingIntervals` for generateSlots.
 */
export function localMinutesToUtc(dateYmd: string, minutes: number, timeZone: string): number {
  // dateYmd = 'YYYY-MM-DD'. Build the wall-clock time, then find the UTC instant
  // whose representation in `timeZone` matches it (accounts for the tz offset/DST).
  const [y, m, d] = dateYmd.split("-").map(Number);
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  // Guess UTC, then correct by the zone offset at that instant.
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const offset = tzOffsetMs(guess, timeZone);
  return guess - offset;
}

/** Offset (ms) of `timeZone` from UTC at instant `utcMs` (positive = ahead of UTC). */
export function tzOffsetMs(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value);
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour === 24 ? 0 : map.hour, map.minute, map.second);
  return asUtc - utcMs;
}
