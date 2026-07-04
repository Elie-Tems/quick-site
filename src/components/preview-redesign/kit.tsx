import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LucideIcon, ArrowLeft } from "lucide-react";

/**
 * PREVIEW-ONLY shared UI kit for the interior redesign mockups.
 * Matches the /preview/home-v2 aesthetic: near-black bg, moving green aurora,
 * glass cards, Secular One display headings. These are visual prototypes only -
 * no Supabase calls, sample/illustrative data. Nothing here touches the real app.
 */

// Moving aurora + grid background (lighter than the hero version)
export const AuroraBg = ({ dim = false }: { dim?: boolean }) => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
    <div className="absolute inset-0 bg-[#0a0a0a]" />
    <motion.div
      className="absolute -top-40 right-[-10%] w-[45rem] h-[45rem] rounded-full blur-[140px]"
      style={{ background: "radial-gradient(circle, hsl(152 60% 45% / 0.22), transparent 70%)" }}
      animate={{ x: [0, -50, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute top-1/3 left-[-15%] w-[40rem] h-[40rem] rounded-full blur-[150px]"
      style={{ background: "radial-gradient(circle, hsl(170 70% 40% / 0.18), transparent 70%)" }}
      animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }}
      transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
    />
    <div
      className="absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage:
          "linear-gradient(hsl(152 44% 60%) 1px, transparent 1px), linear-gradient(90deg, hsl(152 44% 60%) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }}
    />
    {dim && <div className="absolute inset-0 bg-black/40" />}
  </div>
);

export const Card = ({ children, className = "", hover = false }: { children: ReactNode; className?: string; hover?: boolean }) => (
  <div
    className={`rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm ${
      hover ? "hover:border-primary/40 transition-colors" : ""
    } ${className}`}
  >
    {children}
  </div>
);

export const Pill = ({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" | "green" | "amber" }) => {
  const tones: Record<string, string> = {
    muted: "bg-white/5 text-white/70 border-white/10",
    primary: "bg-primary/15 text-primary border-primary/30",
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  };
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${tones[tone]}`}>{children}</span>;
};

export const StatCard = ({ icon: Icon, label, value, delta, deltaUp = true, delay = 0 }: {
  icon: LucideIcon; label: string; value: string; delta?: string; deltaUp?: boolean; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}
  >
    <Card hover className="p-5 relative overflow-hidden group">
      <div className="absolute -top-8 -left-8 w-28 h-28 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" strokeWidth={1.7} />
          </div>
          {delta && (
            <span className={`text-xs font-bold ${deltaUp ? "text-emerald-400" : "text-rose-400"}`}>
              {deltaUp ? "▲" : "▼"} {delta}
            </span>
          )}
        </div>
        <div className="text-2xl md:text-3xl font-display font-bold text-white">{value}</div>
        <div className="text-sm text-white/50 mt-1">{label}</div>
      </div>
    </Card>
  </motion.div>
);

// Simple hand-rolled SVG bar chart (no external deps)
export const BarChart = ({ data, height = 140 }: { data: number[]; height?: number }) => {
  const max = Math.max(...data, 1);
  return (
    <svg viewBox={`0 0 ${data.length * 40} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(152 60% 50%)" />
          <stop offset="100%" stopColor="hsl(152 44% 30%)" />
        </linearGradient>
      </defs>
      {data.map((v, i) => {
        const h = (v / max) * (height - 20);
        return (
          <motion.rect
            key={i}
            x={i * 40 + 8} width={24} rx={6}
            initial={{ height: 0, y: height }}
            animate={{ height: h, y: height - h }}
            transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
            fill="url(#barGrad)"
          />
        );
      })}
    </svg>
  );
};

// Simple SVG line/area chart
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
      <motion.path
        d={path} fill="none" stroke="hsl(152 60% 50%)" strokeWidth={2.5} strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeInOut" }}
      />
    </svg>
  );
};

// Browser chrome wrapper (for framing a screen)
export const BrowserFrame = ({ url, children }: { url: string; children: ReactNode }) => (
  <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900/80">
    <div className="flex items-center gap-2 px-4 h-10 border-b border-white/10">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
        <div className="w-3 h-3 rounded-full bg-green-400/70" />
      </div>
      <div className="mx-auto text-xs text-white/40 bg-black/40 rounded-md px-4 py-1">{url}</div>
    </div>
    {children}
  </div>
);

// Small back-to-hub banner shown on every mockup
export const PreviewBanner = ({ title }: { title: string }) => (
  <div className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 md:px-6 h-12 bg-primary/10 backdrop-blur-xl border-b border-primary/20">
    <div className="flex items-center gap-2 text-sm text-white/80">
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      תצוגה מקדימה - {title}
      <span className="hidden sm:inline text-white/40">· מוקאפ עיצובי, לא המערכת האמיתית</span>
    </div>
    <Link to="/preview/redesign" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-emerald-300 transition-colors">
      חזרה לכל המסכים <ArrowLeft className="w-4 h-4" />
    </Link>
  </div>
);

// Reusable app shell: RTL sidebar (right) + top bar + content
export const AppShell = ({
  nav, active, onNav, storeName, children, topRight,
}: {
  nav: { key: string; label: string; icon: LucideIcon }[];
  active: string;
  onNav: (k: string) => void;
  storeName: string;
  children: ReactNode;
  topRight?: ReactNode;
}) => (
  <div className="flex min-h-[calc(100vh-3rem)]">
    {/* Sidebar (right in RTL) */}
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-l border-white/10 bg-black/30 backdrop-blur-xl p-4">
      <div className="flex items-center gap-2 px-2 py-3 mb-4">
        <img src="/logo-dark-bg.png" alt="Siango" className="h-6 w-auto" />
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map((n) => {
          const on = n.key === active;
          return (
            <button
              key={n.key}
              onClick={() => onNav(n.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-right ${
                on ? "bg-primary/15 text-primary border border-primary/30" : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <n.icon className="w-4.5 h-4.5 shrink-0" style={{ width: 18, height: 18 }} />
              {n.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto p-3 rounded-2xl bg-gradient-to-br from-primary/15 to-transparent border border-primary/20">
        <div className="text-xs text-white/60 mb-1">החנות שלך</div>
        <div className="text-sm font-bold text-white">{storeName}</div>
        <div className="mt-2 text-xs text-primary flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> באוויר
        </div>
      </div>
    </aside>

    {/* Main */}
    <div className="flex-1 min-w-0">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-8 h-16 border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-12 z-30">
        <div className="flex items-center gap-2 md:hidden">
          <img src="/logo-dark-bg.png" alt="Siango" className="h-5 w-auto" />
        </div>
        {/* Mobile nav pills */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto">
          {nav.map((n) => (
            <button key={n.key} onClick={() => onNav(n.key)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${n.key === active ? "bg-primary/20 text-primary" : "text-white/50"}`}>
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
    <h1 className="text-2xl md:text-3xl font-display font-bold text-white">{title}</h1>
    {subtitle && <p className="text-white/50 mt-1">{subtitle}</p>}
  </div>
);
