// Business category configuration for dynamic storefront content

export type BusinessCategory = 
  | "bakery" 
  | "restaurant" 
  | "cafe" 
  | "clothing" 
  | "jewelry" 
  | "electronics" 
  | "beauty" 
  | "fitness" 
  | "automotive" 
  | "pets" 
  | "flowers" 
  | "books" 
  | "home" 
  | "grocery" 
  | "wine_alcohol"
  | "toys"
  | "art"
  | "baby"
  | "gifts"
  | "pharmacy"
  | "furniture"
  | "appliances"
  | "handmade"
  | "other";

interface CategoryConfig {
  categories: string[];
  tagline: string;
  ctaText: string;
  heroBadge: string;
  heroImage: string;
  promoBenefits: string[];
}

const categoryConfigs: Record<BusinessCategory, CategoryConfig> = {
  bakery: {
    categories: ["הכל", "לחמים", "מאפים מתוקים", "עוגות"],
    tagline: "המאפים הכי טריים, ישר מהתנור",
    ctaText: "לתפריט המלא",
    heroBadge: "טרי היום",
    heroImage: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1920&q=80",
    promoBenefits: ["אפייה טרייה כל יום", "איסוף עצמי ללא המתנה", "משלוחים לכל האזור"],
  },
  restaurant: {
    categories: ["הכל", "ראשונות", "עיקריות", "קינוחים", "משקאות"],
    tagline: "חוויה קולינרית שלא תשכחו",
    ctaText: "לתפריט",
    heroBadge: "הזמינו עכשיו",
    heroImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80",
    promoBenefits: ["משלוחים חמים", "חומרי גלם טריים", "שף מקצועי"],
  },
  cafe: {
    categories: ["הכל", "קפה", "מאפים", "ארוחות בוקר", "משקאות"],
    tagline: "הקפה המושלם מחכה לכם",
    ctaText: "לתפריט",
    heroBadge: "קפה טרי",
    heroImage: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1920&q=80",
    promoBenefits: ["קפה איכותי", "אווירה נעימה", "מאפים טריים"],
  },
  clothing: {
    categories: ["הכל", "חדש", "נשים", "גברים"],
    tagline: "האופנה הכי חמה, במחירים הכי טובים",
    ctaText: "לקולקציה",
    heroBadge: "חדש בחנות",
    heroImage: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=80",
    promoBenefits: ["משלוח חינם מעל ₪199", "החלפה והחזרה עד 14 יום", "מותגים מובילים"],
  },
  jewelry: {
    categories: ["הכל", "טבעות", "שרשראות", "עגילים", "צמידים"],
    tagline: "תכשיטים שמספרים סיפור",
    ctaText: "לקולקציה",
    heroBadge: "עיצובים חדשים",
    heroImage: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1920&q=80",
    promoBenefits: ["תכשיטים מקוריים", "אריזת מתנה מהודרת", "אחריות לשנה"],
  },
  electronics: {
    categories: ["הכל", "סמארטפונים", "מחשבים", "אביזרים"],
    tagline: "הטכנולוגיה המתקדמת ביותר",
    ctaText: "לחנות",
    heroBadge: "מוצרים חדשים",
    heroImage: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1920&q=80",
    promoBenefits: ["אחריות יבואן רשמי", "תמיכה טכנית", "משלוח מהיר"],
  },
  beauty: {
    categories: ["הכל", "טיפוח פנים", "איפור", "שיער", "בשמים"],
    tagline: "יופי שמתחיל מבפנים",
    ctaText: "לחנות",
    heroBadge: "חדש בחנות",
    heroImage: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1920&q=80",
    promoBenefits: ["מותגים מובילים", "דגימות חינם", "ייעוץ מקצועי"],
  },
  fitness: {
    categories: ["הכל", "ביגוד", "ציוד", "תוספים", "אביזרים"],
    tagline: "הציוד שיעזור לך להגיע לשיא",
    ctaText: "לחנות",
    heroBadge: "קולקציה חדשה",
    heroImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80",
    promoBenefits: ["מותגי ספורט מובילים", "ייעוץ מקצועי", "משלוח מהיר"],
  },
  automotive: {
    categories: ["הכל", "אביזרים", "טיפוח רכב", "חלקי חילוף"],
    tagline: "הכל לרכב שלך במקום אחד",
    ctaText: "לחנות",
    heroBadge: "מוצרים חדשים",
    heroImage: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80",
    promoBenefits: ["מותגים מובילים", "התקנה במקום", "אחריות מלאה"],
  },
  pets: {
    categories: ["הכל", "מזון", "אביזרים", "צעצועים", "טיפוח"],
    tagline: "הכל לחבר הכי טוב שלך",
    ctaText: "לחנות",
    heroBadge: "מוצרים חדשים",
    heroImage: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1920&q=80",
    promoBenefits: ["מזון איכותי", "משלוח עד הבית", "מבצעים שבועיים"],
  },
  flowers: {
    categories: ["הכל", "זרים", "עציצים", "אירועים", "מנויים"],
    tagline: "פרחים שמביאים חיוך",
    ctaText: "לחנות",
    heroBadge: "פרחים טריים",
    heroImage: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=1920&q=80",
    promoBenefits: ["פרחים טריים יומיים", "משלוחים ארציים", "אריזה מהודרת"],
  },
  books: {
    categories: ["הכל", "רבי מכר", "ילדים", "עיון"],
    tagline: "עולם של ספרים מחכה לך",
    ctaText: "לחנות",
    heroBadge: "ספרים חדשים",
    heroImage: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1920&q=80",
    promoBenefits: ["מגוון עצום", "משלוח מהיר", "מבצעים קבועים"],
  },
  home: {
    categories: ["הכל", "רהיטים", "עיצוב", "מטבח", "גינה"],
    tagline: "עיצוב הבית שחלמתם עליו",
    ctaText: "לקולקציה",
    heroBadge: "עיצובים חדשים",
    heroImage: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1920&q=80",
    promoBenefits: ["עיצוב ייחודי", "הובלה והרכבה", "אחריות מלאה"],
  },
  grocery: {
    categories: ["הכל", "פירות וירקות", "מוצרי חלב", "בשר ודגים"],
    tagline: "מוצרים טריים עד הבית",
    ctaText: "להזמנה",
    heroBadge: "משלוח מהיר",
    heroImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1920&q=80",
    promoBenefits: ["מוצרים טריים", "משלוח מהיר", "מבצעים יומיים"],
  },
  wine_alcohol: {
    categories: ["הכל", "יינות אדומים", "יינות לבנים", "משקאות חריפים", "ליקרים"],
    tagline: "המשקאות המשובחים ביותר",
    ctaText: "לחנות",
    heroBadge: "קולקציה חדשה",
    heroImage: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1920&q=80",
    promoBenefits: ["יינות בוטיק", "ייעוץ מקצועי", "משלוח מהיר ובטוח"],
  },
  toys: {
    categories: ["הכל", "משחקי קופסה", "צעצועים לגיל הרך", "בובות", "לגו ובנייה"],
    tagline: "עולם של משחק והנאה",
    ctaText: "לחנות",
    heroBadge: "מוצרים חדשים",
    heroImage: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=1920&q=80",
    promoBenefits: ["משחקים איכותיים", "מתאים לכל הגילאים", "משלוח מהיר"],
  },
  art: {
    categories: ["הכל", "ציורים", "פיסול", "הדפסים", "אומנות דיגיטלית"],
    tagline: "אומנות שמדברת אל הלב",
    ctaText: "לגלריה",
    heroBadge: "יצירות מקוריות",
    heroImage: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1920&q=80",
    promoBenefits: ["יצירות מקוריות", "אמנים מקומיים", "אריזה מוגנת"],
  },
  baby: {
    categories: ["הכל", "ביגוד תינוקות", "עגלות וכיסאות", "צעצועי התפתחות", "טיפוח"],
    tagline: "הכל לתינוק שלך",
    ctaText: "לחנות",
    heroBadge: "קולקציה חדשה",
    heroImage: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=1920&q=80",
    promoBenefits: ["מוצרים בטיחותיים", "מותגים מובילים", "משלוח מהיר"],
  },
  gifts: {
    categories: ["הכל", "מתנות ליום הולדת", "חתונות ואירועים", "מארזים", "מתנות מיוחדות"],
    tagline: "המתנה המושלמת לכל אירוע",
    ctaText: "לחנות",
    heroBadge: "רעיונות למתנות",
    heroImage: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=1920&q=80",
    promoBenefits: ["אריזת מתנה חינם", "מגוון ענק", "משלוח מהיר"],
  },
  pharmacy: {
    categories: ["הכל", "תרופות ללא מרשם", "ויטמינים", "טיפוח ובריאות", "ציוד רפואי"],
    tagline: "בריאות ורווחה במקום אחד",
    ctaText: "לחנות",
    heroBadge: "מוצרי בריאות",
    heroImage: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1920&q=80",
    promoBenefits: ["ייעוץ מקצועי", "מוצרים מאושרים", "משלוח דיסקרטי"],
  },
  furniture: {
    categories: ["הכל", "סלונים", "חדרי שינה", "פינות אוכל", "משרדי"],
    tagline: "רהיטים שמעצבים את הבית",
    ctaText: "לקולקציה",
    heroBadge: "עיצובים חדשים",
    heroImage: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1920&q=80",
    promoBenefits: ["איכות גבוהה", "הובלה והרכבה", "אחריות מלאה"],
  },
  appliances: {
    categories: ["הכל", "מקררים", "מכונות כביסה", "מזגנים", "קטנים"],
    tagline: "מוצרי החשמל הטובים ביותר",
    ctaText: "לחנות",
    heroBadge: "מבצעים חמים",
    heroImage: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1920&q=80",
    promoBenefits: ["אחריות יבואן", "התקנה מקצועית", "מחירים תחרותיים"],
  },
  handmade: {
    categories: ["הכל", "תכשיטים בעבודת יד", "קרמיקה", "טקסטיל", "מתנות מיוחדות"],
    tagline: "יצירות יד מקוריות ומיוחדות",
    ctaText: "לחנות",
    heroBadge: "עבודת יד",
    heroImage: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1920&q=80",
    promoBenefits: ["יצירות מקוריות", "תמיכה ביוצרים מקומיים", "אריזה מיוחדת"],
  },
  other: {
    categories: ["הכל", "מוצרים"],
    tagline: "הכל במקום אחד",
    ctaText: "לחנות",
    heroBadge: "חדש",
    heroImage: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1920&q=80",
    promoBenefits: ["שירות מעולה", "מחירים הוגנים", "משלוח מהיר"],
  },
};

/** רשימת קטגוריות עסק עם תוויות עבריות – מקור אמת אחד לאונבורדינג, דשבורד וחנות */
export const businessCategoryList: { id: BusinessCategory; label: string }[] = [
  { id: "bakery", label: "מאפייה" },
  { id: "restaurant", label: "מסעדה" },
  { id: "cafe", label: "בית קפה" },
  { id: "clothing", label: "אופנה" },
  { id: "jewelry", label: "תכשיטים" },
  { id: "electronics", label: "אלקטרוניקה" },
  { id: "beauty", label: "יופי וטיפוח" },
  { id: "fitness", label: "כושר" },
  { id: "automotive", label: "רכבים" },
  { id: "pets", label: "חיות מחמד" },
  { id: "flowers", label: "פרחים" },
  { id: "books", label: "ספרים" },
  { id: "home", label: "עיצוב הבית" },
  { id: "grocery", label: "מכולת" },
  { id: "wine_alcohol", label: "יין ואלכוהול" },
  { id: "toys", label: "צעצועים" },
  { id: "art", label: "אומנות" },
  { id: "baby", label: "תינוקות" },
  { id: "gifts", label: "מתנות" },
  { id: "pharmacy", label: "בריאות ופארם" },
  { id: "furniture", label: "ריהוט" },
  { id: "appliances", label: "מוצרי חשמל" },
  { id: "handmade", label: "יצירות יד" },
  { id: "other", label: "אחר" },
];

export function getCategoryConfig(category?: BusinessCategory): CategoryConfig {
  if (!category || !categoryConfigs[category]) {
    return categoryConfigs.other;
  }
  return categoryConfigs[category];
}
