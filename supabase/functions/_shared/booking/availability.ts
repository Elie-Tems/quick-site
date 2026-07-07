// Deno mirror of src/lib/booking/availability.ts (unit-tested there - 10 tests).
// Keep the two IN SYNC. Pure functions, no deps, so they are byte-identical.
// The SERVER (this copy) is the authoritative availability computation.

export interface Interval { start: number; end: number }

export interface SlotOptions {
  durationMin: number;
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
  granularityMin?: number;
  minStart?: number;
  maxStart?: number;
}

const MIN = 60_000;

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

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
    const lastStart = win.end - duration;
    for (let t = win.start; t <= lastStart; t += step) {
      if (t < minStart || t > maxStart) continue;
      const occStart = t - before;
      const occEnd = t + duration + after;
      let free = true;
      for (const b of busy) {
        if (b.start >= occEnd) break;
        if (overlaps(occStart, occEnd, b.start, b.end)) { free = false; break; }
      }
      if (free) out.push(t);
    }
  }
  return out;
}

export function localMinutesToUtc(dateYmd: string, minutes: number, timeZone: string): number {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const offset = tzOffsetMs(guess, timeZone);
  return guess - offset;
}

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
