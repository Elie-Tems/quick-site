import { sendViaResend } from "../_shared/email/resend.ts";

// One-off: send the Siango system newsletter to the two admins (Moti + Daniel)
// so they can review and forward to first test customers. Recipients are
// hardcoded to admins, so it can't be abused to spam others. Trivial token guard.

const ADMINS = ["moti4384@gmail.com", "furmand713@gmail.com"];
// Trigger token comes from the NEWSLETTER_TOKEN secret - never hardcode it in git.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const G = "#0E9F6E"; // siango green
const INK = "#111827";
const MUT = "#6B7280";
const LINE = "#E5E7EB";
const BG = "#F3F4F6";

const card = (title: string, body: string, badge = "") => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid ${LINE};border-radius:12px;background:#fff;">
    <tr><td style="padding:16px 18px;">
      <div style="font-size:16px;font-weight:700;color:${INK};margin-bottom:4px;">${title}${badge ? ` <span style="font-size:11px;font-weight:700;color:#fff;background:${G};border-radius:999px;padding:2px 8px;margin-right:6px;">${badge}</span>` : ""}</div>
      <div style="font-size:14px;line-height:1.7;color:${MUT};">${body}</div>
    </td></tr>
  </table>`;

const sectionTitle = (t: string, sub: string) => `
  <div style="margin:26px 0 12px;">
    <div style="font-size:20px;font-weight:800;color:${INK};">${t}</div>
    <div style="font-size:13px;color:${MUT};">${sub}</div>
  </div>`;

const NEWSLETTER_HTML = `<!DOCTYPE html>
<html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG};font-family:Arial,Helvetica,sans-serif;direction:rtl;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 0;"><tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

  <!-- Header -->
  <tr><td style="background:${G};border-radius:16px 16px 0 0;padding:34px 28px;text-align:center;">
    <div style="font-size:30px;font-weight:800;color:#fff;letter-spacing:-0.5px;">siango</div>
    <div style="font-size:15px;color:#D1FAE5;margin-top:6px;">בניית חנות אונליין חכמה - בעברית, בדקות</div>
  </td></tr>

  <!-- Intro -->
  <tr><td style="background:#fff;padding:26px 28px;">
    <div style="font-size:22px;font-weight:800;color:${INK};margin-bottom:8px;">ברוכים הבאים לבדיקות הראשונות 🚀</div>
    <div style="font-size:15px;line-height:1.8;color:${MUT};">
      סיאנגו היא מערכת שלמה להקמה וניהול של חנות אונליין - מאתר מעוצב, דרך מוצרים והזמנות, ועד שיווק, לקוחות ודיוור.
      הכל בעברית, הכל במקום אחד. ריכזנו כאן את <b>כל</b> מה שהמערכת יודעת לעשות היום, ומה שמגיע בקרוב.
      <br><br>
      <span style="background:#FEF3C7;color:#92400E;font-size:13px;font-weight:700;border-radius:8px;padding:4px 10px;">לתשומת לבכם: בשלב הבדיקות אין תשלום - הכל פתוח לשימוש חופשי.</span>
    </div>
  </td></tr>

  <!-- Content -->
  <tr><td style="background:#fff;padding:0 28px 28px;">

    ${sectionTitle("מה אפשר לעשות היום", "פיצ'רים חיים במערכת")}

    ${card("בניית האתר באשף חכם", "תהליך הקמה מודרך: בוחרים תחום ועיצוב, ממלאים פרטי עסק, מוסיפים מוצרים, ומפרסמים. AI מציע תיאורים, תמונות וטקסט 'אודות'. תצוגה מקדימה חיה של החנות לאורך כל הדרך.")}

    ${card("ניהול מוצרים (במקום אחד)", "מסך מוצרים עם 3 טאבים: <b>רשימת מוצרים</b> (הוספה ידנית, מ-Excel, מ-PDF, סריקת קישור מאתר קיים כולל תמונות, או <b>הקלטה קולית</b>), <b>קטגוריות</b>, ו<b>מבצעים ומובילים</b> (מחיר מבצע + תג 'מוביל'). יצירת תמונות מוצר ב-AI כולל <b>עריכת תמונה</b> (img2img) בכתיבת הוראה.")}

    ${card("הזמנות", "כל ההזמנות במסך אחד - פרטי לקוח, פריטים, סכום. שינוי סטטוס (התקבלה / ממתין לתשלום / הושלמה / בוטלה) שנשמר אוטומטית. קליק על טלפון פותח וואטסאפ ללקוח.")}

    ${card("לקוחות (CRM)", "כרטיס לקוח שנבנה אוטומטית מההזמנות: פרטי קשר, מספר הזמנות, <b>סך רכישות (LTV)</b>, ממוצע, ופירוט רכישות מלא. סינון לפי <b>סגמנטים</b> (VIP / רדומים / חוזרים / חדשים) ו<b>אזור הזדמנויות</b> להחזרת לקוחות - הכל באישור בעל החנות.")}

    ${card("עיצוב החנות", "מסך עיצוב עם טאבים: <b>תבנית ועיצוב</b> (תבניות, פונטים, צבע ראשי, תמונה ראשית/באנר) ו<b>באנרים</b>. שינויים מתעדכנים באתר מיד.")}

    ${card("שיווק וקידום", "<b>קמפיינים</b>, <b>קופוני הנחה</b>, <b>תגי שיווק ומעקב</b> (GTM, Google Analytics, פיקסל Meta, Google Ads, טיקטוק + קוד מותאם - תוסף ₪149 חד-פעמי), <b>ביקורות Google</b> בחנות (תוסף ₪14/חודש), <b>מקורות הגעה</b> ו<b>תובנות</b> (משפך המרה).")}

    ${card("סליקה ומשלוחים", "חיבור <b>PayPlus</b> (אשראי + ביט + חשבוניות אוטומטיות) עם הדרכה צעד-אחר-צעד, או מצב <b>'הזמנות בלבד'</b> ללא סליקה. הגדרת איסוף עצמי / משלוח ועלות משלוח.")}

    ${card("דומיין אישי", "חיפוש ורכישת דומיין מותאם לחנות ישירות מתוך המערכת, עם חיבור אוטומטי.")}

    ${card("מרכז ידע ובוט עזרה", "מרכז ידע מסודר עם קטגוריות, חיפוש ומדריכים, וגם <b>בוט עזרה חכם</b> בעברית שעונה על כל שאלה - זמין בכל עמוד בדשבורד.")}

    ${card("פרטים שחשוב להכיר", "תמיכה ב<b>ריבוי שפות</b> (אוטומטי לפי מדינת הגולש), הצגת מחירים כולל <b>מע\"מ</b>, <b>הסכמת עוגיות</b> תקנית (פיקסלים נטענים רק אחרי אישור), נגישות, וצפייה ב<b>חשבוניות</b> שלך (iCount).")}

    ${sectionTitle("בקרוב", "כבר בבנייה - יצורף בהמשך")}

    ${card("וואטסאפ", "תיבת שיחות מאוחדת, דיוור וברודקאסט ללקוחות, ובוט מענה אוטומטי - הכל מהמספר העסקי שלכם.", "בקרוב")}

    ${card("מייל עסקי", "כתובת מייל מקצועית על הדומיין שלכם (למשל info@my-store.co.il).", "בקרוב")}

    ${card("מערכת דיוור (Newsletter)", "שליחת ניוזלטרים ומבצעים, קהלים וסגמנטים, תבניות RTL, אוטומציות (ברכת הצטרפות, שחזור עגלה, יום הולדת), ואנליטיקה עם ייחוס הכנסה - מסונכרן עם ה-CRM.", "בקרוב")}

    ${card("CRM Pro", "אוטומציות מתקדמות, ניסוח הודעות ב-AI, חיזוי נטישה, נאמנות ו'הפנה חבר', ואזור אישי ללקוח הקצה (הזמנות + הזמנה חוזרת בלחיצה).", "בקרוב")}

  </td></tr>

  <!-- CTA -->
  <tr><td style="background:#fff;padding:0 28px 30px;text-align:center;">
    <a href="https://siango.app/dashboard" style="display:inline-block;background:${G};color:#fff;font-size:16px;font-weight:700;text-decoration:none;border-radius:10px;padding:14px 30px;">כניסה לדשבורד</a>
    <div style="font-size:13px;color:${MUT};margin-top:14px;">יש שאלה? <a href="https://siango.app/help" style="color:${G};">מרכז הידע</a> · <a href="mailto:office@siango.app" style="color:${G};">office@siango.app</a></div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#111827;border-radius:0 0 16px 16px;padding:20px 28px;text-align:center;">
    <div style="font-size:13px;color:#9CA3AF;">סיאנגו · ארפור טכנולוגיות בע"מ · בניית חנויות אונליין</div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const expectedToken = Deno.env.get("NEWSLETTER_TOKEN");
  if (!expectedToken || url.searchParams.get("token") !== expectedToken) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const result = await sendViaResend({
    to: ADMINS,
    subject: "סיאנגו - סקירת המערכת לקראת בדיקות ראשונות 🚀",
    html: NEWSLETTER_HTML,
    fromName: "סיאנגו",
  });
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
