// Curated modern fonts for store customization. Each merchant can pick a heading
// font and a body font; the storefront loads them from Google Fonts and applies
// them. Kept to a tasteful, modern, Hebrew-supporting set (no font soup).

export interface StoreFont {
  id: string;
  label: string;                 // Hebrew label for the picker
  family: string;                // CSS font-family value
  google: string;                // Google Fonts "family=" param (with weights)
  category: "sans" | "serif" | "display";
  preview: string;               // a short Hebrew sample
}

export const STORE_FONTS: StoreFont[] = [
  { id: "heebo", label: "Heebo · נקי ומודרני", family: "'Heebo', sans-serif", google: "Heebo:wght@400;500;700;800", category: "sans", preview: "העסק שלי" },
  { id: "rubik", label: "Rubik · עגול וידידותי", family: "'Rubik', sans-serif", google: "Rubik:wght@400;500;700;800", category: "sans", preview: "העסק שלי" },
  { id: "assistant", label: "Assistant · אלגנטי", family: "'Assistant', sans-serif", google: "Assistant:wght@400;600;700;800", category: "sans", preview: "העסק שלי" },
  { id: "plex", label: "IBM Plex · עכשווי", family: "'IBM Plex Sans Hebrew', sans-serif", google: "IBM+Plex+Sans+Hebrew:wght@400;500;700", category: "sans", preview: "העסק שלי" },
  { id: "noto", label: "Noto Sans · ניטרלי", family: "'Noto Sans Hebrew', sans-serif", google: "Noto+Sans+Hebrew:wght@400;500;700;800", category: "sans", preview: "העסק שלי" },
  { id: "secular", label: "Secular One · כותרות נועזות", family: "'Secular One', sans-serif", google: "Secular+One", category: "display", preview: "העסק שלי" },
  { id: "suez", label: "Suez One · סריף נועז", family: "'Suez One', serif", google: "Suez+One", category: "display", preview: "העסק שלי" },
  { id: "frank", label: "Frank Ruhl · סריף קלאסי", family: "'Frank Ruhl Libre', serif", google: "Frank+Ruhl+Libre:wght@400;500;700;900", category: "serif", preview: "העסק שלי" },
  { id: "varela", label: "Varela Round · רך ועגול", family: "'Varela Round', sans-serif", google: "Varela+Round", category: "sans", preview: "העסק שלי" },
];

export const getStoreFont = (id?: string | null): StoreFont | undefined =>
  STORE_FONTS.find((f) => f.id === id);

/** Inject (once) the Google Fonts <link> for the chosen heading/body fonts. */
export function loadStoreFonts(headingId?: string | null, bodyId?: string | null): void {
  if (typeof document === "undefined") return;
  const fams = [getStoreFont(headingId)?.google, getStoreFont(bodyId)?.google].filter(Boolean);
  if (!fams.length) return;
  const href = `https://fonts.googleapis.com/css2?${fams.map((f) => `family=${f}`).join("&")}&display=swap`;
  const id = "store-fonts-link";
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}
