// Multi-faith holiday layer for the booking calendar.
//
// Every date here is COMPUTED at runtime - Jewish + Muslim dates come from the
// browser's built-in ICU calendars (Intl, "islamic-umalqura" = the official
// Umm al-Qura calendar), Christian dates from fixed Gregorian dates plus the
// standard Gauss/Meeus Easter algorithm. Nothing is hardcoded per-year or
// guessed, so the layer stays correct for any year without maintenance.

export type Faith = "jewish" | "christian" | "muslim";

export interface Holiday {
  date: string; // YYYY-MM-DD (local)
  name: string;
  faith: Faith;
}

export interface HolidayPrefs {
  jewish: boolean;
  christian: boolean;
  muslim: boolean;
}

export const DEFAULT_HOLIDAY_PREFS: HolidayPrefs = {
  jewish: true,
  christian: false,
  muslim: false,
};

export const FAITH_META: Record<Faith, { label: string; color: string }> = {
  jewish: { label: "חגים יהודיים", color: "#2563eb" },
  christian: { label: "חגים נוצריים", color: "#7c3aed" },
  muslim: { label: "חגים מוסלמיים", color: "#059669" },
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// --- Jewish: read the Hebrew date from ICU and match by month name + day. ---
const hebParts = (d: Date) => {
  const parts = new Intl.DateTimeFormat("en-u-ca-hebrew", { month: "long", day: "numeric" }).formatToParts(d);
  const month = (parts.find((p) => p.type === "month")?.value ?? "").toLowerCase();
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  return { month, day };
};

const jewishHoliday = (d: Date): string | null => {
  const { month, day } = hebParts(d);
  const is = (stem: string) => month.startsWith(stem);
  if (is("tishri") && day === 1) return "ראש השנה";
  if (is("tishri") && day === 10) return "יום כיפור";
  if (is("tishri") && day === 15) return "סוכות";
  if (is("tishri") && day === 22) return "שמחת תורה";
  if (is("kislev") && day === 25) return "חנוכה";
  if ((is("shevat") || is("shvat")) && day === 15) return 'ט"ו בשבט';
  // Non-leap year: "Adar". Leap year: Purim falls in "Adar II".
  if ((month === "adar" || month === "adar ii") && day === 14) return "פורים";
  if (is("nisan") && day === 15) return "פסח";
  if ((is("iyar") || is("iyyar")) && day === 5) return "יום העצמאות";
  if ((is("iyar") || is("iyyar")) && day === 18) return 'ל"ג בעומר';
  if (is("sivan") && day === 6) return "שבועות";
  if (month === "av" && day === 9) return "תשעה באב";
  return null;
};

// --- Muslim: numeric month from the Umm al-Qura calendar is stable (12 months, no leap month). ---
const islParts = (d: Date) => {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric", day: "numeric" }).formatToParts(d);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  return { month, day };
};

const muslimHoliday = (d: Date): string | null => {
  const { month, day } = islParts(d);
  if (month === 1 && day === 1) return "ראש השנה ההיג'רי";
  if (month === 1 && day === 10) return "יום עאשוראא";
  if (month === 3 && day === 12) return "מולד א-נבי";
  if (month === 9 && day === 1) return "תחילת רמדאן";
  if (month === 10 && day === 1) return "עיד אל-פיטר";
  if (month === 12 && day === 10) return "עיד אל-אדחא";
  return null;
};

// --- Christian: fixed Gregorian dates + computed Western (Gregorian) Easter. ---
const easterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const dd = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - dd - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const christianHoliday = (d: Date, easter: Date, goodFriday: Date): string | null => {
  const mo = d.getMonth() + 1;
  const day = d.getDate();
  if (mo === 12 && day === 25) return "חג המולד";
  if (mo === 1 && day === 6) return "חג ההתגלות";
  if (d.getTime() === easter.getTime()) return "פסחא";
  if (d.getTime() === goodFriday.getTime()) return "יום שישי הטוב";
  return null;
};

/** Every holiday (in the enabled faiths) that falls inside the given Gregorian month. */
export const holidaysForMonth = (year: number, month0: number, prefs: HolidayPrefs): Holiday[] => {
  const out: Holiday[] = [];
  const easter = easterSunday(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month0, day);
    if (prefs.jewish) {
      const n = jewishHoliday(d);
      if (n) out.push({ date: iso(d), name: n, faith: "jewish" });
    }
    if (prefs.christian) {
      const n = christianHoliday(d, easter, goodFriday);
      if (n) out.push({ date: iso(d), name: n, faith: "christian" });
    }
    if (prefs.muslim) {
      const n = muslimHoliday(d);
      if (n) out.push({ date: iso(d), name: n, faith: "muslim" });
    }
  }
  return out;
};

const PREFS_KEY = "siango.calendarHolidayPrefs";

export const loadHolidayPrefs = (): HolidayPrefs => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_HOLIDAY_PREFS };
    return { ...DEFAULT_HOLIDAY_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_HOLIDAY_PREFS };
  }
};

export const saveHolidayPrefs = (prefs: HolidayPrefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
};
