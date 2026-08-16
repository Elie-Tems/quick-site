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
    try { userId = await requireAuth(req); } catch (res) { return res as Response; }

    const rl = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!(await consumeRateLimit(rl, `writearticle:user:${userId}`, 20, 3600))) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, businessName, businessType, aboutText } = await req.json();
    if (!title?.trim()) {
      return new Response(JSON.stringify({ error: "title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("Missing OPENAI_API_KEY");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `אתה כותב תוכן מקצועי לעסקים קטנים בישראל.
כתוב מאמר מעשי ואמין לבלוג עסקי.
הנחיות:
- אורך: 400-600 מילים
- שפה: עברית פשוטה, חמה, מקצועית
- מבנה: פתיחה קצרה, 3-4 פסקאות, סיכום קצר
- אל תכלול כותרות H1/H2, רק פסקאות רגילות
- אל תציין את שם העסק יותר מפעם אחת
- החזר JSON בלבד: { "content": "..." }`,
          },
          {
            role: "user",
            content: `נושא המאמר: ${title}
שם העסק: ${businessName || "לא צוין"}
סוג העסק: ${businessType || "לא צוין"}
רקע: ${aboutText || "לא צוין"}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{"content":""}');

    return new Response(JSON.stringify({ content: parsed.content || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("write-article error:", e);
    return new Response(JSON.stringify({ error: e.message, content: "" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
