import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
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
    const rl = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!(await consumeRateLimit(rl, `gencontent:${clientIp(req)}`, 20, 3600))) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { rawText, businessName, businessCategory, businessType } = await req.json();

    if (!rawText || rawText.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "יש להזין טקסט באורך מינימלי של 10 תווים" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const categoryHint = businessCategory && businessCategory !== "other"
      ? `תחום העסק: ${businessCategory}.`
      : "";
    const typeHint = businessType ? `סוג העסק: ${businessType}.` : "";
    const nameHint = businessName ? `שם העסק: ${businessName}.` : "";

    const systemPrompt = `אתה עוזר שיווקי לבניית אתרי עסקים קטנים בישראל.
קבל תיאור גולמי של עסק והחזר JSON בלבד (ללא markdown, ללא הסבר) עם המפתחות הבאים:
- heroTitle: כותרת ראשית קצרה ומושכת לאתר (עד 10 מילים). אל תכלול את שם העסק.
- tagline: משפט תגית קצר שמייחד את העסק (עד 8 מילים).
- aboutText: טקסט אודות בגוף שלישי, 2-3 משפטים, חם ואמיתי.
- heroBenefits: 3 יתרונות/נקודות מכירה קצרות, מופרדות בסימן ✦ (למשל: "✦ יתרון ראשון  ✦ יתרון שני  ✦ יתרון שלישי").
- promoText: משפט פרומו/מבצע מפתה או הזמנה לפעולה (עד 10 מילים). אם אין מידע על מבצע — המצא משהו סביר.
כתוב בעברית בלבד. היה ספציפי לעסק, אל תהיה גנרי.`;

    const userPrompt = `${nameHint} ${categoryHint} ${typeHint}

תיאור העסק:
${rawText.trim()}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": LOVABLE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const aiData = await res.json();
    const raw = aiData.content?.[0]?.text || "";

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Failed to parse AI response as JSON");
      parsed = JSON.parse(match[0]);
    }

    return new Response(
      JSON.stringify({
        heroTitle: parsed.heroTitle || "",
        tagline: parsed.tagline || "",
        aboutText: parsed.aboutText || "",
        heroBenefits: parsed.heroBenefits || "",
        promoText: parsed.promoText || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-content error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
