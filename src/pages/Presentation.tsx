import { useState, useEffect, useCallback } from "react";
import SEOHead from "@/components/SEOHead";
import {
  Rocket, Package, ShoppingCart, Users, Palette, Megaphone, CreditCard, Globe,
  BookOpen, Sparkles, ChevronRight, ChevronLeft, Mail, MessageCircle,
} from "lucide-react";

// Standalone, presentable deck about the Siango system. Shareable link
// (/presentation), arrow-key / click navigation. RTL Hebrew, Siango branded.

const G = "#0E9F6E";

interface Slide {
  kind: "title" | "feature" | "soon" | "end";
  icon?: typeof Rocket;
  eyebrow?: string;
  title: string;
  points?: string[];
  badge?: string;
}

const SLIDES: Slide[] = [
  { kind: "title", title: "siango", eyebrow: "בניית חנות אונליין חכמה - בעברית, בדקות" },
  {
    kind: "feature", icon: Rocket, eyebrow: "ההתחלה", title: "בניית האתר באשף חכם",
    points: ["תהליך מודרך: תחום, עיצוב, פרטי עסק, מוצרים, פרסום", "AI מציע תיאורים, תמונות וטקסט 'אודות'", "תצוגה מקדימה חיה לאורך כל הדרך"],
  },
  {
    kind: "feature", icon: Package, eyebrow: "תוכן החנות", title: "ניהול מוצרים - הכל במקום אחד",
    points: ["רשימה / קטגוריות / מבצעים ומובילים - בטאבים", "הוספה ידנית, Excel, PDF, סריקת קישור, או הקלטה קולית", "תמונות מוצר ב-AI + עריכת תמונה בכתיבת הוראה"],
  },
  {
    kind: "feature", icon: ShoppingCart, eyebrow: "ניהול מכירות", title: "הזמנות ולקוחות (CRM)",
    points: ["ניהול הזמנות + סטטוסים שנשמרים אוטומטית", "כרטיס לקוח אוטומטי: LTV, היסטוריה, פרטי קשר", "סגמנטים (VIP / רדומים / חוזרים) + אזור הזדמנויות"],
  },
  {
    kind: "feature", icon: Palette, eyebrow: "מראה", title: "עיצוב החנות",
    points: ["תבניות, פונטים, צבע ראשי, תמונה ראשית", "ניהול באנרים", "שינויים מתעדכנים באתר מיד"],
  },
  {
    kind: "feature", icon: Megaphone, eyebrow: "צמיחה", title: "שיווק וקידום",
    points: ["קמפיינים + קופוני הנחה", "תגי מעקב (GTM/Analytics/Meta/Ads/טיקטוק) - ₪149 חד-פעמי", "ביקורות Google בחנות - ₪14/חודש", "מקורות הגעה + תובנות (משפך המרה)"],
  },
  {
    kind: "feature", icon: CreditCard, eyebrow: "תפעול", title: "סליקה, משלוחים ודומיין",
    points: ["PayPlus (אשראי + ביט + חשבוניות) או 'הזמנות בלבד'", "איסוף עצמי / משלוח + עלות משלוח", "רכישת דומיין אישי מתוך המערכת"],
  },
  {
    kind: "feature", icon: BookOpen, eyebrow: "תמיכה", title: "מרכז ידע ובוט חכם",
    points: ["מרכז ידע מסודר עם קטגוריות וחיפוש", "בוט עזרה בעברית בכל עמוד", "ריבוי שפות, מע\"מ, הסכמת עוגיות תקנית, חשבוניות"],
  },
  {
    kind: "soon", icon: Sparkles, eyebrow: "בקרוב", title: "מה שמגיע",
    points: ["וואטסאפ - שיחות, דיוור ובוט", "מייל עסקי על הדומיין שלך", "מערכת דיוור (Newsletter) מלאה", "CRM Pro - אוטומציות, AI ואזור אישי ללקוח"],
  },
  { kind: "end", icon: Rocket, title: "מתחילים?", eyebrow: "בשלב הבדיקות - הכל פתוח וללא תשלום", points: ["siango.app"] },
];

const Presentation = () => {
  const [i, setI] = useState(0);
  const go = useCallback((d: number) => setI((p) => Math.max(0, Math.min(SLIDES.length - 1, p + d))), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === " ") go(1);
      if (e.key === "ArrowRight") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const s = SLIDES[i];
  const Icon = s.icon;

  return (
    <div dir="rtl" style={{ fontFamily: "Heebo, Arial, sans-serif" }} className="min-h-screen bg-[#0B1120] text-white flex flex-col">
      <SEOHead title="מצגת המערכת | סיאנגו" noindex={true} />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          {s.kind === "title" || s.kind === "end" ? (
            <div className="text-center">
              {Icon && (
                <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: G }}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="text-5xl md:text-6xl font-extrabold tracking-tight" style={{ color: s.kind === "title" ? G : "#fff" }}>{s.title}</div>
              {s.eyebrow && <div className="text-lg text-white/70 mt-4">{s.eyebrow}</div>}
              {s.points && <div className="text-2xl font-bold mt-6" style={{ color: G }}>{s.points[0]}</div>}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                {Icon && (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: s.kind === "soon" ? "#7C3AED" : G }}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wider text-white/50">{s.eyebrow}</div>
                  <div className="text-3xl md:text-4xl font-extrabold">{s.title}</div>
                </div>
              </div>
              <ul className="space-y-3 mt-8">
                {s.points?.map((p, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-lg md:text-xl text-white/90">
                    <span className="mt-2 w-2 h-2 rounded-full shrink-0" style={{ background: s.kind === "soon" ? "#7C3AED" : G }} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
        <button onClick={() => go(-1)} disabled={i === 0} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronRight className="w-6 h-6" /></button>
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} className="w-2 h-2 rounded-full transition-colors" style={{ background: idx === i ? G : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
        <button onClick={() => go(1)} disabled={i === SLIDES.length - 1} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="w-6 h-6" /></button>
      </div>
      <div className="text-center text-xs text-white/30 pb-3">{i + 1} / {SLIDES.length} · חיצים לניווט</div>
    </div>
  );
};

export default Presentation;
