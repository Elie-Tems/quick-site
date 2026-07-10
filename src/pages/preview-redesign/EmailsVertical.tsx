import { useEffect } from "react";
import {
  CalendarCheck, Clock, MapPin, Phone, User, Heart, Bell, Check, X,
  Building2, Sparkles, Repeat, FileText, ShoppingBag, ShoppingCart, Star,
  Rocket, CreditCard, AlertTriangle, PartyPopper, Package,
} from "lucide-react";
import { AuroraBg, PreviewBanner, PreviewThemeRoot } from "@/components/preview-redesign/kit";

/**
 * PREVIEW-ONLY - designed, branded transactional emails for every lifecycle
 * stage, per vertical, PLUS our own platform (Siango) emails in the same style.
 * Route: /preview/redesign/emails. Merchant emails carry the MERCHANT's logo;
 * platform emails carry Siango's. Sample data only. For Moti's design approval.
 */

const GREEN = "hsl(152 44% 41%)";
const GREEN_DARK = "hsl(152 46% 30%)";
const INK = "#1a2420";
const MUTED = "#5b6b63";
const LINE = "#e7ece9";
const AMBER = "#b45309";

const Email = ({ from, subject, children }: { from: string; subject: string; children: React.ReactNode }) => (
  <div className="w-full max-w-[600px] mx-auto">
    <div className="flex items-center justify-between px-1 mb-2">
      <div className="text-sm pv-muted truncate"><span className="pv-text font-medium">{from}</span> · {subject}</div>
    </div>
    <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#ffffff", color: INK, direction: "rtl" }}>
      {children}
      <div style={{ background: "#f6f8f7", borderTop: `1px solid ${LINE}`, padding: "18px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
          נשלח באמצעות <span style={{ color: GREEN_DARK, fontWeight: 600 }}>Siango</span> · האתר של העסק שלך
        </div>
      </div>
    </div>
  </div>
);

// Merchant email header = the MERCHANT's own logo (a white badge with the
// business initial stands in for their uploaded logo). Platform emails pass
// `platform` to show the Siango logo instead.
const Header = ({ name, tag, initial, platform }: { name: string; tag: string; initial?: string; platform?: boolean }) => (
  <div style={{ background: GREEN, padding: "24px 28px", textAlign: "center" }}>
    {platform ? (
      <img src="/logo-dark-bg.png" alt="" style={{ height: 22, margin: "0 auto 8px", display: "block", opacity: 0.95 }} />
    ) : (
      <div style={{ width: 46, height: 46, borderRadius: 13, background: "#fff", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 21, color: GREEN_DARK }}>{initial}</div>
    )}
    <div style={{ color: "#ffffff", fontWeight: 700, fontSize: 18 }}>{name}</div>
    <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 }}>{tag}</div>
  </div>
);

const Row = ({ icon: Icon, label, value, accent }: { icon: typeof Clock; label: string; value: string; accent?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${LINE}` }}>
    <span style={{ width: 34, height: 34, borderRadius: 10, background: "hsl(152 44% 41% / 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon style={{ width: 17, height: 17, color: GREEN_DARK }} />
    </span>
    <div>
      <div style={{ fontSize: 12, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: accent ? GREEN_DARK : INK }}>{value}</div>
    </div>
  </div>
);

const Button = ({ children, ghost }: { children: string; ghost?: boolean }) => (
  <a style={{ display: "inline-block", background: ghost ? "#fff" : GREEN, color: ghost ? GREEN_DARK : "#fff", fontWeight: 700, fontSize: 15, padding: "13px 28px", borderRadius: 12, textDecoration: "none", border: ghost ? `1.5px solid ${GREEN}` : "none" }}>{children}</a>
);

const Body = ({ children }: { children: React.ReactNode }) => <div style={{ padding: "28px" }}>{children}</div>;

// Centered icon + heading + subline block used by many emails.
const Hero = ({ icon: Icon, title, sub, tint = "green" }: { icon: typeof Clock; title: string; sub: React.ReactNode; tint?: "green" | "amber" }) => {
  const c = tint === "amber" ? AMBER : GREEN_DARK;
  const bg = tint === "amber" ? "rgba(180,83,9,0.12)" : "hsl(152 44% 41% / 0.12)";
  return (
    <div style={{ textAlign: "center", marginBottom: 18 }}>
      <span style={{ display: "inline-flex", width: 54, height: 54, borderRadius: "50%", background: bg, alignItems: "center", justifyContent: "center" }}>
        <Icon style={{ width: 26, height: 26, color: c }} />
      </span>
      <h2 style={{ fontSize: 21, fontWeight: 800, margin: "12px 0 4px", color: INK }}>{title}</h2>
      <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.7 }}>{sub}</p>
    </div>
  );
};

const Box = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: "#fafbfa", border: `1px solid ${LINE}`, borderRadius: 14, padding: "6px 16px", marginBottom: 20 }}>{children}</div>
);

const SectionTitle = ({ children, sub }: { children: string; sub: string }) => (
  <div className="text-center mt-4 mb-2">
    <h2 className="text-2xl font-display font-bold pv-strong">{children}</h2>
    <p className="pv-muted text-sm">{sub}</p>
  </div>
);

const EmailsVertical = () => {
  useEffect(() => { document.title = "Siango - מיילים מעוצבים (לאישור)"; }, []);

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="מיילים מעוצבים - כל שלבי מחזור-החיים + מיילי הפלטפורמה (לאישור)" />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border mb-4">
            <Sparkles className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">כל השלבים · לוגו העסק · RTL</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-2">המיילים המעוצבים</h1>
          <p className="pv-muted">כל מייל נושא את הלוגו והשם של העסק. עברו, ואם משהו לחידוד - תגידו.</p>
        </div>

        <div className="space-y-10">

          <SectionTitle sub="נשלחים בשם העסק, עם הלוגו שלו">מיילים ללקוחות</SectionTitle>

          {/* ── Commerce ── */}
          {/* Order confirmation */}
          <Email from="בוטיק לדוגמה" subject="אישור הזמנה #1042 - תודה על הקנייה!">
            <Header name="בוטיק לדוגמה" initial="ב" tag="הזמנתך התקבלה" />
            <Body>
              <Hero icon={ShoppingBag} title="ההזמנה שלך התקבלה! 🎉" sub={<>שלום מיכל, אנחנו כבר מכינים אותה. פרטי ההזמנה:</>} />
              <Box>
                <Row icon={Package} label="הזמנה" value="#1042 · 3 פריטים" />
                <Row icon={CreditCard} label="סה״כ שולם" value="₪289" accent />
                <Row icon={MapPin} label="משלוח אל" value="הדוגמה 10, תל אביב · עד 3 ימי עסקים" />
              </Box>
              <div style={{ textAlign: "center", marginBottom: 12 }}><Button>מעקב אחר ההזמנה</Button></div>
              <p style={{ fontSize: 13, color: MUTED, textAlign: "center", margin: 0 }}>שאלה? השיבו למייל הזה ונחזור אליכם.</p>
            </Body>
          </Email>

          {/* Cart abandonment */}
          <Email from="בוטיק לדוגמה" subject="השארת משהו בעגלה 🛒">
            <Header name="בוטיק לדוגמה" initial="ב" tag="העגלה מחכה לך" />
            <Body>
              <Hero icon={ShoppingCart} title="שכחת משהו? 🛒" sub={<>מיכל, שמרנו לך את העגלה. הפריטים עדיין זמינים:</>} />
              <Box>
                <Row icon={ShoppingBag} label="בעגלה" value="שמלת קיץ + 2 פריטים" />
                <Row icon={CreditCard} label="סכום" value="₪289" accent />
              </Box>
              <div style={{ textAlign: "center", marginBottom: 12 }}><Button>חזרה לעגלה</Button></div>
              <p style={{ fontSize: 13, color: MUTED, textAlign: "center", margin: 0 }}>הפריטים אזלו במלאי? נעדכן אותך. אפשר <a style={{ color: GREEN_DARK, fontWeight: 600 }}>להסיר אותי מהתזכורות</a>.</p>
            </Body>
          </Email>

          {/* ── Services ── */}
          {/* Appointment confirmation */}
          <Email from="סטודיו יופי לדוגמה" subject="התור שלך נקבע - יום ג' 14/7 בשעה 16:30">
            <Header name="סטודיו יופי לדוגמה" initial="ס" tag="איפור · לק ג'ל · עיצוב גבות" />
            <Body>
              <Hero icon={CalendarCheck} title="התור שלך נקבע! 🎉" sub={<>שלום נועה, נשמח לראותך. הנה הפרטים:</>} />
              <Box>
                <Row icon={Sparkles} label="שירות" value="לק ג'ל (45 דק')" />
                <Row icon={Clock} label="מועד" value="יום שלישי, 14/7 · 16:30" />
                <Row icon={MapPin} label="כתובת" value="רחוב הדוגמה 10, תל אביב" />
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: "hsl(152 44% 41% / 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Check style={{ width: 17, height: 17, color: GREEN_DARK }} /></span>
                  <div><div style={{ fontSize: 12, color: MUTED }}>מקדמה</div><div style={{ fontSize: 15, fontWeight: 600, color: GREEN_DARK }}>שולמה ₪50</div></div>
                </div>
              </Box>
              <div style={{ textAlign: "center", marginBottom: 14 }}><Button>הוספה ליומן</Button></div>
              <p style={{ fontSize: 13, color: MUTED, textAlign: "center", margin: 0 }}>צריכה לשנות? <a style={{ color: GREEN_DARK, fontWeight: 600 }}>ביטול / שינוי תור</a> · נשלח תזכורת יום לפני.</p>
            </Body>
          </Email>

          {/* Appointment reminder */}
          <Email from="סטודיו יופי לדוגמה" subject="תזכורת: יש לך תור מחר">
            <Header name="סטודיו יופי לדוגמה" initial="ס" tag="נתראה מחר!" />
            <Body>
              <div style={{ display: "flex", gap: 14, alignItems: "center", background: "hsl(152 44% 41% / 0.06)", border: `1px solid hsl(152 44% 41% / 0.2)`, borderRadius: 14, padding: 16 }}>
                <span style={{ width: 46, height: 46, borderRadius: 12, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Bell style={{ width: 22, height: 22, color: "#fff" }} /></span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: INK }}>תזכורת: תור מחר בשעה 16:30</div>
                  <div style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>לק ג'ל · רחוב הדוגמה 10, תל אביב</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: INK, textAlign: "center", margin: "18px 0 14px" }}>מחכים לך 💚 אם צריך לבטל, אפשר עדיין:</p>
              <div style={{ textAlign: "center" }}><a style={{ color: GREEN_DARK, fontWeight: 600, fontSize: 14 }}>ביטול תור</a></div>
            </Body>
          </Email>

          {/* Appointment cancellation */}
          <Email from="סטודיו יופי לדוגמה" subject="התור בוטל - נשמח לקבוע חדש">
            <Header name="סטודיו יופי לדוגמה" initial="ס" tag="התור בוטל" />
            <Body>
              <Hero icon={X} tint="amber" title="התור בוטל" sub={<>שלום נועה, התור שלך ל-14/7 בשעה 16:30 בוטל. מקדמה ששולמה תוחזר תוך 3-5 ימי עסקים.</>} />
              <div style={{ textAlign: "center", marginBottom: 12 }}><Button>קביעת תור חדש</Button></div>
              <p style={{ fontSize: 13, color: MUTED, textAlign: "center", margin: 0 }}>נשמח לראותך בקרוב 💚</p>
            </Body>
          </Email>

          {/* Review request */}
          <Email from="סטודיו יופי לדוגמה" subject="איך היה? נשמח לשמוע ⭐" >
            <Header name="סטודיו יופי לדוגמה" initial="ס" tag="המשוב שלך חשוב לנו" />
            <Body>
              <Hero icon={Star} title="איך היה התור? ⭐" sub={<>נועה, תודה שבחרת בנו! דקה מזמנך תעזור לנו ולעוד לקוחות:</>} />
              <div style={{ textAlign: "center", fontSize: 30, letterSpacing: 6, marginBottom: 16, color: "#f5b301" }}>★★★★★</div>
              <div style={{ textAlign: "center" }}><Button>דרג/י אותנו</Button></div>
            </Body>
          </Email>

          {/* ── Real estate ── */}
          {/* Lead alert to agent */}
          <Email from="נדל״ן לדוגמה (התראה)" subject="🔔 ליד חדש: דוד כהן - דירת 4 חד' ברמת גן">
            <Header name="ליד חדש מהאתר" initial="נ" tag="פנייה ממתינה לחזרה" />
            <Body>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
                <span style={{ width: 46, height: 46, borderRadius: "50%", background: GREEN, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17, flexShrink: 0 }}>ד</span>
                <div><div style={{ fontSize: 18, fontWeight: 800, color: INK }}>דוד כהן</div><div style={{ fontSize: 13, color: MUTED }}>הרגע השאיר פרטים באתר</div></div>
              </div>
              <Box>
                <Row icon={Phone} label="טלפון" value="050-0000000" />
                <Row icon={Building2} label="מתעניין בנכס" value="דירת 4 חד' משופצת · רמת גן · ₪2,450,000" />
                <Row icon={User} label="מקור" value="טופס תיאום ביקור" />
              </Box>
              <div style={{ textAlign: "center", display: "flex", gap: 10, justifyContent: "center" }}>
                <Button>חייג עכשיו</Button><Button ghost>וואטסאפ</Button>
              </div>
              <p style={{ fontSize: 12, color: MUTED, textAlign: "center", margin: "16px 0 0" }}>💡 לידים שחוזרים אליהם תוך 5 דקות סוגרים יותר.</p>
            </Body>
          </Email>

          {/* Lead auto-reply to customer */}
          <Email from="נדל״ן לדוגמה" subject="קיבלנו את פנייתך - נחזור אליך בהקדם">
            <Header name="נדל״ן לדוגמה" initial="נ" tag="תודה על הפנייה" />
            <Body>
              <Hero icon={Check} title="קיבלנו את פנייתך ✓" sub={<>שלום דוד, תודה שפנית לגבי <b style={{ color: INK }}>דירת 4 חד' ברמת גן</b>. נציג יחזור אליך תוך יום עסקים.</>} />
              <p style={{ fontSize: 13, color: MUTED, textAlign: "center", margin: 0 }}>דחוף? אפשר להתקשר: <a style={{ color: GREEN_DARK, fontWeight: 600 }}>050-0000000</a></p>
            </Body>
          </Email>

          {/* ── Nonprofit ── */}
          {/* Donation thank you */}
          <Email from="עמותת לדוגמה" subject="💚 תודה על תרומתך">
            <Header name="עמותת לדוגמה" initial="ע" tag="יחד עושים טוב" />
            <Body>
              <Hero icon={Heart} title="תודה מכל הלב 🙏" sub={<>דנה יקרה, תרומתך של <b style={{ color: GREEN_DARK }}>₪250 לחודש</b> עוזרת לנו לשנות חיים - כל חודש מחדש.</>} />
              <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#fafbfa", border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
                <FileText style={{ width: 20, height: 20, color: GREEN_DARK, flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: MUTED }}>התרומה <b style={{ color: INK }}>דווחה לתרומות ישראל</b> (רשות המסים) · מס' הקצאה 24-0009182. הזיכוי (סעיף 46) יופיע אוטומטית באזור האישי שלך - <b style={{ color: INK }}>אין צורך לשמור קבלה</b>.</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", fontSize: 13, color: MUTED }}>
                <Repeat style={{ width: 15, height: 15, color: GREEN_DARK }} /> תרומה חוזרת · אפשר לעדכן או לעצור בכל עת
              </div>
            </Body>
          </Email>

          {/* Recurring donation charged */}
          <Email from="עמותת לדוגמה" subject="תרומתך החודשית התקבלה 💚">
            <Header name="עמותת לדוגמה" initial="ע" tag="הוראת קבע" />
            <Body>
              <Hero icon={Repeat} title="החיוב החודשי התקבל" sub={<>דנה, תרומתך החודשית <b style={{ color: GREEN_DARK }}>₪250</b> חויבה בהצלחה. תודה שאת איתנו לאורך זמן 🙏</>} />
              <Box>
                <Row icon={CreditCard} label="סכום" value="₪250 · חיוב 7/12" accent />
                <Row icon={FileText} label="דיווח מס" value="דווח לתרומות ישראל · הקצאה 24-0009183" />
              </Box>
              <div style={{ textAlign: "center" }}><a style={{ color: GREEN_DARK, fontWeight: 600, fontSize: 13 }}>עדכון סכום / עצירת הוראת קבע</a></div>
            </Body>
          </Email>

          <div className="rounded-2xl pv-surface2 border pv-border p-5 text-center">
            <p className="pv-text text-sm"><span className="font-bold text-primary">תרומות ישראל (חובה מ-1.1.2026):</span> תרומה שמזכה במס מדווחת אוטומטית לרשות המסים ומקבלת מספר הקצאה; הזיכוי מופיע באזור האישי של התורם - קבלת PDF כבר לא מזכה. בעמותה ללא אישור 46 / תורם אנונימי, שורת הדיווח <b>נעלמת</b> מהמייל.</p>
          </div>

          {/* ═══════════ Platform (Siango) emails ═══════════ */}
          <SectionTitle sub="נשלחים בשם Siango, בסגנון תואם">המיילים שלנו כפלטפורמה</SectionTitle>

          {/* Welcome */}
          <Email from="Siango" subject="ברוך הבא ל-Siango 👋 בוא נבנה לך אתר">
            <Header name="Siango" tag="האתר שלך במרחק דקות" platform />
            <Body>
              <Hero icon={PartyPopper} title="ברוך הבא! 👋" sub={<>שמחים שהצטרפת. תוך כמה דקות יהיה לך אתר מכירתי מלא. בוא נתחיל:</>} />
              <div style={{ textAlign: "center", marginBottom: 12 }}><Button>המשך בניית האתר</Button></div>
              <p style={{ fontSize: 13, color: MUTED, textAlign: "center", margin: 0 }}>צריך עזרה? אנחנו כאן במרכז השירות.</p>
            </Body>
          </Email>

          {/* Site published */}
          <Email from="Siango" subject="🎉 האתר שלך עלה לאוויר!">
            <Header name="Siango" tag="מזל טוב, אתה באוויר" platform />
            <Body>
              <Hero icon={Rocket} title="האתר שלך פורסם! 🎉" sub={<>האתר חי וזמין ללקוחות. הגיע הזמן לשתף אותו ולהתחיל למכור.</>} />
              <Box>
                <Row icon={Building2} label="הכתובת שלך" value="siango.app/store/your-shop" />
              </Box>
              <div style={{ textAlign: "center", display: "flex", gap: 10, justifyContent: "center" }}>
                <Button>צפייה באתר</Button><Button ghost>שיתוף בוואטסאפ</Button>
              </div>
            </Body>
          </Email>

          {/* Billing receipt */}
          <Email from="Siango" subject="קבלה על תשלום המנוי · ₪99">
            <Header name="Siango" tag="קבלה על תשלום" platform />
            <Body>
              <Hero icon={CreditCard} title="קיבלנו את התשלום ✓" sub={<>תודה! המנוי שלך פעיל. הנה הפרטים:</>} />
              <Box>
                <Row icon={Sparkles} label="תוכנית" value="פרו · חודשי" />
                <Row icon={CreditCard} label="סכום" value="₪99 (כולל מע״מ)" accent />
                <Row icon={FileText} label="חשבונית מס" value="מצורפת · #S-2041" />
              </Box>
              <div style={{ textAlign: "center" }}><a style={{ color: GREEN_DARK, fontWeight: 600, fontSize: 13 }}>ניהול המנוי</a></div>
            </Body>
          </Email>

          {/* Payment failed */}
          <Email from="Siango" subject="⚠️ התשלום לא עבר - האתר עלול לרדת">
            <Header name="Siango" tag="נדרשת פעולה" platform />
            <Body>
              <Hero icon={AlertTriangle} tint="amber" title="התשלום לא עבר" sub={<>לא הצלחנו לחייב את הכרטיס למנוי. כדי שהאתר יישאר באוויר, נא לעדכן אמצעי תשלום:</>} />
              <div style={{ textAlign: "center", marginBottom: 12 }}><Button>עדכון אמצעי תשלום</Button></div>
              <p style={{ fontSize: 13, color: MUTED, textAlign: "center", margin: 0 }}>ננסה שוב אוטומטית בימים הקרובים. שאלה? השיבו למייל.</p>
            </Body>
          </Email>

        </div>
      </div>
    </PreviewThemeRoot>
  );
};

export default EmailsVertical;
