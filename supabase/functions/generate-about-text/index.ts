import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { consumeRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("cf-connecting-ip") || "ip";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Cost-abuse guard (LLM): cap per IP.
    const rl = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!(await consumeRateLimit(rl, `abouttext:${clientIp(req)}`, 30, 3600))) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { rawText, businessName, businessCategory, writingStyle } = await req.json();

    if (!rawText || rawText.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "יש להזין טקסט באורך מינימלי של 10 תווים" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const categoryContext = businessCategory && businessCategory !== 'other' 
      ? `העסק פועל בתחום: ${businessCategory}.` 
      : '';

    // Define writing style instructions
    const styleInstructions: Record<string, string> = {
      friendly: `
- כתוב בטון חם, נגיש ואישי
- השתמש בשפה יומיומית וקלה לקריאה
- הוסף נגיעה אנושית ורגשית
- תן הרגשה של שיחה עם חבר טוב`,
      professional: `
- כתוב בטון מאוזן ומכובד
- הדגש מומחיות וניסיון
- שמור על רצינות עם נגישות
- תן הרגשה של אמינות ומקצועיות`,
      formal: `
- כתוב בטון רשמי ויוקרתי
- השתמש בשפה מכובדת ומלוטשת
- הימנע מסלנג או שפה יומיומית
- תן הרגשה של יוקרה ובלעדיות`
    };

    const selectedStyle = styleInstructions[writingStyle] || styleInstructions.friendly;

    const systemPrompt = `אתה כותב תוכן מקצועי לאתרים עסקיים בעברית.
המשימה שלך: לקחת טקסט גולמי שהלקוח כתב או הקליט על העסק שלו ולהפוך אותו לטקסט "אודות" מקצועי ומזמין.

סגנון הכתיבה המבוקש:${selectedStyle}

הנחיות כלליות:
- שמור על המסר המקורי והאישיות של העסק
- כתוב בגוף ראשון רבים ("אנחנו")
- אורך אידיאלי: 2-4 משפטים (50-150 מילים)
- אל תוסיף מידע שלא הוזכר בטקסט המקורי`;

    const userPrompt = `שם העסק: ${businessName || 'לא צוין'}
${categoryContext}

הטקסט הגולמי מהלקוח:
"${rawText}"

אנא כתוב טקסט "אודות" בסגנון ${writingStyle === 'friendly' ? 'ידידותי' : writingStyle === 'professional' ? 'מקצועי' : 'רשמי'} על בסיס המידע הנ"ל:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
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
    const generatedText = data.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new Error("לא התקבל טקסט מהשירות");
    }

    return new Response(
      JSON.stringify({ aboutText: generatedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating about text:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "שגיאה לא צפויה" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
