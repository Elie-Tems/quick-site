import { useState, useEffect, useRef } from "react";

/**
 * Business-hours picker. Most sales sites take orders around the clock, so the
 * default (and prominent) option is "open 24/7"; merchants who really want fixed
 * hours can switch to the per-day editor. The selection is serialised into a
 * clean Hebrew string and reported via onChange (stored value stays a string).
 */

interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

const DAYS: { label: string; letter: string }[] = [
  { label: "ראשון", letter: "א׳" },
  { label: "שני", letter: "ב׳" },
  { label: "שלישי", letter: "ג׳" },
  { label: "רביעי", letter: "ד׳" },
  { label: "חמישי", letter: "ה׳" },
  { label: "שישי", letter: "ו׳" },
  { label: "שבת", letter: "שבת" },
];

const DEFAULT_HOURS: DayHours[] = [
  { open: true, from: "09:00", to: "18:00" },
  { open: true, from: "09:00", to: "18:00" },
  { open: true, from: "09:00", to: "18:00" },
  { open: true, from: "09:00", to: "18:00" },
  { open: true, from: "09:00", to: "18:00" },
  { open: true, from: "09:00", to: "14:00" },
  { open: false, from: "09:00", to: "18:00" },
];

const ALWAYS_OPEN_TEXT = "הזמנות מתקבלות בכל שעה (24/7)";

function serialize(hours: DayHours[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < 7) {
    if (!hours[i].open) { i++; continue; }
    let j = i;
    while (j + 1 < 7 && hours[j + 1].open && hours[j + 1].from === hours[i].from && hours[j + 1].to === hours[i].to) {
      j++;
    }
    const range = i === j ? DAYS[i].letter : `${DAYS[i].letter}-${DAYS[j].letter}`;
    parts.push(`${range} ${hours[i].from}-${hours[i].to}`);
    i = j + 1;
  }
  return parts.join(", ");
}

interface BusinessHoursPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const BusinessHoursPicker = ({ value, onChange }: BusinessHoursPickerProps) => {
  const [hours, setHours] = useState<DayHours[]>(DEFAULT_HOURS);
  const [mode, setMode] = useState<"always" | "custom">(
    value && value.trim() && !value.includes("24/7") && !value.includes("בכל שעה") ? "custom" : "always",
  );
  const initialised = useRef(false);

  // Default new merchants to 24/7 (the common case for online ordering).
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    if (!value || !value.trim()) onChange(ALWAYS_OPEN_TEXT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (next: DayHours[]) => {
    setHours(next);
    onChange(serialize(next));
  };
  const toggleDay = (index: number) => update(hours.map((d, i) => (i === index ? { ...d, open: !d.open } : d)));
  const setTime = (index: number, field: "from" | "to", v: string) =>
    update(hours.map((d, i) => (i === index ? { ...d, [field]: v } : d)));
  const applyToWeekdays = () => {
    const base = hours[0];
    update(hours.map((d, i) => (i <= 4 ? { ...base, open: true } : d)));
  };

  const chooseAlways = () => { setMode("always"); onChange(ALWAYS_OPEN_TEXT); };
  const chooseCustom = () => { setMode("custom"); onChange(serialize(hours)); };

  const preview = serialize(hours);

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={chooseAlways}
          className={`p-3 rounded-xl border-2 text-right transition-all ${
            mode === "always" ? "border-primary bg-primary/5" : "border-[#333] bg-[#1a1a1a] hover:border-primary/30"
          }`}
        >
          <div className="font-semibold text-sm text-foreground">🟢 פתוח להזמנות 24/7</div>
          <div className="text-xs text-muted-foreground mt-0.5">הלקוחות יכולים להזמין בכל שעה (מומלץ)</div>
        </button>
        <button
          type="button"
          onClick={chooseCustom}
          className={`p-3 rounded-xl border-2 text-right transition-all ${
            mode === "custom" ? "border-primary bg-primary/5" : "border-[#333] bg-[#1a1a1a] hover:border-primary/30"
          }`}
        >
          <div className="font-semibold text-sm text-foreground">🕒 שעות מותאמות</div>
          <div className="text-xs text-muted-foreground mt-0.5">הגדרת שעות פתיחה לכל יום</div>
        </button>
      </div>

      {mode === "always" ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
          ✓ הזמנות מתקבלות בכל שעה, כל ימות השבוע. אפשר תמיד לשנות בלוח הניהול.
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-[#333] bg-[#1a1a1a] p-3">
          <div className="space-y-1.5">
            {DAYS.map((day, i) => (
              <div key={day.label} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`w-24 h-9 rounded-lg text-sm font-medium transition-colors flex items-center justify-between px-3 ${
                    hours[i].open
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-[#222] text-muted-foreground border border-[#333]"
                  }`}
                >
                  <span>{day.label}</span>
                  <span className="text-xs">{hours[i].open ? "פתוח" : "סגור"}</span>
                </button>

                {hours[i].open ? (
                  <div className="flex items-center gap-2 flex-1" dir="ltr">
                    <input
                      type="time"
                      value={hours[i].from}
                      onChange={(e) => setTime(i, "from", e.target.value)}
                      className="h-9 px-2 rounded-lg bg-[#222] border border-[#333] text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-muted-foreground">-</span>
                    <input
                      type="time"
                      value={hours[i].to}
                      onChange={(e) => setTime(i, "to", e.target.value)}
                      className="h-9 px-2 rounded-lg bg-[#222] border border-[#333] text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                ) : (
                  <span className="flex-1 text-sm text-muted-foreground pr-1">סגור</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button type="button" onClick={applyToWeekdays} className="text-xs text-primary hover:underline">
              החל את שעות יום ראשון על א׳-ה׳
            </button>
            {preview && (
              <span className="text-xs text-muted-foreground truncate" title={preview}>
                {preview}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessHoursPicker;
