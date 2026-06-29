// One-off: email the Siango presentation to the two admins, as a self-contained
// HTML deck attachment (openable / presentable offline) + a link to the live one.
// Recipients hardcoded to admins; trivial token guard.

const ADMINS = ["moti4384@gmail.com", "furmand713@gmail.com"];
// Trigger token comes from the NEWSLETTER_TOKEN secret - never hardcode it in git.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const G = "#0E9F6E";
const SLIDES: { eyebrow: string; title: string; points: string[]; soon?: boolean; cover?: boolean }[] = [
  { eyebrow: "", title: "siango", points: ["בניית חנות אונליין חכמה - בעברית, בדקות"], cover: true },
  { eyebrow: "ההתחלה", title: "בניית האתר באשף חכם", points: ["תהליך מודרך: תחום, עיצוב, פרטי עסק, מוצרים, פרסום", "AI מציע תיאורים, תמונות וטקסט 'אודות'", "תצוגה מקדימה חיה לאורך כל הדרך"] },
  { eyebrow: "תוכן החנות", title: "ניהול מוצרים - הכל במקום אחד", points: ["רשימה / קטגוריות / מבצעים - בטאבים", "הוספה ידנית, Excel, PDF, סריקת קישור, או הקלטה קולית", "תמונות מוצר ב-AI + עריכת תמונה"] },
  { eyebrow: "ניהול מכירות", title: "הזמנות ולקוחות (CRM)", points: ["ניהול הזמנות + סטטוסים שנשמרים", "כרטיס לקוח אוטומטי: LTV, היסטוריה", "סגמנטים + אזור הזדמנויות"] },
  { eyebrow: "מראה", title: "עיצוב החנות", points: ["תבניות, פונטים, צבע ראשי, תמונה ראשית", "ניהול באנרים", "מתעדכן באתר מיד"] },
  { eyebrow: "צמיחה", title: "שיווק וקידום", points: ["קמפיינים + קופונים", "תגי מעקב (Meta/Google/טיקטוק) - ₪149", "ביקורות Google - ₪14/חודש", "מקורות הגעה + תובנות"] },
  { eyebrow: "תפעול", title: "סליקה, משלוחים ודומיין", points: ["PayPlus או 'הזמנות בלבד'", "איסוף / משלוח + עלות", "רכישת דומיין מהמערכת"] },
  { eyebrow: "תמיכה", title: "מרכז ידע ובוט חכם", points: ["מרכז ידע עם חיפוש", "בוט עזרה בעברית בכל עמוד", "ריבוי שפות, מע\"מ, עוגיות תקני, חשבוניות"] },
  { eyebrow: "בקרוב", title: "מה שמגיע", points: ["וואטסאפ - שיחות, דיוור ובוט", "מייל עסקי על הדומיין", "מערכת דיוור מלאה", "CRM Pro - אוטומציות ו-AI"], soon: true },
  { eyebrow: "בשלב הבדיקות - הכל פתוח וללא תשלום", title: "מתחילים?", points: ["siango.app"], cover: true },
];

const slideHtml = (s: typeof SLIDES[number], idx: number) => {
  const accent = s.soon ? "#7C3AED" : G;
  const inner = s.cover
    ? `<div style="text-align:center"><div style="font-size:64px;font-weight:800;color:${idx === 0 ? G : "#fff"}">${s.title}</div><div style="font-size:22px;color:${accent};margin-top:18px;font-weight:700">${s.points[0]}</div></div>`
    : `<div style="font-size:14px;letter-spacing:2px;color:rgba(255,255,255,.5);font-weight:700">${s.eyebrow}</div>
       <div style="font-size:40px;font-weight:800;margin:6px 0 24px">${s.title}</div>
       <ul style="list-style:none;padding:0;margin:0">${s.points.map((p) => `<li style="display:flex;gap:12px;align-items:flex-start;font-size:20px;margin:12px 0;color:rgba(255,255,255,.92)"><span style="margin-top:9px;width:8px;height:8px;border-radius:50%;background:${accent};flex:0 0 auto"></span>${p}</li>`).join("")}</ul>`;
  return `<section class="slide" style="display:${idx === 0 ? "flex" : "none"};min-height:100vh;align-items:center;justify-content:center;padding:48px"><div style="max-width:760px;width:100%">${inner}</div></section>`;
};

const DECK_HTML = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>מצגת סיאנגו</title>
<style>body{margin:0;background:#0B1120;color:#fff;font-family:Heebo,Arial,sans-serif}.dots{position:fixed;bottom:18px;left:0;right:0;display:flex;gap:8px;justify-content:center}.dot{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.25);border:none;cursor:pointer}.dot.on{background:${G}}.nav{position:fixed;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.08);border:none;color:#fff;font-size:28px;width:48px;height:48px;border-radius:50%;cursor:pointer}</style></head>
<body>${SLIDES.map(slideHtml).join("")}
<button class="nav" style="right:18px" onclick="go(-1)">&#8250;</button>
<button class="nav" style="left:18px" onclick="go(1)">&#8249;</button>
<div class="dots" id="dots"></div>
<script>var i=0,S=document.querySelectorAll('.slide');var d=document.getElementById('dots');S.forEach(function(_,k){var b=document.createElement('button');b.className='dot'+(k===0?' on':'');b.onclick=function(){show(k)};d.appendChild(b)});function show(n){i=Math.max(0,Math.min(S.length-1,n));S.forEach(function(s,k){s.style.display=k===i?'flex':'none'});document.querySelectorAll('.dot').forEach(function(x,k){x.className='dot'+(k===i?' on':'')})}function go(x){show(i+x)}document.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'||e.key===' ')go(1);if(e.key==='ArrowRight')go(-1)});</script>
</body></html>`;

const EMAIL_HTML = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111827">
<div style="font-size:26px;font-weight:800;color:${G}">siango</div>
<p style="font-size:16px;line-height:1.7;color:#374151">מצורפת המצגת המקיפה על המערכת (קובץ HTML - פותחים בדפדפן ומציגים עם החיצים).</p>
<p style="font-size:16px;line-height:1.7;color:#374151">אפשר גם להציג ישירות מהלינק:</p>
<p><a href="https://siango.app/presentation" style="display:inline-block;background:${G};color:#fff;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 26px">פתיחת המצגת ↗</a></p>
<p style="font-size:13px;color:#6B7280">סיאנגו · ארפור טכנולוגיות בע"מ</p></div>`;

// UTF-8 safe base64 for the attachment.
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const expectedToken = Deno.env.get("NEWSLETTER_TOKEN");
  if (!expectedToken || url.searchParams.get("token") !== expectedToken) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ ok: false, error: "no RESEND_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "סיאנגו <noreply@send.siango.app>",
      to: ADMINS,
      subject: "סיאנגו - מצגת המערכת 🎬",
      html: EMAIL_HTML,
      reply_to: "office@siango.app",
      attachments: [{ filename: "siango-presentation.html", content: toBase64(DECK_HTML) }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify({ ok: res.ok, id: (data as any)?.id, error: res.ok ? undefined : data }), {
    status: res.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
