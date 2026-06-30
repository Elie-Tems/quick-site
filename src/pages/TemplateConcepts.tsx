// Internal concept page (NOT linked from the app) for Moti + Daniel to review and
// decide on 10 store-template archetypes that differ from edge to edge - structure,
// typography, colour and mood - not just hero-side variations. Shareable URL:
// /template-concepts . These are sketches; the real build follows on approval.

const serif = 'Georgia, "Times New Roman", serif';

const Card = ({ name, vibe, children }: { name: string; vibe: string; children: React.ReactNode }) => (
  <div>
    <div style={{ height: 180, borderRadius: 12, overflow: "hidden", border: "1px solid #e6e6e6", display: "flex", flexDirection: "column" }}>
      {children}
    </div>
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>{name}</div>
      <div style={{ fontSize: 12.5, color: "#8a8a8a", marginTop: 1 }}>{vibe}</div>
    </div>
  </div>
);

const sq = (bg: string, extra: React.CSSProperties = {}): React.CSSProperties => ({ flex: 1, background: bg, ...extra });

const TemplateConcepts = () => {
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#fbfbfa", color: "#111", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 20px 80px" }}>
        <div style={{ marginBottom: 8, fontSize: 13, letterSpacing: 2, color: "#0E9F6E", fontWeight: 600 }}>SIANGO · קונספט</div>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 8px" }}>15 ארכיטיפים לתבניות חנות</h1>
        <p style={{ fontSize: 16, color: "#555", lineHeight: 1.6, maxWidth: 680, margin: 0 }}>
          לא וריאציות של אותו אתר - אלא עולמות עיצוב שונים מהקצה לקצה: מבנה, טיפוגרפיה, צבעוניות ומוד.
          המטרה: ששני סוחרים שיבחרו תבניות שונות יקבלו אתרים שנראים מעולמות אחרים. אלו סקיצות לדיון; הבנייה המלאה (responsive, RTL, תצוגה חיה) אחרי אישור.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 22, marginTop: 36 }}>

          <Card name="1 · מינימליסט" vibe="לבן, אוויר, שקט · אפל-סטייל">
            <div style={{ background: "#fff", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ textAlign: "center", padding: "14px 0 6px", fontSize: 12, letterSpacing: 4, color: "#111" }}>S T U D I O</div>
              <div style={{ flex: 1, margin: "0 18px", background: "#f0f0f0", borderRadius: 5, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 10, fontSize: 13, color: "#888" }}>קולקציה</div>
              <div style={{ display: "flex", gap: 6, padding: "10px 18px" }}><div style={sq("#f3f3f3", { height: 26, borderRadius: 3 })} /><div style={sq("#f3f3f3", { height: 26, borderRadius: 3 })} /><div style={sq("#f3f3f3", { height: 26, borderRadius: 3 })} /></div>
            </div>
          </Card>

          <Card name="2 · מגזין" vibe="סריף, א-סימטרי, עורכי">
            <div style={{ background: "#f3eee2", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", gap: 10, padding: 12, flex: 1 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontFamily: serif, fontSize: 20, color: "#2b2b2b", lineHeight: 1.1 }}>העונה<br />החדשה</div>
                  <div style={{ fontSize: 11, color: "#8a8170", marginTop: 6 }}>גיליון 04</div>
                </div>
                <div style={{ flex: 1, background: "#d8cdb6", borderRadius: 2 }} />
              </div>
              <div style={{ display: "flex", gap: 6, padding: "0 12px 12px" }}><div style={sq("#e2d8c2", { height: 24 })} /><div style={sq("#e2d8c2", { height: 24 })} /></div>
            </div>
          </Card>

          <Card name="3 · נועז" vibe="שחור + ניאון, ענק · סטריטוור">
            <div style={{ background: "#0a0a0a", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: "#d4ff3d", lineHeight: 0.9, letterSpacing: -1 }}>SALE<br />50%</div>
              </div>
              <div style={{ display: "flex", gap: 6, padding: 12 }}><div style={sq("#1c1c1c", { height: 28, border: "1px solid #d4ff3d33" })} /><div style={sq("#1c1c1c", { height: 28 })} /><div style={sq("#d4ff3d", { height: 28 })} /></div>
            </div>
          </Card>

          <Card name="4 · ארטיזן" vibe="חם, רך, מלאכת יד · Etsy">
            <div style={{ background: "#e7dccb", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ textAlign: "center", padding: "12px 0 2px", fontFamily: serif, fontSize: 16, color: "#6b4a31" }}>בעבודת יד</div>
              <div style={{ flex: 1, margin: "6px 20px", background: "#cbb89c", borderRadius: "60px 60px 8px 8px" }} />
              <div style={{ display: "flex", gap: 6, padding: "10px 20px" }}><div style={sq("#d6c5aa", { height: 24, borderRadius: 8 })} /><div style={sq("#d6c5aa", { height: 24, borderRadius: 8 })} /><div style={sq("#d6c5aa", { height: 24, borderRadius: 8 })} /></div>
            </div>
          </Card>

          <Card name="5 · יוקרה" vibe="שחור + זהב, דרמטי">
            <div style={{ background: "#000", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ flex: 1, background: "linear-gradient(0deg,#000,#1a160c)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 15, letterSpacing: 5, color: "#c9a45c" }}>MAISON</div><div style={{ fontSize: 10, color: "#8a754a", letterSpacing: 2, marginTop: 4 }}>COUTURE</div></div>
              </div>
              <div style={{ display: "flex", gap: 6, padding: 12 }}><div style={sq("#15110a", { height: 26, border: "0.5px solid #c9a45c44" })} /><div style={sq("#15110a", { height: 26, border: "0.5px solid #c9a45c44" })} /></div>
            </div>
          </Card>

          <Card name="6 · תוסס" vibe="צבעוני, מעוגל, שובב">
            <div style={{ background: "#fff0f6", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", gap: 6, padding: 12, flex: 1 }}>
                <div style={{ flex: 2, background: "#ff4d8d", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 600 }}>שלום!</div>
                <div style={{ flex: 1, background: "#7c3aed", borderRadius: 14 }} />
              </div>
              <div style={{ display: "flex", gap: 6, padding: "0 12px 12px" }}><div style={sq("#ffd6e7", { height: 26, borderRadius: 12 })} /><div style={sq("#e9d8ff", { height: 26, borderRadius: 12 })} /><div style={sq("#ffe9a8", { height: 26, borderRadius: 12 })} /></div>
            </div>
          </Card>

          <Card name="7 · מוצר יחיד" vibe="סיפור אחד, CTA · DTC">
            <div style={{ background: "#fafafa", display: "flex", flexDirection: "column", height: "100%", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ width: 56, height: 56, background: "#ececec", borderRadius: 10 }} />
              <div style={{ fontSize: 13, color: "#111", fontWeight: 600 }}>המוצר האחד</div>
              <div style={{ background: "#111", color: "#fff", fontSize: 11, borderRadius: 6, padding: "6px 18px" }}>קנה עכשיו</div>
            </div>
          </Card>

          <Card name="8 · קלאסי" vibe="סרגל קטגוריות + גריד צפוף">
            <div style={{ background: "#fff", display: "flex", height: "100%" }}>
              <div style={{ width: 52, background: "#f4f4f4", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ height: 6, background: "#ddd", borderRadius: 2 }} /><div style={{ height: 6, background: "#ddd", borderRadius: 2 }} /><div style={{ height: 6, background: "#ddd", borderRadius: 2 }} /><div style={{ height: 6, background: "#ddd", borderRadius: 2 }} />
              </div>
              <div style={{ flex: 1, padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div style={{ background: "#eee", borderRadius: 3 }} /><div style={{ background: "#eee", borderRadius: 3 }} /><div style={{ background: "#eee", borderRadius: 3 }} /><div style={{ background: "#eee", borderRadius: 3 }} />
              </div>
            </div>
          </Card>

          <Card name="9 · דארק טק" vibe="כהה, חד, גריד · גאדג׳טים">
            <div style={{ background: "#13151a", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 16, color: "#e6e8ec", fontWeight: 600, letterSpacing: 0.5 }}>NEXTGEN</div>
                <div style={{ height: 4, width: 38, background: "#3b82f6", borderRadius: 2, marginTop: 6 }} />
              </div>
              <div style={{ display: "flex", gap: 6, padding: 12 }}><div style={sq("#1d2026", { height: 28, borderRadius: 5 })} /><div style={sq("#1d2026", { height: 28, borderRadius: 5 })} /><div style={sq("#1d2026", { height: 28, borderRadius: 5 })} /></div>
            </div>
          </Card>

          <Card name="10 · ביוטי רך" vibe="פסטל, אלגנטי, נשי">
            <div style={{ background: "#fdf2f4", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ textAlign: "center", padding: "12px 0 3px", fontFamily: serif, fontSize: 17, color: "#a86b78" }}>Beauté</div>
              <div style={{ flex: 1, margin: "2px 22px", background: "#f3d9e0", borderRadius: 60 }} />
              <div style={{ display: "flex", gap: 6, padding: "10px 22px" }}><div style={sq("#f6e3e8", { height: 22, borderRadius: 50 })} /><div style={sq("#f6e3e8", { height: 22, borderRadius: 50 })} /></div>
            </div>
          </Card>

          <Card name="11 · אוכל" vibe="חם, קולינרי, תיאבון · מסעדות">
            <div style={{ background: "#fff7ef", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ textAlign: "center", padding: "11px 0 4px", fontFamily: serif, fontSize: 16, color: "#9c3a1f" }}>המטבח שלנו</div>
              <div style={{ flex: 1, margin: "2px 16px", background: "#e3a06f", borderRadius: 6 }} />
              <div style={{ display: "flex", gap: 6, padding: "10px 16px" }}><div style={sq("#f1cba6", { height: 22, borderRadius: 5 })} /><div style={sq("#f1cba6", { height: 22, borderRadius: 5 })} /><div style={sq("#f1cba6", { height: 22, borderRadius: 5 })} /></div>
            </div>
          </Card>

          <Card name="12 · ספורט" vibe="דינמי, חשמלי · כושר">
            <div style={{ background: "#0d1b2a", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 25, fontWeight: 800, fontStyle: "italic", color: "#2cff9e", lineHeight: 0.95, letterSpacing: -1 }}>PUSH<br />HARDER</div>
              </div>
              <div style={{ display: "flex", gap: 6, padding: 12 }}><div style={sq("#13263a", { height: 26, borderRadius: 4 })} /><div style={sq("#2cff9e", { height: 26, borderRadius: 4 })} /><div style={sq("#13263a", { height: 26, borderRadius: 4 })} /></div>
            </div>
          </Card>

          <Card name="13 · סקנדינבי" vibe="רגוע, בהיר, פונקציונלי · נורדי">
            <div style={{ background: "#f4f1ea", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ padding: "12px 16px 4px", fontSize: 13, color: "#6b675c", letterSpacing: 1 }}>hem.</div>
              <div style={{ flex: 1, margin: "0 16px", background: "#ddd6c8", borderRadius: 3 }} />
              <div style={{ display: "flex", gap: 8, padding: "10px 16px" }}><div style={sq("#e6e1d4", { height: 20, borderRadius: 3 })} /><div style={sq("#e6e1d4", { height: 20, borderRadius: 3 })} /></div>
            </div>
          </Card>

          <Card name="14 · רטרו" vibe="צבעי 90s, צ׳אנקי, שובב · Y2K">
            <div style={{ background: "#fdeede", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", gap: 6, padding: 12, flex: 1 }}>
                <div style={{ flex: 1, background: "#ff7a3d", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 }}>SHOP</div>
                <div style={{ flex: 1, background: "#1fb6a6", borderRadius: 16 }} />
              </div>
              <div style={{ display: "flex", gap: 6, padding: "0 12px 12px" }}><div style={sq("#ffd23f", { height: 24, borderRadius: 12 })} /><div style={sq("#c44dff", { height: 24, borderRadius: 12 })} /><div style={sq("#ff7a3d", { height: 24, borderRadius: 12 })} /></div>
            </div>
          </Card>

          <Card name="15 · בוטני" vibe="ירוק, אורגני, רענן · אקו וצמחים">
            <div style={{ background: "#edf3e9", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ textAlign: "center", padding: "12px 0 3px", fontFamily: serif, fontSize: 16, color: "#2f5a3a" }}>טבעי</div>
              <div style={{ flex: 1, margin: "2px 20px", background: "#9cbf95", borderRadius: "50px 8px 50px 8px" }} />
              <div style={{ display: "flex", gap: 6, padding: "10px 20px" }}><div style={sq("#cfe0c6", { height: 22, borderRadius: 8 })} /><div style={sq("#cfe0c6", { height: 22, borderRadius: 8 })} /><div style={sq("#cfe0c6", { height: 22, borderRadius: 8 })} /></div>
            </div>
          </Card>

        </div>

        <p style={{ fontSize: 13, color: "#999", marginTop: 40, textAlign: "center" }}>דף פנימי לדיון · מוטי + דניאל · סיאנגו</p>
      </div>
    </div>
  );
};

export default TemplateConcepts;
