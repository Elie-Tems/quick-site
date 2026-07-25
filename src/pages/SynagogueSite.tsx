import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, ScrollText, Heart, Phone, Mail, MapPin, Image, CalendarDays } from "lucide-react";
import NedarimCheckout from "@/components/storefront/NedarimCheckout";
import DonationWidget from "@/components/storefront/DonationWidget";
import type { NedarimIframeParams } from "@/lib/nedarim";

/**
 * Public shul site (אתר בית הכנסת). Shows branding/hero, about text, gallery,
 * live prayer times + zmanim, pledge self-service and a donation CTA.
 * Route: /shul/:slug
 */

interface ShulEvent { id: string; title: string; date: string; time?: string; description?: string }
interface Zman { name: string; city: string | null; nusach: string | null; hebrewDate: string | null; parsha: string | null; zmanim: Record<string, string | null>; prayerTimes: Record<string, string>; events?: ShulEvent[] }
interface Pledge { id: string; member_name: string; pledge_type: string; label: string | null; amount: number; }

interface Biz {
  id: string;
  name: string;
  tagline: string | null;
  about_text: string | null;
  logo: string | null;
  hero_image_url: string | null;
  primary_color: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gallery_images: { id: string; url: string; caption?: string }[] | null;
  enabled_features: Record<string, boolean> | null;
}

const TEFILOT = [["shacharit", "שחרית"], ["mincha", "מנחה"], ["maariv", "ערבית"], ["shabbat_in", "כניסת שבת"], ["daf_yomi", "דף יומי"]] as const;
const ils = (n: number) => `₪${n.toLocaleString("he-IL")}`;

const SynagogueSite = () => {
  const { slug } = useParams();
  const [biz, setBiz] = useState<Biz | null>(null);
  const [z, setZ] = useState<Zman | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pledges, setPledges] = useState<Pledge[] | null>(null);
  const [looking, setLooking] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [nedarim, setNedarim] = useState<NedarimIframeParams | null>(null);
  const [donating, setDonating] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTimes = useCallback(async () => {
    const { data } = await supabase.functions.invoke("synagogue-zmanim", { body: { slug } });
    if (data && !(data as any).error) setZ(data as Zman);
  }, [slug]);

  useEffect(() => {
    const loadBiz = async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id, name, tagline, about_text, logo, hero_image_url, primary_color, phone, email, address, gallery_images, enabled_features")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      setBiz(data);
      setLoading(false);
      if (data?.name) document.title = data.name;
    };
    loadBiz();
    loadTimes();
  }, [slug, loadTimes]);

  const lookup = async () => {
    if (phone.replace(/[^0-9]/g, "").length < 9) return;
    setLooking(true);
    const { data } = await supabase.functions.invoke("synagogue-member", { body: { slug, phone } });
    setLooking(false);
    if (data && !(data as any).error) {
      setPledges((data as any).pledges);
      if ((data as any).pledges?.[0]?.member_name) setName((data as any).pledges[0].member_name);
    } else setPledges([]);
  };

  const pay = async (p: Pledge) => {
    if (!biz?.id) return;
    setPaying(p.id);
    const { data, error } = await supabase.functions.invoke("donation-create", {
      body: { businessId: biz.id, amount: Number(p.amount), pledgeId: p.id, donor: { name: name || p.member_name, phone } },
    });
    setPaying(null);
    const d = data as any;
    if (d?.mode === "nedarim_iframe" && d.mosad && d.apiValid && d.token && d.callbackUrl) {
      setNedarim({ mosad: d.mosad, apiValid: d.apiValid, token: d.token, callbackUrl: d.callbackUrl, callbackMailError: d.callbackMailError, amount: Number(p.amount), donor: { name: name || p.member_name, phone }, category: p.label || p.pledge_type, comment: p.label || p.pledge_type });
      return;
    }
    if (error || !d?.paymentUrl) { alert("לא ניתן לפתוח תשלום כרגע"); return; }
    window.location.href = d.paymentUrl;
  };

  const zRow = (k: string, label: string, primary: string) => (
    <div key={k} className="text-center px-2 py-2 rounded-lg" style={{ background: `${primary}18`, border: `1px solid ${primary}30` }}>
      <div className="text-[11px]" style={{ color: `${primary}99` }}>{label}</div>
      <div className="text-base font-bold" style={{ color: primary }}>{z?.zmanim?.[k] ?? "--:--"}</div>
    </div>
  );

  if (nedarim) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-8">
        <NedarimCheckout params={nedarim} onCancel={() => setNedarim(null)} />
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50" dir="rtl">
      <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
    </div>
  );

  if (!biz) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50" dir="rtl">
      <p className="text-stone-500">האתר לא נמצא</p>
    </div>
  );

  const primary = biz.primary_color || "#065f46";
  const gallery = biz.gallery_images || [];
  const f = biz.enabled_features || {};
  const noConfig = Object.keys(f).length === 0;
  const show = (key: string) => noConfig || !!f[key];

  return (
    <div className="min-h-screen bg-stone-50 font-sans" dir="rtl">

      {/* Hero */}
      <section
        className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-6"
        style={{
          background: biz.hero_image_url
            ? `linear-gradient(to bottom, rgba(10,40,20,0.55) 0%, rgba(10,40,20,0.75) 100%), url(${biz.hero_image_url}) center/cover`
            : `linear-gradient(135deg, ${primary}cc, #064e3b)`,
        }}
      >
        <div className="text-[13px] tracking-[.35em] text-amber-300 mb-2">ב ס ״ ד</div>
        {biz.logo && (
          <img src={biz.logo} alt={biz.name} className="w-20 h-20 object-contain rounded-full border-2 border-white/30 mb-4 bg-white/10" />
        )}
        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-2">{biz.name}</h1>
        {biz.tagline && <p className="text-lg text-white/80 max-w-xl">{biz.tagline}</p>}
        {z?.hebrewDate && (
          <p className="text-sm text-amber-200 mt-3">{z.hebrewDate}{z.parsha ? ` · פרשת ${z.parsha.replace("Parashat ", "")}` : ""}</p>
        )}
        <button
          onClick={() => setDonating(true)}
          className="mt-7 px-8 py-3.5 rounded-full text-white font-semibold text-lg shadow-lg transition-opacity hover:opacity-90"
          style={{ background: primary }}
        >
          <Heart className="inline w-5 h-5 ml-2" />
          תרומה לבית הכנסת
        </button>
      </section>

      {/* About */}
      {biz.about_text && (
        <section className="max-w-3xl mx-auto px-6 py-14">
          <h2 className="text-2xl font-bold text-stone-800 mb-5">אודות בית הכנסת</h2>
          <p className="text-stone-600 text-lg leading-relaxed whitespace-pre-line">{biz.about_text}</p>
        </section>
      )}

      {/* Prayer times */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-stone-800 mb-4 text-xl">
            <Clock className="w-5 h-5" style={{ color: primary }} />
            זמני תפילה
          </div>
          {z ? (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                {TEFILOT.filter(([k]) => z?.prayerTimes?.[k]).map(([k, l]) => (
                  <div key={k} className="text-center px-2 py-3 rounded-xl text-white" style={{ background: primary }}>
                    <div className="text-[11px] opacity-90">{l}</div>
                    <div className="text-lg font-extrabold">{z.prayerTimes[k]}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[["alotHaShachar", "עלות"], ["sunrise", "נץ"], ["chatzot", "חצות"], ["sunset", "שקיעה"]].map(([k, l]) => zRow(k, l, primary))}
              </div>
            </>
          ) : (
            <p className="text-stone-400 text-sm text-center py-4">טוען זמנים...</p>
          )}
        </div>
      </section>

      {/* Gallery */}
      {show("gallery") && gallery.length > 0 && (
        <section className="bg-stone-100 py-14 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-stone-800 mb-8 flex items-center gap-2">
              <Image className="w-6 h-6" style={{ color: primary }} />
              גלריה
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {gallery.map((img) => (
                <div key={img.id} className="rounded-xl overflow-hidden aspect-square">
                  <img src={img.url} alt={img.caption || ""} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming events */}
      {z?.events && z.events.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-10">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-stone-800 mb-4 text-xl">
              <CalendarDays className="w-5 h-5" style={{ color: primary }} />
              אירועים קרובים
            </div>
            <div className="space-y-3">
              {z.events.map(ev => {
                const fmtDate = (() => { try { return new Date(ev.date + "T12:00:00").toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" }); } catch { return ev.date; } })();
                return (
                  <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: `${primary}0d`, border: `1px solid ${primary}25` }}>
                    <div className="shrink-0 text-center w-12">
                      <div className="text-xs font-medium" style={{ color: `${primary}99` }}>{fmtDate.split(" ")[0]}</div>
                      <div className="text-xl font-extrabold leading-none" style={{ color: primary }}>{new Date(ev.date + "T12:00:00").getDate()}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-800 text-sm">{ev.title}</p>
                      {ev.time && <p className="text-xs text-stone-500 mt-0.5">{ev.time}</p>}
                      {ev.description && <p className="text-xs text-stone-500 mt-0.5">{ev.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* My pledges */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-stone-800 mb-1 text-xl">
            <ScrollText className="w-5 h-5" style={{ color: primary }} />
            העליות והנדרים שלי
          </div>
          <p className="text-sm text-muted-foreground mb-4">הזינו את מספר הטלפון שלכם לצפייה ותשלום.</p>
          <div className="flex gap-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="מספר טלפון" inputMode="tel"
              className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            <button onClick={lookup} disabled={looking}
              className="h-10 px-5 rounded-lg text-white text-sm font-medium" style={{ background: primary }}>
              {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : "בדיקה"}
            </button>
          </div>
          {pledges !== null && (
            <div className="mt-3 space-y-2">
              {pledges.length === 0 && <p className="text-sm text-muted-foreground">לא נמצאו חובות פתוחים למספר הזה.</p>}
              {pledges.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border bg-amber-50/50">
                  <div className="text-sm font-medium text-foreground">{p.label || (p.pledge_type === "neder" ? "נדר" : "עלייה")}</div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-amber-700">{ils(Number(p.amount))}</span>
                    <button onClick={() => pay(p)} disabled={paying === p.id}
                      className="h-8 px-3 rounded-lg text-white text-sm font-medium" style={{ background: primary }}>
                      {paying === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "שלם"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Donation CTA */}
      <section className="py-14 px-6 text-center" style={{ background: `${primary}10` }}>
        <div className="max-w-xl mx-auto">
          <Heart className="w-10 h-10 mx-auto mb-4" style={{ color: primary }} />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">תמכו בבית הכנסת</h2>
          <p className="text-stone-600 mb-6">כל תרומה מחזקת את הקהילה ומאפשרת המשך הפעילות</p>
          <button
            onClick={() => setDonating(true)}
            className="px-10 py-3.5 rounded-full text-white font-semibold text-lg shadow-md transition-opacity hover:opacity-90"
            style={{ background: primary }}
          >
            לתרומה עכשיו
          </button>
        </div>
      </section>

      {/* Contact */}
      {(biz.phone || biz.email || biz.address) && (
        <section className="bg-stone-800 text-white py-10 px-6">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-6 justify-center text-sm">
            {biz.phone && <a href={`tel:${biz.phone}`} className="flex items-center gap-2 hover:opacity-75"><Phone className="w-4 h-4" />{biz.phone}</a>}
            {biz.email && <a href={`mailto:${biz.email}`} className="flex items-center gap-2 hover:opacity-75"><Mail className="w-4 h-4" />{biz.email}</a>}
            {biz.address && <span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{biz.address}</span>}
          </div>
        </section>
      )}

      {donating && (
        <DonationWidget businessId={biz.id} businessName={biz.name} onClose={() => setDonating(false)} />
      )}
    </div>
  );
};

export default SynagogueSite;
