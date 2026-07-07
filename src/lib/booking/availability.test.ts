import { describe, it, expect } from "vitest";
import { generateSlots, overlaps, localMinutesToUtc, tzOffsetMs, type Interval } from "./availability";

// helper: build an interval from two "HH:MM" on a fixed UTC day
const D = "2026-07-14";
const at = (hhmm: string) => Date.parse(`${D}T${hhmm}:00Z`);
const win = (a: string, b: string): Interval => ({ start: at(a), end: at(b) });
const fmt = (ms: number) => new Date(ms).toISOString().slice(11, 16);

describe("overlaps", () => {
  it("touching edges do not overlap", () => {
    expect(overlaps(0, 10, 10, 20)).toBe(false);
    expect(overlaps(0, 10, 9, 20)).toBe(true);
  });
});

describe("generateSlots", () => {
  it("slices a working window into duration-sized slots", () => {
    const slots = generateSlots([win("09:00", "11:00")], [], { durationMin: 60 });
    expect(slots.map(fmt)).toEqual(["09:00", "10:00"]);
  });

  it("respects a finer granularity", () => {
    const slots = generateSlots([win("09:00", "10:30")], [], { durationMin: 60, granularityMin: 30 });
    expect(slots.map(fmt)).toEqual(["09:00", "09:30"]);
  });

  it("removes slots that collide with a busy interval", () => {
    const slots = generateSlots([win("09:00", "12:00")], [win("10:00", "10:30")], { durationMin: 60, granularityMin: 60 });
    // 09:00 ok; 10:00 collides; 11:00 ok
    expect(slots.map(fmt)).toEqual(["09:00", "11:00"]);
  });

  it("applies buffers around the appointment", () => {
    // 30-min buffer after a 10:00-10:30 busy block blocks a 10:30 start too
    const slots = generateSlots([win("09:00", "12:00")], [win("10:00", "10:30")], {
      durationMin: 30, granularityMin: 30, bufferBeforeMin: 30, bufferAfterMin: 30,
    });
    expect(slots.map(fmt)).not.toContain("09:30"); // buffer-after would hit 10:00
    expect(slots.map(fmt)).not.toContain("10:30"); // buffer-before would hit 10:30 busy end
    expect(slots.map(fmt)).toContain("11:00");
  });

  it("honors minStart (min notice)", () => {
    const slots = generateSlots([win("09:00", "12:00")], [], { durationMin: 60, granularityMin: 60, minStart: at("10:00") });
    expect(slots.map(fmt)).toEqual(["10:00", "11:00"]);
  });

  it("never returns a slot that overruns the working window", () => {
    const slots = generateSlots([win("09:00", "09:45")], [], { durationMin: 60 });
    expect(slots).toEqual([]);
  });
});

describe("timezone resolution (Asia/Jerusalem, DST-correct)", () => {
  it("summer (IDT, +3) resolves 09:00 local to 06:00Z", () => {
    const ms = localMinutesToUtc("2026-07-14", 9 * 60, "Asia/Jerusalem");
    expect(new Date(ms).toISOString()).toBe("2026-07-14T06:00:00.000Z");
  });

  it("winter (IST, +2) resolves 09:00 local to 07:00Z", () => {
    const ms = localMinutesToUtc("2026-01-14", 9 * 60, "Asia/Jerusalem");
    expect(new Date(ms).toISOString()).toBe("2026-01-14T07:00:00.000Z");
  });

  it("offset is +3h in summer, +2h in winter", () => {
    expect(tzOffsetMs(Date.parse("2026-07-14T12:00:00Z"), "Asia/Jerusalem")).toBe(3 * 3600_000);
    expect(tzOffsetMs(Date.parse("2026-01-14T12:00:00Z"), "Asia/Jerusalem")).toBe(2 * 3600_000);
  });
});
