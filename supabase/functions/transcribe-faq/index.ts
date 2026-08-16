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
    if (!(await consumeRateLimit(rl, `transcribefaq:user:${userId}`, 10, 3600))) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { audio, mimeType } = await req.json();
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("Missing OPENAI_API_KEY");

    // Decode base64 audio
    const binaryStr = atob(audio as string);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const audioBlob = new Blob([bytes], { type: (mimeType as string) || "audio/webm" });

    // Transcribe with Whisper
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "he");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
    });

    if (!whisperRes.ok) throw new Error(`Whisper error ${whisperRes.status}`);

    const whisperData = await whisperRes.json();
    const transcript = (whisperData.text as string) || "";

    if (!transcript.trim()) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert transcript to FAQ Q&A pairs
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `אתה עוזר שמעבד הקלטות קוליות לשאלות ותשובות עבור אתר עסקי.
בעל העסק הקליט הסבר חופשי על העסק שלו. חלץ מתוכו שאלות ותשובות נפוצות.
אם הוא אמר "שואלים אותי..." / "הרבה פעמים שואלים" / "השאלה הכי נפוצה" — אלה שאלות ברורות.
אם הוא תיאר תהליך, מחיר, או מדיניות — נסח אותם כשאלה+תשובה.
החזר JSON בלבד: { "items": [ { "question": "...", "answer": "..." } ] }
עד 8 פריטים. עברית בלבד. אל תמציא מידע שלא נאמר.`,
          },
          {
            role: "user",
            content: `תמלול ההקלטה:\n\n${transcript}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!gptRes.ok) throw new Error(`GPT error ${gptRes.status}`);

    const gptData = await gptRes.json();
    const parsed = JSON.parse(gptData.choices?.[0]?.message?.content || '{"items":[]}');
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return new Response(JSON.stringify({ items, transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("transcribe-faq error:", e);
    return new Response(JSON.stringify({ error: e.message, items: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
