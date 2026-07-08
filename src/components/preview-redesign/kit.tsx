import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LucideIcon, ArrowLeft, Sun, Moon } from "lucide-react";

/**
 * PREVIEW-ONLY shared UI kit for the redesign mockups, with a light/dark theme
 * toggle. Neutrals are driven by CSS variables (.pv-* classes) so one toggle
 * flips every screen; the green brand accent stays the same in both themes.
 * Visual prototypes only - no Supabase, illustrative data. Real app untouched.
 */

// ---- Theme context ---------------------------------------------------------
type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: "dark", setTheme: () => {} });
export const usePreviewTheme = () => useContext(ThemeCtx);

const PV_CSS = `
[data-pv="dark"]{
  --pv-bg:#0a0a0a; --pv-surface:rgba(255,255,255,.03); --pv-surface2:rgba(255,255,255,.05);
  --pv-border:rgba(255,255,255,.10); --pv-strong:#ffffff; --pv-text:rgba(255,255,255,.72);
  --pv-muted:rgba(255,255,255,.52); --pv-faint:rgba(255,255,255,.5); --pv-hover:rgba(255,255,255,.06);
  --pv-grid:hsl(152 44% 60%); --pv-grid-op:.035; --pv-a1:.22; --pv-a2:.18; --pv-shadow:none;
}
[data-pv="light"]{
  --pv-bg:#eaf1ed; --pv-surface:#ffffff; --pv-surface2:#f3f7f4;
  --pv-border:rgba(15,30,22,.10); --pv-strong:#0e1a14; --pv-text:rgba(18,30,23,.80);
  --pv-muted:rgba(18,30,23,.6); --pv-faint:rgba(18,30,23,.52); --pv-hover:rgba(15,30,22,.04);
  --pv-grid:hsl(152 40% 35%); --pv-grid-op:.05; --pv-a1:.16; --pv-a2:.12; --pv-shadow:0 10px 30px rgba(15,30,22,.06);
}
.pv-bg{background:var(--pv-bg);}
.pv-surface{background:var(--pv-surface);border-color:var(--pv-border);}
.pv-surface2{background:var(--pv-surface2);}
.pv-border{border-color:var(--pv-border);}
.pv-strong{color:var(--pv-strong);}
.pv-text{color:var(--pv-text);}
.pv-muted{color:var(--pv-muted);}
.pv-faint{color:var(--pv-faint);}
.pv-hover:hover{background:var(--pv-hover);}
.pv-card{background:var(--pv-surface);border:1px solid var(--pv-border);box-shadow:var(--pv-shadow);}
`;

export const PreviewThemeRoot = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    try { const s = localStorage.getItem("pv-theme") as Theme | null; if (s) setTheme(s); } catch { /* ignore */ }
  }, []);
  const set = (t: Theme) => { setTheme(t); try { localStorage.setItem("pv-theme", t); } catch { /* ignore */ } };
  return (
    <div data-pv={theme} className="pv-bg pv-strong min-h-screen theme-refined">
      <style>{PV_CSS}</style>
      <ThemeCtx.Provider value={{ theme, setTheme: set }}>{children}</ThemeCtx.Provider>
    </div>
  );
};

export const PreviewLogo = ({ className = "h-6 w-auto" }: { className?: string }) => {
  const { theme } = usePreviewTheme();
  return <img src={theme === "light" ? "/logo-light-bg1.png" : "/logo-dark-bg.png"} alt="Siango" className={className} />;
};

export const ThemeToggle = () => {
  const { theme, setTheme } = usePreviewTheme();
  return (
    <div className="flex items-center p-0.5 rounded-full border pv-border pv-surface2">
      {(["light", "dark"] as Theme[]).map((t) => {
        const on = theme === t;
        const Icon = t === "light" ? Sun : Moon;
        return (
          <button key={t} onClick={() => setTheme(t)} aria-label={t}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${on ? "bg-primary text-white" : "pv-muted"}`}>
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
};

// ---- Background ------------------------------------------------------------
export const AuroraBg = ({ dim = false }: { dim?: boolean }) => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
    <div className="absolute inset-0 pv-bg" />
    <motion.div
      className="absolute -top-40 right-[-10%] w-[45rem] h-[45rem] rounded-full blur-[140px]"
      style={{ background: "radial-gradient(circle, hsl(152 60% 45% / var(--pv-a1)), transparent 70%)" }}
      animate={{ x: [0, -50, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute top-1/3 left-[-15%] w-[40rem] h-[40rem] rounded-full blur-[150px]"
      style={{ background: "radial-gradient(circle, hsl(170 70% 40% / var(--pv-a2)), transparent 70%)" }}
      animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }}
      transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
    />
    <div
      className="absolute inset-0"
      style={{
        opacity: "var(--pv-grid-op)",
        backgroundImage:
          "linear-gradient(var(--pv-grid) 1px, transparent 1px), linear-gradient(90deg, var(--pv-grid) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }}
    />
    {dim && <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--pv-bg) 40%, transparent)" }} />}
  </div>
);

export const Card = ({ children, className = "", hover = false }: { children: ReactNode; className?: string; hover?: boolean }) => (
  <div className={`rounded-3xl pv-card backdrop-blur-sm ${hover ? "hover:border-primary/40 transition-colors" : ""} ${className}`}>
    {children}
  </div>
);

export const Pill = ({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" | "green" | "amber" }) => {
  const tones: Record<string, string> = {
    muted: "pv-surface2 pv-muted border-[var(--pv-border)]",
    primary: "bg-primary/15 text-primary border-primary/30",
    green: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  };
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${tones[tone]}`}>{children}</span>;
};

export const StatCard = ({ icon: Icon, label, value, delta, deltaUp = true, delay = 0 }: {
  icon: LucideIcon; label: string; value: string; delta?: string; deltaUp?: boolean; delay?: number;
}) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
    <Card hover className="p-5 relative overflow-hidden group">
      <div className="absolute -top-8 -left-8 w-28 h-28 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" strokeWidth={1.7} />
          </div>
          {delta && <span className={`text-xs font-bold ${deltaUp ? "text-emerald-500" : "text-rose-500"}`}>{deltaUp ? "▲" : "▼"} {delta}</span>}
        </div>
        <div className="text-2xl md:text-3xl font-display font-bold pv-strong">{value}</div>
        <div className="text-sm pv-muted mt-1">{label}</div>
      </div>
    </Card>
  </motion.div>
);

export const BarChart = ({ data, height = 140 }: { data: number[]; height?: number }) => {
  const max = Math.max(...data, 1);
  return (
    <svg viewBox={`0 0 ${data.length * 40} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(152 60% 45%)" />
          <stop offset="100%" stopColor="hsl(152 44% 32%)" />
        </linearGradient>
      </defs>
      {data.map((v, i) => {
        const h = (v / max) * (height - 20);
        return (
          <motion.rect key={i} x={i * 40 + 8} width={24} rx={6}
            initial={{ height: 0, y: height }} animate={{ height: h, y: height - h }}
            transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }} fill="url(#barGrad)" />
        );
      })}
    </svg>
  );
};

export const LineChart = ({ data, height = 140 }: { data: number[]; height?: number }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const w = 300;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - 12 - ((v - min) / (max - min || 1)) * (height - 24);
    return [x, y];
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${w},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(152 60% 50% / 0.35)" />
          <stop offset="100%" stopColor="hsl(152 60% 50% / 0)" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill="url(#areaGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} />
      <motion.path d={path} fill="none" stroke="hsl(152 60% 45%)" strokeWidth={2.5} strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeInOut" }} />
    </svg>
  );
};

export const BrowserFrame = ({ url, children }: { url: string; children: ReactNode }) => (
  <div className="rounded-2xl overflow-hidden border pv-border pv-surface2 shadow-2xl">
    <div className="flex items-center gap-2 px-4 h-10 border-b pv-border">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
        <div className="w-3 h-3 rounded-full bg-green-400/70" />
      </div>
      <div className="mx-auto text-xs pv-muted pv-surface rounded-md px-4 py-1 border pv-border">{url}</div>
    </div>
    {children}
  </div>
);

export const PreviewBanner = ({ title }: { title: string }) => (
  <div className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 md:px-6 h-12 bg-primary/10 backdrop-blur-xl border-b border-primary/20">
    <div className="flex items-center gap-2 text-sm pv-text">
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      {title}
    </div>
    <div className="flex items-center gap-3">
      <ThemeToggle />
      <Link to="/preview/redesign" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition-opacity">
        חזרה לכל המסכים <ArrowLeft className="w-4 h-4" />
      </Link>
    </div>
  </div>
);

export const AppShell = ({
  nav, active, onNav, storeName, children, topRight,
}: {
  nav: { key: string; label: string; icon: LucideIcon }[];
  active: string; onNav: (k: string) => void; storeName: string; children: ReactNode; topRight?: ReactNode;
}) => (
  <div className="flex min-h-[calc(100vh-3rem)]">
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-l pv-border pv-surface2 backdrop-blur-xl p-4">
      <div className="flex items-center gap-2 px-2 py-3 mb-4">
        <PreviewLogo className="h-6 w-auto" />
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map((n) => {
          const on = n.key === active;
          return (
            <button key={n.key} onClick={() => onNav(n.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-right border ${
                on ? "bg-primary/15 text-primary border-primary/30" : "pv-muted pv-hover border-transparent"
              }`}>
              <n.icon style={{ width: 18, height: 18 }} className="shrink-0" />
              {n.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto p-3 rounded-2xl bg-gradient-to-br from-primary/15 to-transparent border border-primary/20">
        <div className="text-xs pv-muted mb-1">החנות שלך</div>
        <div className="text-sm font-bold pv-strong">{storeName}</div>
        <div className="mt-2 text-xs text-primary flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> באוויר
        </div>
      </div>
    </aside>

    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-3 px-4 md:px-8 h-16 border-b pv-border pv-surface2 backdrop-blur-xl sticky top-12 z-30">
        <div className="flex items-center gap-2 md:hidden"><PreviewLogo className="h-5 w-auto" /></div>
        <div className="flex md:hidden items-center gap-1 overflow-x-auto">
          {nav.map((n) => (
            <button key={n.key} onClick={() => onNav(n.key)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${n.key === active ? "bg-primary/20 text-primary" : "pv-muted"}`}>
              {n.label}
            </button>
          ))}
        </div>
        <div className="hidden md:block" />
        <div className="flex items-center gap-3">{topRight}</div>
      </div>
      <div className="p-4 md:p-8">{children}</div>
    </div>
  </div>
);

export const PageHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-6">
    <h1 className="text-2xl md:text-3xl font-display font-bold pv-strong">{title}</h1>
    {subtitle && <p className="pv-muted mt-1">{subtitle}</p>}
  </div>
);

// Storefront top bar for customer-facing vertical mockups
export const StoreTopBar = ({ name, tagline, cta }: { name: string; tagline?: string; cta?: ReactNode }) => (
  <header className="sticky top-12 z-30 border-b pv-border pv-surface2 backdrop-blur-xl">
    <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 md:px-6 h-16">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 shrink-0" />
        <div className="min-w-0">
          <div className="font-display font-bold pv-strong truncate">{name}</div>
          {tagline && <div className="text-xs pv-muted truncate">{tagline}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">{cta}</div>
    </div>
  </header>
);
