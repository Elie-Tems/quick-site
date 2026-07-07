import { useEffect } from "react";
import {
  CalendarCheck, Clock, MapPin, Phone, User, Heart, Bell, Check,
  Building2, MessageCircle, Sparkles, Repeat, FileText,
} from "lucide-react";
import { AuroraBg, PreviewBanner, PreviewThemeRoot } from "@/components/preview-redesign/kit";

/**
 * PREVIEW-ONLY - designed, branded transactional emails per vertical, for Moti
 * to review the DESIGN (copy already approved). Route: /preview/redesign/emails.
 * The email bodies are intentionally light (real emails render on white); the
 * page background follows the theme. Sample data only.
 */

const GREEN = "hsl(152 44% 41%)";
const GREEN_DARK = "hsl(152 46% 30%)";
const INK = "#1a2420";
const MUTED = "#5b6b63";
const LINE = "#e7ece9";

// A realistic email: an inbox context row + the white email body.
const Email = ({
  from, subject, children,
}: { from: string; subject: string; children: React.ReactNode }) => (
  <div className="w-full max-w-[600px] mx-auto">
    {/* inbox context */}
    <div className="flex items-center justify-between px-1 mb-2">
      <div className="text-sm pv-muted truncate"><span className="pv-text font-medium">{from}</span> · {subject}</div>
    </div>
    {/* email body (light, like a real email) */}
    <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#ffffff", color: INK, direction: "rtl" }}>
      {children}
      {/* footer */}
      <div style={{ background: "#f6f8f7", borderTop: `1px solid ${LINE}`, padding: "18px 28px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
          נשלח באמצעות <span style={{ color: GREEN_DARK, fontWeight: 600 }}>Siango</span> · האתר של העסק שלך
        </div>
      </div>
    </div>
  </div>
);

const Header = ({ name, tag }: { name: string; tag: string }) => (
  <div style={{ background: GREEN, padding: "26px 28px", textAlign: "center" }}>
    <img src="/logo-dark-bg.png" alt="" style={{ height: 22, margin: "0 auto 6px", display: "block", opacity: 0.95 }} />
    <div style={{ color: "#ffffff", fontWeight: 700, fontSize: 18 }}>{name}</div>
    <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 }}>{tag}</div>
  </div>
);

const Row = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${LINE}` }}>
    <span style={{ width: 34, height: 34, borderRadius: 10, background: "hsl(152 44% 41% / 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon style={{ width: 17, height: 17, color: GREEN_DARK }} />
    </span>
    <div>
      <div style={{ fontSize: 12, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>{value}</div>
    </div>
  </div>
);

const Button = ({ children }: { children: string }) => (
  <a style={{ display: "inline-block", background: GREEN, color: "#fff", fontWeight: 700, fontSize: 15, padding: "13px 30px", borderRadius: 12, textDecoration: "none" }}>{children}</a>
);

const Body = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: "28px" }}>{children}</div>
);

const EmailsVertical = () => {
  useEffect(() => { document.title = "Siango - מיילים מעוצבים (לאישור)"; }, []);

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="מיילים מעוצבים פר-וורטיקל (התוכן מאושר - לאישור עיצוב)" />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border mb-4">
            <Sparkles className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">4 מיילים · RTL · ממותג</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-2">המיילים המעוצבים</h1>
          <p className="pv-muted">התוכן שאישרת, עכשיו בעיצוב. עברו, ואם משהו לחידוד - תגידו.</p>
        </div>

        <div className="space-y-12">

          {/* 1. Services - appointment confirmation */}
          <Email from="סטודיו יופי לדוגמה" subject="התור שלך נקבע - יום ג' 14/7 בשעה 16:30">
            <Header name="סטודיו יופי לדוגמה" tag="איפור · לק ג'ל · עיצוב גבות" />
            <Body>
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <span style={{ display: "inline-flex", width: 54, height: 54, borderRadius: "50%", background: "hsl(152 44% 41% / 0.12)", alignItems: "center", justifyContent: "center" }}>
                  <CalendarCheck style={{ width: 26, height: 26, color: GREEN_DARK }} />
                </span>
                <h2 style={{ fontSize: 21, fontWeight: 800, margin: "12px 0 4px", color: INK }}>התור שלך נקבע! 🎉</h2>
                <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>שלום נועה, נשמח לראותך. הנה הפרטים:</p>
              </div>
              <div style={{ background: "#fafbfa", border: `1px solid ${LINE}`, borderRadius: 14, padding: "6px 16px", marginBottom: 20 }}>
                <Row icon={Sparkles} label="שירות" value="לק ג'ל (45 דק')" />
                <Row icon={Clock} label="מועד" value="יום שלישי, 14/7 · 16:30" />
                <Row icon={MapPin} label="כתובת" value="רחוב הדוגמה 10, תל אביב" />
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: "hsl(152 44% 41% / 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Check style={{ width: 17, height: 17, color: GREEN_DARK }} />
                  </span>
                  <div><div style={{ fontSize: 12, color: MUTED }}>מקדמה</div><div style={{ fontSize: 15, fontWeight: 600, color: GREEN_DARK }}>שולמה ₪50</div></div>
                </div>
              </div>
              <div style={{ textAlign: "center", marginBottom: 14 }}><Button>הוספה ליומן</Button></div>
              <p style={{ fontSize: 13, color: MUTED, textAlign: "center", margin: 0 }}>
                צריכה לשנות? <a style={{ color: GREEN_DARK, fontWeight: 600 }}>ביטול / שינוי תור</a> · נשלח תזכורת יום לפני.
              </p>
            </Body>
          </Email>

          {/* 2. Services - reminder */}
          <Email from="סטודיו יופי לדוגמה" subject="תזכורת: יש לך תור מחר">
            <Header name="סטודיו יופי לדוגמה" tag="נתראה מחר!" />
            <Body>
              <div style={{ display: "flex", gap: 14, alignItems: "center", background: "hsl(152 44% 41% / 0.06)", border: `1px solid hsl(152 44% 41% / 0.2)`, borderRadius: 14, padding: 16 }}>
                <span style={{ width: 46, height: 46, borderRadius: 12, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bell style={{ width: 22, height: 22, color: "#fff" }} />
                </span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: INK }}>תזכורת: תור מחר בשעה 16:30</div>
                  <div style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>לק ג'ל · רחוב הדוגמה 10, תל אביב</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: INK, textAlign: "center", margin: "18px 0 14px" }}>מחכים לך 💚 אם צריך לבטל, אפשר עדיין:</p>
              <div style={{ textAlign: "center" }}><a style={{ color: GREEN_DARK, fontWeight: 600, fontSize: 14 }}>ביטול תור</a></div>
            </Body>
          </Email>

          {/* 3. Real estate - new lead (to agent) */}
          <Email from="נדל״ן לדוגמה (התראה)" subject="🔔 ליד חדש: דוד כהן - דירת 4 חד' ברמת גן">
            <Header name="ליד חדש מהאתר" tag="פנייה ממתינה לחזרה" />
            <Body>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
                <span style={{ width: 46, height: 46, borderRadius: "50%", background: GREEN, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17, flexShrink: 0 }}>ד</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: INK }}>דוד כהן</div>
                  <div style={{ fontSize: 13, color: MUTED }}>הרגע השאיר פרטים באתר</div>
                </div>
              </div>
              <div style={{ background: "#fafbfa", border: `1px solid ${LINE}`, borderRadius: 14, padding: "6px 16px", marginBottom: 20 }}>
                <Row icon={Phone} label="טלפון" value="050-0000000" />
                <Row icon={Building2} label="מתעניין בנכס" value="דירת 4 חד' משופצת · רמת גן · ₪2,450,000" />
                <Row icon={User} label="מקור" value="טופס תיאום ביקור" />
              </div>
              <div style={{ textAlign: "center", display: "flex", gap: 10, justifyContent: "center" }}>
                <Button>חייג עכשיו</Button>
                <a style={{ display: "inline-block", background: "#fff", color: GREEN_DARK, fontWeight: 700, fontSize: 15, padding: "13px 24px", borderRadius: 12, textDecoration: "none", border: `1.5px solid ${GREEN}` }}>וואטסאפ</a>
              </div>
              <p style={{ fontSize: 12, color: MUTED, textAlign: "center", margin: "16px 0 0" }}>💡 לידים שחוזרים אליהם תוך 5 דקות סוגרים יותר.</p>
            </Body>
          </Email>

          {/* 4. Nonprofit - donation thank you */}
          <Email from="עמותת לדוגמה" subject="💚 תודה על תרומתך">
            <Header name="עמותת לדוגמה" tag="יחד עושים טוב" />
            <Body>
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <span style={{ display: "inline-flex", width: 54, height: 54, borderRadius: "50%", background: "hsl(152 44% 41% / 0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Heart style={{ width: 26, height: 26, color: GREEN_DARK }} />
                </span>
                <h2 style={{ fontSize: 21, fontWeight: 800, margin: "12px 0 6px", color: INK }}>תודה מכל הלב 🙏</h2>
                <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.7 }}>
                  דנה יקרה, תרומתך של <b style={{ color: GREEN_DARK }}>₪250 לחודש</b> עוזרת לנו לשנות חיים - כל חודש מחדש.
                </p>
              </div>
              {/* Section 46 - CONDITIONAL. Shown only if the nonprofit enabled it. */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#fafbfa", border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
                <FileText style={{ width: 20, height: 20, color: GREEN_DARK, flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: MUTED }}>מצורפת <b style={{ color: INK }}>קבלה מוכרת לצורכי מס (סעיף 46)</b>. שמרו אותה.</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", fontSize: 13, color: MUTED }}>
                <Repeat style={{ width: 15, height: 15, color: GREEN_DARK }} /> תרומה חוזרת · אפשר לעדכן או לעצור בכל עת
              </div>
            </Body>
          </Email>

          <div className="rounded-2xl pv-surface2 border pv-border p-5 text-center">
            <p className="pv-text text-sm">
              <span className="font-bold text-primary">סעיף 46 מותנה:</span> בעמותה ללא אישור 46, השורה של הקבלה <b>נעלמת לגמרי</b> מהמייל (לא מזכירים אותה בכלל).
            </p>
          </div>
        </div>
      </div>
    </PreviewThemeRoot>
  );
};

export default EmailsVertical;
