import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Phone, Star, Utensils, Coffee, ArrowLeft, ChefHat } from "lucide-react";
import { AuroraBg, Card, Pill, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

const MENU = {
  starters: [
    { name: "ברוסקטה עגבניות", desc: "לחם קלוי, עגבניות טריות, בזיליקום, שמן זית כתית", price: 48 },
    { name: "סלט קיסר", desc: "חסה רומנית, פרמזן, קרוטונים, רוטב קיסר קלאסי", price: 54 },
    { name: "ספ פיאצה", desc: "מרק עגבניות עשיר עם בזיליקום ושמנת", price: 46 },
  ],
  mains: [
    { name: "פסטה קרבונרה", desc: "ספגטי, ביצים, פנצ'טה, פרמזן, פלפל שחור גרוס", price: 82 },
    { name: "ריזוטו פטריות", desc: "אורז ארבוריו, תערובת פטריות, יין לבן, פרמזן", price: 88 },
    { name: "סטייק אנטריקוט", desc: "250 גר׳ בקר, תפוחי אדמה צלויים, ירקות עונתיים", price: 148 },
    { name: "פילה סלמון", desc: "סלמון נורווגי, מחית תפוחי אדמה, רוטב לימון-שמיר", price: 118 },
  ],
  drinks: [
    { name: "קפה בוטיק", desc: "מיקס עלייה בלנד, עשיר ומלא", price: 18 },
    { name: "גלידת בוטיק", desc: "שלוש כדורים, סירופ שוקולד, קצפת", price: 42 },
    { name: "קנה פנקוטה", desc: "קינוח איטלקי קלאסי, רוטב פירות יער", price: 46 },
  ],
};

const HOURS = [
  { day: "ראשון-חמישי", time: "12:00 – 23:00" },
  { day: "שישי", time: "12:00 – 16:00" },
  { day: "שבת", time: "20:00 – 24:00" },
];

const REVIEWS = [
  { name: "רונית ל.", text: "אוכל מדהים, אווירה נעימה. הקרבונרה הכי טובה שאכלתי בישראל!", stars: 5 },
  { name: "אמיר כ.", text: "שירות אישי ומקצועי, המלצר ידע להסביר כל מנה. נחזור!", stars: 5 },
  { name: "תמר מ.", text: "ערב נפלא לאירוע משפחתי. המנהל הגיע לברך אותנו אישית.", stars: 5 },
];

function MenuSection({ title, items }: { title: string; items: typeof MENU.mains }) {
  return (
    <div>
      <h3 className="text-xl font-display font-bold pv-strong mb-4 border-b pv-border pb-2">{title}</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.name} className="flex justify-between gap-4">
            <div>
              <p className="font-semibold pv-strong text-sm">{item.name}</p>
              <p className="text-xs pv-muted mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
            <span className="shrink-0 font-display font-bold pv-strong text-sm">₪{item.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const RestaurantSite = () => {
  const [reserveName, setReserveName] = useState("");
  const [reservePhone, setReservePhone] = useState("");
  const [guests, setGuests] = useState("2");
  const [submitted, setSubmitted] = useState(false);

  const handleReserve = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="מסעדה / בית קפה – אתר תדמית ותפריט (צד לקוח)" />
      <StoreTopBar
        name="ביסטרו לה-שף"
        tagline="מטבח ים-תיכוני בלב העיר"
        cta={
          <>
            <a href="#menu" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">תפריט</a>
            <a href="#about" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">אודות</a>
            <a href="#reserve" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium">
              <Utensils className="w-4 h-4" /> הזמינו מקום
            </a>
          </>
        }
      />

      {/* HERO */}
      <section className="relative h-[72vh] min-h-[440px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80"
          alt="המסעדה"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-6xl mx-auto px-4 md:px-6 pb-14 w-full">
            <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur border border-white/25 text-white text-xs mb-4">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> מומלץ מספר 1 בעיר • 2024
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-[1.05] mb-3">
                טעמים שלא<br />שוכחים
              </h1>
              <p className="text-lg text-white/75 mb-7 max-w-md">מטבח ים-תיכוני מחוון, מרכיבים טריים מהשוק הסמוך, בישול אמיתי של שף.</p>
              <div className="flex flex-wrap gap-3">
                <a href="#reserve" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                  הזמינו מקום <ArrowLeft className="w-5 h-5" />
                </a>
                <a href="#menu" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white font-semibold hover:bg-white/20 transition-colors">
                  לתפריט
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* INFO STRIP */}
      <div className="border-y pv-border pv-surface2">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-6 items-center justify-center md:justify-start text-sm pv-muted">
          <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> רחוב הירקון 45, תל אביב</span>
          <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> 03-555-1234</span>
          <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> שבת-חמישי 12:00–23:00</span>
        </div>
      </div>

      {/* MENU */}
      <section id="menu" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Pill tone="primary"><ChefHat className="w-3.5 h-3.5 inline ml-1" />תפריט</Pill>
            <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong mt-3 mb-2">מה יש לאכול</h2>
            <p className="pv-muted max-w-lg mx-auto">כל מנה מוכנה לפי הזמנה. המרכיבים מגיעים מהשוק הסמוך כל בוקר.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <MenuSection title="פתיחות" items={MENU.starters} />
            <MenuSection title="עיקריות" items={MENU.mains} />
            <MenuSection title="משקאות וקינוחים" items={MENU.drinks} />
          </div>
          <p className="text-xs pv-faint text-center mt-6">המחירים כוללים מע״מ. תפריט מלא עם מנות יומיות זמין במקום.</p>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-20 px-4 pv-surface2 border-y pv-border">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Pill tone="muted"><Coffee className="w-3.5 h-3.5 inline ml-1" />הסיפור שלנו</Pill>
            <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong mt-3 mb-4">מסעדה עם נשמה</h2>
            <p className="pv-text leading-relaxed mb-4">
              ביסטרו לה-שף נפתח ב-2018 מתוך אהבה אמיתית לאוכל. השף ישי כהן גדל במטבח של סבתא,
              ולמד בפריז - ולאחר שנים בחו"ל חזר לישראל עם הרצון להביא מטבח אמיתי לתל אביב.
            </p>
            <p className="pv-text leading-relaxed mb-6">
              כל מנה מוכנה מאפס, המרכיבים מגיעים מהשוק הסמוך כל בוקר, והתפריט משתנה עם העונות.
              אצלנו לא תמצאו פריזרים - רק בישול טרי.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[["6+", "שנות ניסיון"], ["200+", "מנות בשבוע"], ["4.9★", "דירוג גוגל"]].map(([v, l]) => (
                <div key={l} className="rounded-2xl pv-surface2 border pv-border p-4">
                  <div className="text-xl font-display font-bold text-primary">{v}</div>
                  <div className="text-xs pv-muted mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&q=80",
              "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&q=80",
              "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80",
              "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=500&q=80",
            ].map((src, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className={`rounded-2xl overflow-hidden ${i === 0 ? "col-span-2" : ""}`}>
                <img src={src} alt="" className={`w-full object-cover ${i === 0 ? "h-48" : "h-36"}`} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOURS */}
      <section className="py-14 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-display font-bold pv-strong mb-6">שעות פתיחה</h2>
          <Card className="p-6 text-right">
            <div className="space-y-3">
              {HOURS.map((h) => (
                <div key={h.day} className="flex justify-between text-sm">
                  <span className="pv-muted">{h.day}</span>
                  <span className="font-semibold pv-strong font-mono" dir="ltr">{h.time}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t pv-border flex gap-3">
              <a href="tel:035551234" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border pv-border text-sm pv-text hover:border-primary/40 transition-colors">
                <Phone className="w-4 h-4" /> 03-555-1234
              </a>
              <a href="https://wa.me/9721234567" target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25d366] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                וואטסאפ
              </a>
            </div>
          </Card>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="py-14 px-4 pv-surface2 border-y pv-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-display font-bold pv-strong text-center mb-8">מה אומרים עלינו</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {REVIEWS.map((r) => (
              <Card key={r.name} className="p-5">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: r.stars }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm pv-text leading-relaxed mb-3">"{r.text}"</p>
                <p className="text-xs pv-muted font-semibold">{r.name}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* RESERVATION */}
      <section id="reserve" className="py-20 px-4">
        <div className="max-w-md mx-auto text-center">
          <Pill tone="primary"><Utensils className="w-3.5 h-3.5 inline ml-1" />הזמנת מקום</Pill>
          <h2 className="text-2xl font-display font-bold pv-strong mt-3 mb-2">שמרו לכם מקום</h2>
          <p className="pv-muted text-sm mb-7">נחזור אליכם לאישור תוך שעה</p>
          <Card className="p-6 text-right">
            {submitted ? (
              <div className="py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
                  <ChefHat className="w-7 h-7 text-primary" />
                </div>
                <p className="font-bold pv-strong text-lg mb-1">תודה!</p>
                <p className="pv-muted text-sm">ניצור איתכם קשר בקרוב לאישור</p>
              </div>
            ) : (
              <form onSubmit={handleReserve} className="space-y-3">
                <input value={reserveName} onChange={(e) => setReserveName(e.target.value)} placeholder="שם מלא" required
                  className="w-full px-4 py-2.5 rounded-xl border pv-border pv-surface2 text-sm pv-text placeholder:pv-faint focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={reservePhone} onChange={(e) => setReservePhone(e.target.value)} placeholder="טלפון" type="tel" required
                  className="w-full px-4 py-2.5 rounded-xl border pv-border pv-surface2 text-sm pv-text placeholder:pv-faint focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <select value={guests} onChange={(e) => setGuests(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border pv-border pv-surface2 text-sm pv-text focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {["1", "2", "3", "4", "5", "6", "7", "8+"].map((n) => <option key={n} value={n}>{n} סועדים</option>)}
                </select>
                <button type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity">
                  <Utensils className="w-4 h-4" /> שלחו בקשה
                </button>
              </form>
            )}
          </Card>
        </div>
      </section>
    </PreviewThemeRoot>
  );
};

export default RestaurantSite;
