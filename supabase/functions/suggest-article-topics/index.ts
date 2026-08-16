import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeRateLimit } from "../_shared/rateLimit.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TYPE_LABELS: Record<string, string> = {
  products: "חנות מוצרים",
  services: "נותן שירות",
  realestate: 'נדל"ן',
  nonprofit: "עמותה / מלכ\"ר",
  synagogue: "בית כנסת",
  kolel: "כולל / מוסד תורני",
  vacation: "צימר / אירוח",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let userId: string;
    try { userId = await requireAuth(req); } catch (res) { return res as Response; }

    const rl = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!(await consumeRateLimit(rl, `sugarticles:user:${userId}`, 10, 3600))) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { businessName, businessType, aboutText } = await req.json();
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("Missing OPENAI_API_KEY");

    const typeLabel = TYPE_LABELS[businessType as string] || businessType || "עסק";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `אתה יועץ תוכן לעסקים קטנים בישראל.
הצע 6 נושאים למאמרים לבלוג עסקי. הנושאים צריכים:
- לענות על שאלות אמיתיות שלקוחות שואלים
- לחזק את האמינות של העסק
- להיות ספציפיים לתחום, לא גנריים
החזר JSON בלבד: { "topics": [ { "title": "...", "description": "משפט אחד - למה המאמר הזה שווה לקרוא" } ] }
עברית בלבד.`,
          },
          {
            role: "user",
            content: `סוג עסק: ${typeLabel}
שם: ${businessName || "לא צוין"}
תיאור: ${aboutText || "לא צוין"}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
        temperature: 0.8,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{"topics":[]}');

    return new Response(JSON.stringify({ topics: parsed.topics || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("suggest-article-topics error:", e);
    return new Response(JSON.stringify({ error: e.message, topics: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
