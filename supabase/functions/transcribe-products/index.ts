import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { consumeRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("cf-connecting-ip") || "ip";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Cost-abuse guard (Whisper + GPT): cap transcriptions per IP.
    const rl = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!(await consumeRateLimit(rl, `transcribe:${clientIp(req)}`, 30, 3600))) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    const whisperData = await whisperRes.json();
    const transcript = whisperData.text as string;

    if (!transcript) {
      return new Response(JSON.stringify({ transcript: "", products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse transcript into products
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
            content:
              'You are a product list parser. The user dictated a list of products in Hebrew. Parse it into structured data. Return ONLY a JSON object with a "products" array. Each product: { "name": string (required), "price": number (required), "description": string (optional) }. Numbers in Hebrew should be converted to digits. Return at most 50 products.',
          },
          {
            role: "user",
            content: `Parse these dictated products:\n\n${transcript}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
      }),
    });

    const gptData = await gptRes.json();
    const content = gptData.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || '{"products":[]}');
    const products = Array.isArray(parsed.products) ? parsed.products : [];

    return new Response(JSON.stringify({ transcript, products }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("transcribe-products error:", e);
    return new Response(JSON.stringify({ error: e.message, transcript: "", products: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
