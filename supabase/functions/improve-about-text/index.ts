import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Prefer the platform-populated client IP (cf-connecting-ip is set by Cloudflare
// and cannot be spoofed by the caller); fall back to the last x-forwarded-for hop.
const clientIp = (req: Request) =>
  req.headers.get("cf-connecting-ip") ||
  req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "ip";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Cost-abuse guard (LLM): cap per IP, matching generate-about-text.
    const rl = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!(await consumeRateLimit(rl, `improvetext:${clientIp(req)}`, 30, 3600))) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { currentText, businessName, businessCategory } = await req.json();

    if (!currentText || currentText.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "יש להזין טקסט באורך מינימלי של 10 תווים" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const categoryContext = businessCategory && businessCategory !== 'other' 
      ? `העסק פועל בתחום: ${businessCategory}.` 
      : '';

    const systemPrompt = `אתה כותב תוכן מקצועי לאתרים עסקיים בעברית.
המשימה שלך: לקחת טקסט "אודות" קיים ולשפר אותו - להפוך אותו למקצועי יותר, מפורט יותר, ומזמין יותר.

הנחיות לשיפור:
- שמור על המסר המקורי והאישיות של העסק
- שפר את הניסוח והזרימה
- הפוך את הטקסט למקצועי, מפורט ומושך יותר
- כתוב בגוף ראשון רבים ("אנחנו")
- אורך: 3-5 פסקאות (150-300 מילים)
- חלק את הטקסט לפסקאות עם ירידות שורה (\n\n) בין פסקאות
- כל פסקה צריכה להתמקד בנושא אחד:
  * פסקה 1: פתיחה - מי אנחנו ומה אנחנו עושים
  * פסקה 2: הייחודיות שלנו - מה מייחד אותנו
  * פסקה 3: הערך ללקוח - למה לבחור בנו
  * פסקה 4-5 (אופציונלי): ניסיון, ערכים, חזון
- אל תוסיף מידע שלא הוזכר בטקסט המקורי
- שמור על הטון החם והאישי
- הדגש את נקודות החוזק והייחודיות של העסק
- השתמש בשפה עשירה ומקצועית אך נגישה`;

    const userPrompt = `שם העסק: ${businessName || 'לא צוין'}
${categoryContext}

הטקסט הנוכחי:
"${currentText}"

אנא שפר את הטקסט הזה והפוך אותו למקצועי, מפורט ומעוצב יותר:
- הרחב את התוכן ל-3-5 פסקאות
- חלק לפסקאות עם ירידות שורה כפולות (\n\n)
- שמור על המסר המקורי אך הפוך אותו למקצועי ומושך יותר
- הדגש את הייחודיות והערך ללקוח

החזר רק את הטקסט המשופר, ללא כותרות או הסברים נוספים:`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "יותר מדי בקשות, נסה שוב בעוד מספר שניות" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "שגיאת תשלום בשירות AI" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("שגיאה בשירות AI");
    }

    const data = await response.json();
    const improvedText = data.choices?.[0]?.message?.content?.trim();

    if (!improvedText) {
      throw new Error("לא התקבל טקסט מהשירות");
    }

    return new Response(
      JSON.stringify({ improvedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error improving about text:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "שגיאה לא צפויה" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
