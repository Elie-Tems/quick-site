import { Rocket, Check, ShoppingBag, CreditCard, Globe, Headphones, Pencil } from "lucide-react";

/**
 * PROPOSAL / PREVIEW (item 10) - the "publish & pay" moment.
 *
 * Concept: instead of a busy dashboard banner, the merchant sees their FINISHED
 * site clearly behind (no blur), with one focused payment card on top. Seeing
 * "my site, ready" creates the desire to publish - a single clear action.
 *
 * This route (/preview/publish) is a static mock for approval. In production the
 * background becomes the merchant's real store preview and the button triggers
 * the publish payment. TEMPORARY - remove the /preview/* routes before launch.
 */

const products = [
  { img: "/templates/fashion-p1.jpg", name: "שמלת ערב", price: 389 },
  { img: "/templates/fashion-p2.jpg", name: "תיק עור", price: 749 },
  { img: "/templates/fashion-p3.jpg", name: "נעלי עקב", price: 459 },
  { img: "/templates/jewelry-p1.jpg", name: "שרשרת זהב", price: 590 },
];

const StorePreview = () => (
  <div className="min-h-screen bg-white" dir="rtl">
    {/* store header */}
    <div className="flex items-center justify-between px-6 h-16 border-b border-zinc-100">
      <div className="flex items-center gap-2 text-zinc-900 font-bold text-lg">
        <span className="w-8 h-8 rounded-lg bg-[#3B976C] flex items-center justify-center text-white">
          <ShoppingBag className="w-4 h-4" />
        </span>
        בוטיק אלגנט
      </div>
      <div className="flex items-center gap-5 text-sm text-zinc-500">
        <span>בית</span><span>קטלוג</span><span>צור קשר</span>
        <ShoppingBag className="w-5 h-5 text-zinc-700" />
      </div>
    </div>

    {/* hero */}
    <div className="relative h-64 md:h-80 overflow-hidden">
      <img src="/templates/fashion.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-l from-black/60 to-black/10" />
      <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-16 text-white">
        <div className="text-sm mb-2 opacity-90">קולקציית קיץ 2026</div>
        <div className="text-3xl md:text-5xl font-bold mb-3">עד 50% הנחה</div>
        <div className="inline-block w-fit px-5 py-2.5 rounded-full bg-[#3B976C] font-medium">קנו עכשיו</div>
      </div>
    </div>

    {/* products */}
    <div className="px-6 md:px-12 py-10">
      <h2 className="text-2xl font-bold text-zinc-900 mb-6 text-center">המוצרים שלנו</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto">
        {products.map((p, i) => (
          <div key={i} className="rounded-2xl border border-zinc-100 overflow-hidden bg-white shadow-sm">
            <img src={p.img} alt={p.name} className="w-full aspect-square object-cover" />
            <div className="p-3 text-right">
              <div className="text-sm text-zinc-800 font-medium">{p.name}</div>
              <div className="text-[#3B976C] font-bold mt-0.5">₪{p.price}</div>
              <div className="mt-2 text-center text-xs text-white bg-[#3B976C] rounded-lg py-2">הוסף לסל</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const PublishCheckoutPreview = () => {
  return (
    <div className="relative min-h-screen" dir="rtl">
      {/* The merchant's real site - clear, not blurred */}
      <StorePreview />

      {/* Readability scrim (no blur - the site stays clearly visible) */}
      <div className="fixed inset-0 bg-black/55" />

      {/* Focused payment card */}
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-7 md:p-8 text-center my-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#3B976C]/10 flex items-center justify-center mb-4">
            <Rocket className="w-8 h-8 text-[#3B976C]" />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">האתר שלך מוכן! 🎉</h1>
          <p className="text-zinc-500 mt-2">נשאר רק צעד אחד - להעלות אותו לאוויר ולהתחיל למכור.</p>

          {/* price */}
          <div className="my-6 rounded-2xl border-2 border-[#3B976C]/30 bg-[#3B976C]/5 py-5">
            <div className="text-4xl font-extrabold text-zinc-900">
              ₪69<span className="text-lg font-medium text-zinc-500"> / חודש</span>
            </div>
            <div className="text-sm text-[#3B976C] font-medium mt-1">ללא התחייבות · ביטול בכל עת</div>
          </div>

          {/* included */}
          <div className="space-y-2.5 text-right mb-6">
            {[
              { icon: Globe, t: "כתובת אתר אישית (דומיין)" },
              { icon: CreditCard, t: "קבלת תשלומים מלקוחות" },
              { icon: Headphones, t: "תמיכה מלאה בעברית" },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3 text-zinc-700">
                <span className="w-7 h-7 rounded-full bg-[#3B976C]/10 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-[#3B976C]" />
                </span>
                <row.icon className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-sm">{row.t}</span>
              </div>
            ))}
          </div>

          <button className="w-full h-14 rounded-2xl bg-[#3B976C] text-white text-lg font-bold hover:brightness-105 transition shadow-lg shadow-[#3B976C]/30">
            פרסם את האתר עכשיו
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 mt-4">
            <Pencil className="w-3.5 h-3.5" />
            תוכלו לערוך הכל (טקסטים, מוצרים, עיצוב) גם אחרי הפרסום.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublishCheckoutPreview;
