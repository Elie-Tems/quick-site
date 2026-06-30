import { useState } from "react";
import { ChevronDown, HelpCircle, ExternalLink, Check } from "lucide-react";
import { providerLogo } from "@/lib/partnerLinks";
import { PAYPLUS_SIGNUP_URL } from "@/hooks/usePayplus";

// Prominent, plain-language "where are you with payments?" guide. Written for
// non-technical merchants who don't know terms like "מספר ספק / מסוף / מאגד".
// Facts are paraphrased from public knowledge (incl. how Israeli credit-card
// processing works) - never copied verbatim.

interface Provider { id: string; name: string; domain: string; blurb: string; url: string; }

// Providers that complete a payment page + invoicing on top of an existing terminal.
const INVOICING_PROVIDERS: Provider[] = [
  { id: "icount", name: "iCount", domain: "icount.co.il", blurb: "חשבוניות + דף תשלום", url: "https://www.icount.co.il/r?aff=471310" },
  { id: "morning", name: "Morning (חשבונית ירוקה)", domain: "morning.co.il", blurb: "חשבוניות + דף תשלום", url: "https://www.morning.co.il" },
  { id: "meshulam", name: "משולם / Grow", domain: "meshulam.co.il", blurb: "סליקה + חשבוניות", url: "https://meshulam.co.il" },
];

// Full processing providers (open a new merchant account through us).
const SLIQA_PROVIDERS: Provider[] = [
  { id: "payplus", name: "PayPlus", domain: "payplus.co.il", blurb: "סליקה + דף תשלום + חשבוניות. מומלץ.", url: PAYPLUS_SIGNUP_URL },
  { id: "hyp", name: "HYP (היפ)", domain: "hyp.co.il", blurb: "פתרון סליקה מלא, בתנאים מועדפים.", url: "https://links.hyp.co.il/4xV3lEE" },
  { id: "cardcom", name: "Cardcom", domain: "cardcom.co.il", blurb: "סליקה מתקדמת - נציג חוזר אליכם.", url: "mailto:office@siango.app?subject=פתיחת חשבון Cardcom" },
  { id: "paypal", name: "PayPal", domain: "paypal.com", blurb: "תשלומים מחו\"ל. לא מפיק חשבונית מס בישראל.", url: "https://www.paypal.com/il/business" },
];

const ProviderCard = ({ p }: { p: Provider }) => (
  <a href={p.url} target="_blank" rel="noopener noreferrer"
    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition-colors">
    <img src={providerLogo(p.domain)} alt={p.name} className="h-8 w-8 rounded shrink-0" loading="lazy" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
      <p className="text-[11px] text-muted-foreground truncate">{p.blurb}</p>
    </div>
    <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
  </a>
);

const STATES = [
  { n: "1", title: "אין לי בכלל סליקה וחשבוניות", sub: "מתחילים מאפס" },
  { n: "2", title: "יש לי מספר ספק, אין דף סליקה/חשבוניות", sub: "חסר להשלים" },
  { n: "3", title: "יש לי את שלושתם", sub: "מוכן לחיבור" },
] as const;

const PaymentsQuickStart = ({ onConnect }: { onConnect?: () => void }) => {
  const [state, setState] = useState<"1" | "2" | "3">("1");
  const [showFindNumber, setShowFindNumber] = useState(false);

  return (
    <div className="mb-6 rounded-2xl border-2 border-primary/30 bg-primary/[0.04] p-5" dir="rtl">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/12 rounded-full px-2 py-0.5">
          <Check className="h-3 w-3" /> השלב הכי חשוב כדי להתחיל למכור
        </span>
      </div>
      <h2 className="text-lg font-bold text-foreground">בואו נחבר תשלומים - איפה אתם עומדים כרגע?</h2>
      <p className="text-sm text-muted-foreground mb-4">בוחרים מצב אחד, ואנחנו לוקחים אתכם משם צעד-אחר-צעד. בלי מונחים טכניים.</p>

      {/* State picker */}
      <div className="grid gap-2.5 sm:grid-cols-3 mb-4">
        {STATES.map((s) => (
          <button key={s.n} type="button" onClick={() => setState(s.n)}
            className={`text-right rounded-xl p-3.5 border transition-colors ${state === s.n ? "border-primary border-2 bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${state === s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s.n}</span>
            <p className="text-sm font-medium text-foreground leading-snug mt-2">{s.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </button>
        ))}
      </div>

      {/* Guidance per state */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        {state === "1" && (
          <>
            <p className="text-sm font-semibold text-foreground">מתחילים מאפס - נפתח לכם חשבון סליקה</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              "סליקה" זה פשוט היכולת לקבל תשלום בכרטיס אשראי. כדי לקבל אותה פותחים <b>חשבון סליקה</b> אצל אחד מהספקים. הדרך הכי מהירה לעסק קטן - דרך <b>מאגד</b> (חברה שמסלקת בשמכם, הקמה תוך ימים). בנפח גדול אפשר בהמשך לעבור לחוזה ישיר מול חברת אשראי בתנאים טובים יותר.
            </p>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs font-medium text-foreground mb-1">מה תתבקשו כשפותחים חשבון:</p>
              <p className="text-xs text-muted-foreground leading-relaxed">ת"ז או ח"פ של העסק · חשבון בנק של העסק (לשם ייכנס הכסף) · פרטי העסק ותחום העיסוק. ההקמה בדרך כלל לוקחת כמה ימי עסקים.</p>
            </div>
            <p className="text-sm text-muted-foreground">פותחים חשבון דרכנו - בתנאים מועדפים:</p>
            <div className="grid gap-2 sm:grid-cols-2">{SLIQA_PROVIDERS.map((p) => <ProviderCard key={p.id} p={p} />)}</div>
          </>
        )}

        {state === "2" && (
          <>
            <p className="text-sm font-semibold text-foreground">יש לכם מספר ספק - נשלים דף תשלום + חשבוניות</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              מעולה - אם כבר יש לכם מסוף או חשבון סליקה, צריך רק להוסיף מערכת שמפיקה <b>דף תשלום באתר</b> ו<b>חשבונית אוטומטית</b> לכל מכירה. בוחרים אחת, מזינים את מספר הספק, ומסיימים:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">{INVOICING_PROVIDERS.map((p) => <ProviderCard key={p.id} p={p} />)}</div>

            {/* Where to find the provider number - the key non-technical explainer */}
            <button type="button" onClick={() => setShowFindNumber((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-primary mt-1">
              <HelpCircle className="h-4 w-4" /> איפה אני מוצא את מספר הספק שלי?
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFindNumber ? "rotate-180" : ""}`} />
            </button>
            {showFindNumber && (
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed space-y-1.5">
                <p><b className="text-foreground">מספר ספק</b> (נקרא גם "מספר בית עסק") הוא המספר שחברת האשראי נתנה לעסק שלכם כדי לסלוק. הנה איפה מוצאים אותו:</p>
                <p>📄 על <b>דוח הסליקה או החשבונית החודשית</b> שאתם מקבלים מחברת האשראי / חברת הסליקה.</p>
                <p>🧾 אם יש לכם <b>קופה רושמת או מסוף</b> - המספר מופיע בהגדרות המסוף ובדוחות הסיכום היומיים שלו.</p>
                <p>📞 הכי פשוט: <b>מתקשרים לחברת האשראי</b> (או לחברת הסליקה שלכם) ומבקשים את "מספר בית העסק".</p>
                <p>אם עדיין אין לכם מספר ספק - אתם למעשה במצב 1 למעלה, ושם נפתח לכם אחד.</p>
              </div>
            )}
          </>
        )}

        {state === "3" && (
          <>
            <p className="text-sm font-semibold text-foreground">יש לכם הכל - רק מחברים</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              מושלם. נשאר רק להזין את פרטי הסליקה שלכם (מפתח API / פרטי מסוף) ולחבר לאתר. לוקח כ-2 דקות, עם הדרכה צעד-אחר-צעד.
            </p>
            {onConnect && (
              <button onClick={onConnect} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                חברו את הסליקה שלי <Check className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">לא בטוחים? כתבו לנו במרכז הידע / לבוט - נעזור לכם למצוא את הדרך המתאימה לעסק.</p>
    </div>
  );
};

export default PaymentsQuickStart;
