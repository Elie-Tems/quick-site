import { Lock, Crown, Check, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PremiumOverlayProps {
  locked: boolean;
  title: string;
  description: string;
  bullets?: string[];
  priceLabel?: string;
  onUpgrade: () => void;
  /** Shows a spinner + disables the button while the upgrade charge is in flight. */
  busy?: boolean;
  children: React.ReactNode;
}

// Wraps a premium screen. When locked, shoppers/merchants can still SEE the feature
// (a live demo), but it's non-interactive and topped with an upgrade banner. When
// unlocked, children render normally.
const PremiumOverlay = ({ locked, title, description, bullets, priceLabel, onUpgrade, busy, children }: PremiumOverlayProps) => {
  const { t } = useLanguage();

  if (!locked) return <>{children}</>;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-l from-amber-500/10 to-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold flex items-center gap-2">{title}
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600"><Lock className="w-3 h-3" /> {t("dash.premiumoverlay.premium_badge")}</span>
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            {bullets && bullets.length > 0 && (
              <ul className="mt-3 grid sm:grid-cols-2 gap-1.5">
                {bullets.map((b) => (
                  <li key={b} className="flex items-center gap-1.5 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" /> {b}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <button
                onClick={onUpgrade}
                disabled={busy}
                className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("dash.premiumoverlay.activate_now")}
              </button>
              {priceLabel && <span className="text-sm text-muted-foreground">{priceLabel}</span>}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">👇 {t("dash.premiumoverlay.demo_notice")}</p>

      {/* Live demo behind the gate - visible but not interactive */}
      <div className="relative">
        <div className="pointer-events-none select-none opacity-95">{children}</div>
        <div className="absolute inset-0" aria-hidden />
      </div>
    </div>
  );
};

export default PremiumOverlay;
