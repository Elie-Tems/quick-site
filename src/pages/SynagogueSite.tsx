import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, ScrollText } from "lucide-react";

/**
 * Public shul site (אתר בית הכנסת) + member self-service. Shows live prayer times +
 * zmanim, and lets a member look up their open aliyot/nedarim by phone and pay them
 * (reuses the donation flow -> donation-callback closes the pledge). Route /shul/:slug.
 */

interface Zman { name: string; city: string | null; nusach: string | null; hebrewDate: string | null; parsha: string | null; zmanim: Record<string, string | null>; prayerTimes: Record<string, string>; }
interface Pledge { id: string; member_name: string; pledge_type: string; label: string | null; amount: number; }

const TEFILOT = [["shacharit", "שחרית"], ["mincha", "מנחה"], ["maariv", "ערבית"], ["shabbat_in", "כניסת שבת"], ["daf_yomi", "דף יומי"]] as const;
const ils = (n: number) => `₪${n.toLocaleString("he-IL")}`;

const SynagogueSite = () => {
  const { slug } = useParams();
  const [z, setZ] = useState<Zman | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pledges, setPledges] = useState<Pledge[] | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  const loadTimes = useCallback(async () => {
    const { data } = await supabase.functions.invoke("synagogue-zmanim", { body: { slug } });
    if (data && !(data as any).error) setZ(data as Zman);
  }, [slug]);

  useEffect(() => { loadTimes(); document.title = "בית הכנסת"; }, [loadTimes]);
  useEffect(() => { if (z?.name) document.title = z.name; }, [z?.name]);

  const lookup = async () => {
    if (phone.replace(/[^0-9]/g, "").length < 9) return;
    setLooking(true);
    const { data } = await supabase.functions.invoke("synagogue-member", { body: { slug, phone } });
    setLooking(false);
    if (data && !(data as any).error) {
      setPledges((data as any).pledges); setBusinessId((data as any).businessId);
      if ((data as any).pledges?.[0]?.member_name) setName((data as any).pledges[0].member_name);
    } else setPledges([]);
  };

  const pay = async (p: Pledge) => {
    if (!businessId) return;
    setPaying(p.id);
    const { data, error } = await supabase.functions.invoke("donation-create", {
      body: { businessId, amount: Number(p.amount), pledgeId: p.id, donor: { name: name || p.member_name, phone } },
    });
    setPaying(null);
    const url = (data as any)?.paymentUrl;
    if (error || !url) { alert("לא ניתן לפתוח תשלום כרגע"); return; }
    window.location.href = url;
  };

  const zRow = (k: string, label: string) => (
    <div key={k} className="text-center px-2 py-2 rounded-lg bg-white/60 border border-emerald-100">
      <div className="text-[11px] text-emerald-800/70">{label}</div>
      <div className="text-base font-bold text-emerald-900">{z?.zmanim?.[k] ?? "--:--"}</div>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="text-[11px] tracking-[.3em] text-amber-700">ב ס ״ ד</div>
          <h1 className="text-3xl font-bold text-emerald-900 mt-1">{z?.name ?? "בית הכנסת"}</h1>
          <p className="text-sm text-emerald-800/70">{[z?.city, z?.nusach].filter(Boolean).join(" · ")}</p>
          {z?.hebrewDate && <p className="text-sm text-amber-800 mt-1">{z.hebrewDate}{z.parsha ? ` · ${z.parsha.replace("Parashat ", "פרשת ")}` : ""}</p>}
        </div>

        {/* Prayer times */}
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 mb-4">
          <div className="flex items-center gap-2 font-bold text-emerald-900 mb-3"><Clock className="w-4 h-4" /> זמני תפילה</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
            {TEFILOT.filter(([k]) => z?.prayerTimes?.[k]).map(([k, l]) => (
              <div key={k} className="text-center px-2 py-2 rounded-lg bg-emerald-600 text-white">
                <div className="text-[11px] opacity-90">{l}</div><div className="text-lg font-extrabold">{z?.prayerTimes?.[k]}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[["alotHaShachar", "עלות"], ["sunrise", "נץ"], ["chatzot", "חצות"], ["sunset", "שקיעה"]].map(([k, l]) => zRow(k, l))}
          </div>
        </div>

        {/* My debts */}
        <div className="rounded-2xl border border-amber-200 bg-white p-4">
          <div className="flex items-center gap-2 font-bold text-emerald-900 mb-1"><ScrollText className="w-4 h-4" /> העליות והנדרים שלי</div>
          <p className="text-xs text-muted-foreground mb-3">הזינו את מספר הטלפון שלכם לצפייה ותשלום.</p>
          <div className="flex gap-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="מספר טלפון" inputMode="tel"
              className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            <button onClick={lookup} disabled={looking} className="h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium">
              {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : "בדיקה"}
            </button>
          </div>

          {pledges !== null && (
            <div className="mt-3 space-y-2">
              {pledges.length === 0 && <p className="text-sm text-muted-foreground">לא נמצאו חובות פתוחים למספר הזה.</p>}
              {pledges.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border bg-amber-50/50">
                  <div className="min-w-0"><div className="text-sm font-medium text-foreground truncate">{p.label || (p.pledge_type === "neder" ? "נדר" : "עלייה")}</div></div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-amber-700">{ils(Number(p.amount))}</span>
                    <button onClick={() => pay(p)} disabled={paying === p.id} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-sm font-medium">
                      {paying === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "שלם"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">נבנה ב-סיאנגו</p>
      </div>
    </div>
  );
};

export default SynagogueSite;
