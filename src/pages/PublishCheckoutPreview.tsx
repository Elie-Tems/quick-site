import { Check, ShoppingBag, CreditCard, Headphones, RefreshCw, Pencil } from "lucide-react";

/**
 * PROPOSAL / PREVIEW (item 10) - the "publish & pay" moment.
 *
 * The merchant sees their finished site CLEARLY (the store fills the screen),
 * with a compact payment sheet at the bottom. Seeing "my site, ready" drives the
 * desire to publish; one clear action takes them to payment.
 *
 * /preview/publish is a static mock for approval. In production the background
 * becomes the merchant's real store and the button opens the payment page.
 * TEMPORARY - remove /preview/* routes before launch.
 */

const BRAND = "#3B976C";

const products = [
  { img: "/templates/fashion-p1.jpg", name: "שמלת ערב", price: 389 },
  { img: "/templates/fashion-p2.jpg", name: "תיק עור", price: 749 },
  { img: "/templates/fashion-p3.jpg", name: "נעלי עקב", price: 459 },
  { img: "/templates/jewelry-p1.jpg", name: "שרשרת זהב", price: 590 },
];

const StorePreview = () => (
  <div className="bg-white" dir="rtl">
    <div className="flex items-center justify-between px-6 h-16 border-b border-zinc-100">
      <div className="flex items-center gap-2 text-zinc-900 font-bold text-lg">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: BRAND }}>
          <ShoppingBag className="w-4 h-4" />
        </span>
        בוטיק אלגנט
      </div>
      <div className="flex items-center gap-5 text-sm text-zinc-500">
        <span>בית</span><span>קטלוג</span><span>צור קשר</span>
        <ShoppingBag className="w-5 h-5 text-zinc-700" />
      </div>
    </div>

    <div className="relative h-56 md:h-72 overflow-hidden">
      <img src="/templates/fashion.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-l from-black/55 to-black/10" />
      <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-16 text-white">
        <div className="text-sm mb-2 opacity-90">קולקציית קיץ 2026</div>
        <div className="text-3xl md:text-5xl font-bold mb-3">עד 50% הנחה</div>
        <div className="inline-block w-fit px-5 py-2.5 rounded-full font-medium" style={{ background: BRAND }}>קנו עכשיו</div>
      </div>
    </div>

    <div className="px-6 md:px-12 py-8">
      <h2 className="text-2xl font-bold text-zinc-900 mb-6 text-center">המוצרים שלנו</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto">
        {products.map((p, i) => (
          <div key={i} className="rounded-2xl border border-zinc-100 overflow-hidden bg-white shadow-sm">
            <img src={p.img} alt={p.name} className="w-full aspect-square object-cover" />
            <div className="p-3 text-right">
              <div className="text-sm text-zinc-800 font-medium">{p.name}</div>
              <div className="font-bold mt-0.5" style={{ color: BRAND }}>₪{p.price}</div>
              <div className="mt-2 text-center text-xs text-white rounded-lg py-2" style={{ background: BRAND }}>הוסף לסל</div>
            </div>
          </div>
        ))}
      </div>
    </div>
    {/* spacer so the bottom sheet never hides the last products */}
    <div className="h-80" />
  </div>
);

const PublishCheckoutPreview = () => {
  return (
    <div className="relative min-h-screen bg-white" dir="rtl">
      {/* The merchant's real site - clearly visible */}
      <StorePreview />

      {/* Compact payment sheet anchored at the bottom; the site stays visible above */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)] border-t border-zinc-100 p-5 md:p-6 text-center pointer-events-auto">
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">האתר שלך מוכן! 🎉</h1>
          <p className="text-zinc-500 text-sm mt-1">נשאר רק צעד אחד: להעלות אותו לאוויר ולהתחיל למכור.</p>

          <div className="my-4 flex items-center justify-center gap-2">
            <span className="text-3xl font-extrabold text-zinc-900">₪69</span>
            <span className="text-sm text-zinc-500">/ חודש · ללא התחייבות · ביטול בכל עת</span>
          </div>

          {/* what's included (no custom domain yet) */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mb-4 text-xs text-zinc-600">
            {[
              { icon: CreditCard, t: "קבלת תשלומים" },
              { icon: RefreshCw, t: "עדכונים ללא הגבלה" },
              { icon: Headphones, t: "תמיכה בעברית" },
            ].map((row, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" style={{ color: BRAND }} />
                <row.icon className="w-3.5 h-3.5 text-zinc-400" />
                {row.t}
              </span>
            ))}
          </div>

          <button
            className="w-full h-14 rounded-2xl text-white text-lg font-bold hover:brightness-105 transition shadow-lg"
            style={{ background: BRAND, boxShadow: `0 10px 24px ${BRAND}55` }}
          >
            כן, אני רוצה! קחו אותי לתשלום
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 mt-3">
            <Pencil className="w-3.5 h-3.5" />
            אפשר לערוך הכל (טקסטים, מוצרים, עיצוב) גם אחרי הפרסום.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublishCheckoutPreview;
