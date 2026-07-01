// Shared AI product-image style presets. Used by the in-product image studio
// (AIImageGenerator) so the advanced styling engine - on-model, skin tone,
// studio backgrounds - lives where the merchant edits the product. The
// standalone "AI images" dashboard screen is now credits/packages + gallery.

export type ProductType = "fashion" | "general";

export interface StyleOption {
  id: string;
  label: string;
  description: string;
  emoji: string;
}

export const FASHION_STYLES: StyleOption[] = [
  { id: "female_model", label: "על דוגמנית", description: "המוצר מוצג על דוגמנית נשית", emoji: "👩" },
  { id: "male_model", label: "על דוגמן", description: "המוצר מוצג על דוגמן גברי", emoji: "👨" },
  { id: "mannequin", label: "על מנקן", description: "אפקט מנקן בלתי נראה", emoji: "🪆" },
  { id: "studio_flat", label: "סטודיו שטוח", description: "צילום שטוח על רקע נקי", emoji: "📐" },
];

export const SKIN_TONE_OPTIONS = [
  { id: "light", label: "בהיר" },
  { id: "medium", label: "בינוני" },
  { id: "olive", label: "זית" },
  { id: "tan", label: "שזוף" },
  { id: "dark", label: "כהה" },
];

export const GENERAL_STYLES: StyleOption[] = [
  { id: "white_studio", label: "רקע לבן סטודיו", description: "תאורת סטודיו מקצועית", emoji: "💡" },
  { id: "solid_white", label: "רקע לבן", description: "מינימלי ונקי", emoji: "⬜" },
  { id: "solid_blue", label: "רקע כחול", description: "מודרני ורענן", emoji: "🟦" },
  { id: "solid_gray", label: "רקע אפור", description: "ניטרלי ומאוזן", emoji: "◻️" },
  { id: "solid_black", label: "רקע שחור", description: "דרמטי ויוקרתי", emoji: "⬛" },
  { id: "environment", label: "סביבה טבעית", description: "לייפסטייל אותנטי", emoji: "🌿" },
];

export const PROMPT_EXAMPLES = [
  "מוצר על שולחן עץ עם תאורה רכה",
  "רקע ים וחוף עם אווירה קיצית",
  "סטודיו מינימלי עם צלליות דרמטיות",
  "מוצר בסביבה יוקרתית עם שיש לבן",
];
