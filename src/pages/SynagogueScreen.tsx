import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Live synagogue display screen (מסך בית הכנסת). Open on a TV/tablet in the shul.
 * Polls synagogue-zmanim every 2 min (and on focus), auto-recovers from a network
 * blip by keeping the last good data on screen. Ornamental "Jewish" styling, RTL.
 * Public route: /shul/:slug/screen.
 */

interface ScreenData {
  name: string; city: string | null; nusach: string | null;
  hebrewDate: string | null; parsha: string | null;
  zmanim: Record<string, string | null>; prayerTimes: Record<string, string>;
  parnas: string | null; announcements: string | null;
}

const ZMANIM_ROWS: { key: string; label: string }[] = [
  { key: "alotHaShachar", label: "עלות השחר" },
  { key: "sunrise", label: "נץ החמה" },
  { key: "sofZmanShma", label: "סו״ז ק״ש" },
  { key: "chatzot", label: "חצות" },
  { key: "minchaGedola", label: "מנחה גדולה" },
  { key: "plagHaMincha", label: "פלג המנחה" },
  { key: "sunset", label: "שקיעה" },
  { key: "tzeit", label: "צאת הכוכבים" },
];
const TEFILOT: { key: string; label: string }[] = [
  { key: "shacharit", label: "שחרית" },
  { key: "mincha", label: "מנחה" },
  { key: "maariv", label: "ערבית" },
  { key: "daf_yomi", label: "דף יומי" },
];

const GOLD = "#c9a227";

const SynagogueScreen = () => {
  const { slug } = useParams();
  const [d, setD] = useState<ScreenData | null>(null);
  const [online, setOnline] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("synagogue-zmanim", { body: { slug } });
      if (error || (data as any)?.error) { setOnline(false); return; }
      setD(data as ScreenData); setOnline(true);
    } catch { setOnline(false); }
  }, [slug]);

  useEffect(() => {
    document.title = d?.name ? `${d.name} · מסך` : "מסך בית הכנסת";
    load();
    const iv = setInterval(load, 120_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, [load, d?.name]);

  const box: React.CSSProperties = { background: "rgba(255,255,255,.03)", border: `1px solid ${GOLD}40`, borderRadius: 12, padding: "12px 8px", textAlign: "center" };
  const gdiv = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${GOLD}88,transparent)` }} />
      <span style={{ color: GOLD, fontSize: 11 }}>◆</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${GOLD}88,transparent)` }} />
    </div>
  );

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "radial-gradient(130% 100% at 50% 0%, #16281d 0%, #0a1712 55%, #050d09 100%)", color: "#f3ead0", fontFamily: '"Frank Ruhl Libre","David Libre",Georgia,serif', display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 1100, border: `2px solid ${GOLD}`, borderRadius: 18, padding: 20, boxShadow: "inset 0 0 0 6px rgba(0,0,0,.35)" }}>
        <span style={{ position: "absolute", top: 10, right: 14, color: GOLD }}>✡</span>
        <span style={{ position: "absolute", top: 10, left: 14, color: GOLD }}>✡</span>
        <span style={{ position: "absolute", bottom: 10, right: 14, color: GOLD }}>✡</span>
        <span style={{ position: "absolute", bottom: 10, left: 14, color: GOLD }}>✡</span>
        <div style={{ border: `1px solid ${GOLD}55`, borderRadius: 12, padding: "26px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 12, letterSpacing: ".35em", color: GOLD }}>ב ס ״ ד</div>
          <div style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: "#f9efce", marginTop: 4 }}>{d?.name ?? "בית הכנסת"}</div>
          <div style={{ fontSize: 14, color: "#a9c1b3", marginTop: 2 }}>{[d?.city, d?.nusach].filter(Boolean).join(" · ")}</div>

          {gdiv}
          <div style={{ fontSize: "clamp(14px,1.6vw,18px)", color: "#ecdcac" }}>
            {d?.hebrewDate ?? ""}{d?.parsha ? ` · ${d.parsha.replace("Parashat ", "פרשת ")}` : ""}
          </div>

          {/* Zmanim of the day */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 16 }}>
            {ZMANIM_ROWS.map((z) => (
              <div key={z.key} style={box}>
                <div style={{ fontSize: 12, color: "#a9bdb0" }}>{z.label}</div>
                <div style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, color: "#f3ead0" }}>{d?.zmanim?.[z.key] ?? "--:--"}</div>
              </div>
            ))}
          </div>

          {gdiv}
          {/* Fixed prayer times */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {TEFILOT.filter((t) => d?.prayerTimes?.[t.key]).map((t) => (
              <div key={t.key} style={{ ...box, background: `linear-gradient(180deg, ${GOLD}22, ${GOLD}05)`, border: `1px solid ${GOLD}66` }}>
                <div style={{ fontSize: 13, color: "#d9c893" }}>{t.label}</div>
                <div style={{ fontSize: "clamp(22px,2.6vw,30px)", fontWeight: 800, color: "#fff7e2" }}>{d?.prayerTimes?.[t.key]}</div>
              </div>
            ))}
          </div>

          {(d?.parnas || d?.announcements) && (
            <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${GOLD}44`, fontSize: "clamp(13px,1.5vw,16px)", color: "#cfe0bf", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
              {d?.parnas && <span>🕯️ פרנס היום: {d.parnas}</span>}
              {d?.announcements && <span style={{ color: "#ecdcac" }}>📢 {d.announcements}</span>}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 11, color: online ? "#7bdcb0" : "#e0a869" }}>
            {online ? "● מחובר · מתעדכן אוטומטית" : "○ מנסה להתחבר מחדש..."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SynagogueScreen;
