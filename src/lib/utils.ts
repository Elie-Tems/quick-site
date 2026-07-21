import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Hebrew → Latin transliteration map for URL slug generation.
// Covers standard Israeli pronunciation (no niqqud required).
const HEB_MAP: Record<string, string> = {
  א: "a", ב: "b", ג: "g", ד: "d", ה: "h", ו: "v", ז: "z",
  ח: "ch", ט: "t", י: "y", כ: "k", ך: "k", ל: "l",
  מ: "m", ם: "m", נ: "n", ן: "n", ס: "s", ע: "a", פ: "p",
  ף: "f", צ: "ts", ץ: "ts", ק: "k", ר: "r", ש: "sh", ת: "t",
  // geresh combinations (shin/sin dot handled via preceding letter)
};

export function hebrewToSlug(name: string): string {
  const latin = name
    .split("")
    .map((ch) => HEB_MAP[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return latin || "store";
}
