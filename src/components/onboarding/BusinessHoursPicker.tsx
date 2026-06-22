import { useState, useEffect, useRef } from "react";

/**
 * Friendly business-hours picker. Instead of free-typing "א׳-ה׳ 9:00-18:00…",
 * the merchant toggles each day open/closed and picks opening/closing times.
 * The component serialises the selection into a clean Hebrew string and reports
 * it via onChange, so the stored value stays a simple string (no DB change).
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
  { open: true, from: "09:00", to: "18:00" }, // ראשון
  { open: true, from: "09:00", to: "18:00" }, // שני
  { open: true, from: "09:00", to: "18:00" }, // שלישי
  { open: true, from: "09:00", to: "18:00" }, // רביעי
  { open: true, from: "09:00", to: "18:00" }, // חמישי
  { open: true, from: "09:00", to: "14:00" }, // שישי
  { open: false, from: "09:00", to: "18:00" }, // שבת
];

// Group consecutive open days with identical hours into ranges → clean string.
function serialize(hours: DayHours[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < 7) {
    if (!hours[i].open) {
      i++;
      continue;
    }
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
  const initialised = useRef(false);

  // On first mount, if no value is stored yet, seed the field with the sensible
  // default so the merchant starts from something instead of a blank box.
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    if (!value || !value.trim()) {
      onChange(serialize(DEFAULT_HOURS));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (next: DayHours[]) => {
    setHours(next);
    onChange(serialize(next));
  };

  const toggleDay = (index: number) => {
    const next = hours.map((d, i) => (i === index ? { ...d, open: !d.open } : d));
    update(next);
  };

  const setTime = (index: number, field: "from" | "to", v: string) => {
    const next = hours.map((d, i) => (i === index ? { ...d, [field]: v } : d));
    update(next);
  };

  // Quick action: copy Sunday's hours to all weekdays (Sun–Thu).
  const applyToWeekdays = () => {
    const base = hours[0];
    const next = hours.map((d, i) => (i <= 4 ? { ...base, open: true } : d));
    update(next);
  };

  const preview = serialize(hours);

  return (
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
                <span className="text-muted-foreground">–</span>
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
        <button
          type="button"
          onClick={applyToWeekdays}
          className="text-xs text-primary hover:underline"
        >
          החל את שעות יום ראשון על א׳–ה׳
        </button>
        {preview && (
          <span className="text-xs text-muted-foreground truncate" title={preview}>
            {preview}
          </span>
        )}
      </div>
    </div>
  );
};

export default BusinessHoursPicker;
