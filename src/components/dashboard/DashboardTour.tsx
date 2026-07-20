import { useState } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Megaphone, Puzzle, Settings,
  ArrowLeft, ArrowRight, X, Check, Star,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// First-visit guided tour of the management dashboard. A clean series of cards
// (one feature each) with Next/Back, progress, and skip. Shown once per merchant
// (localStorage flag); the toggle/menu always lets them revisit each area.

const TOUR_KEY = "siango-dashboard-tour-v1";

export const hasSeenTour = () => {
  try { return localStorage.getItem(TOUR_KEY) === "done"; } catch { return true; }
};
const markSeen = () => { try { localStorage.setItem(TOUR_KEY, "done"); } catch { /* ignore */ } };

interface Card { icon: typeof Package; title: string; body: string; }

const getCards = (t: (key: string) => string): Card[] => [
  { icon: Star, title: t("dash.tour.welcome_title"), body: t("dash.tour.welcome_body") },
  { icon: LayoutDashboard, title: t("dash.tour.home_title"), body: t("dash.tour.home_body") },
  { icon: Package, title: t("dash.tour.store_title"), body: t("dash.tour.store_body") },
  { icon: ShoppingCart, title: t("dash.tour.sales_title"), body: t("dash.tour.sales_body") },
  { icon: Megaphone, title: t("dash.tour.marketing_title"), body: t("dash.tour.marketing_body") },
  { icon: Puzzle, title: t("dash.tour.extensions_title"), body: t("dash.tour.extensions_body") },
  { icon: Settings, title: t("dash.tour.settings_title"), body: t("dash.tour.settings_body") },
  { icon: Check, title: t("dash.tour.done_title"), body: t("dash.tour.done_body") },
];

const DashboardTour = ({ onClose }: { onClose: () => void }) => {
  const { t } = useLanguage();
  const [i, setI] = useState(0);
  const CARDS = getCards(t);
  const card = CARDS[i];
  const isFirst = i === 0;
  const isLast = i === CARDS.length - 1;
  const Icon = card.icon;

  const finish = () => { markSeen(); onClose(); };
  const next = () => (isLast ? finish() : setI((v) => v + 1));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 animate-in zoom-in-95 fade-in duration-200">
        <button onClick={finish} aria-label={t("dash.tour.skip_aria")} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-primary" />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">{card.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed min-h-[60px]">{card.body}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-5 mb-5">
          {CARDS.map((_, idx) => (
            <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-primary" : "w-1.5 bg-border"}`} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          {!isFirst ? (
            <button onClick={() => setI((v) => v - 1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowRight className="w-4 h-4" /> {t("dash.tour.back")}
            </button>
          ) : (
            <button onClick={finish} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("dash.tour.skip")}</button>
          )}

          <button onClick={next} className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-5 h-11 text-sm font-medium hover:bg-primary/90 transition-colors">
            {isLast ? <>{t("dash.tour.finish")} <Check className="w-4 h-4" /></> : <>{t("dash.tour.next")} <ArrowLeft className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardTour;
