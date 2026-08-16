import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeRateLimit } from "../_shared/rateLimit.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let userId: string;
    try {
      userId = await requireAuth(req);
    } catch (res) {
      return res as Response;
    }

    const rl = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!(await consumeRateLimit(rl, `genfaq:user:${userId}`, 20, 3600))) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { businessName, businessType, aboutText } = await req.json();
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("Missing OPENAI_API_KEY");

    const typeLabels: Record<string, string> = {
      products: "חנות מוצרים",
      services: "נותן שירות",
      realestate: "נדל\"ן",
      nonprofit: "עמותה / מלכ\"ר",
      synagogue: "בית כנסת",
      kolel: "כולל / מוסד",
      vacation: "צימר / אירוח",
    };
    const typeLabel = typeLabels[businessType as string] || businessType || "עסק";
    const nameHint = businessName ? `שם העסק: ${businessName}.` : "";
    const aboutHint = aboutText ? `\nתיאור: ${aboutText}` : "";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `אתה עוזר שיווקי לעסקים קטנים בישראל.
צור 6 שאלות נפוצות ותשובות אמיתיות עבור ${typeLabel}.
החזר JSON בלבד (ללא markdown): { "items": [ { "question": "...", "answer": "..." }, ... ] }
השאלות יהיו כאלה שלקוחות אמיתיים שואלים — מחיר, זמינות, תהליך, ניסיון, משלוח/הגעה, ביטול. תשובות קצרות (2-4 משפטים), ספציפיות ואמינות. עברית בלבד.`,
          },
          {
            role: "user",
            content: `${nameHint} סוג: ${typeLabel}.${aboutHint}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1200,
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);

    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{"items":[]}');
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-faq error:", e);
    return new Response(JSON.stringify({ error: e.message, items: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
