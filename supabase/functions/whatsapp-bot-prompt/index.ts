// Turns a merchant's rough description (typed text OR a voice recording) into a
// professional WhatsApp service-bot instruction. Voice -> OpenAI Whisper
// transcription -> LLM rewrite into a clean, safe Hebrew bot prompt.
// Auth: the logged-in merchant (JWT). BUILD-ONLY: not deployed until approved.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function transcribe(audioB64: string): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("transcription not configured");
  const bytes = Uint8Array.from(atob(audioB64), (c) => c.charCodeAt(0));
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "audio/webm" }), "prompt.webm");
  form.append("model", "whisper-1");
  form.append("language", "he");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || "transcription failed");
  return j?.text || "";
}

async function refineToPrompt(raw: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return raw; // graceful: return the raw text if the gateway isn't set
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "אתה מומחה לכתיבת הנחיות (prompts) לבוטי שירות בוואטסאפ. קח את התיאור הגולמי של בעל העסק והפוך אותו להנחיה מקצועית, ברורה וקצרה בעברית, בגוף שני, שמגדירה: טון הדיבור, מידע עובדתי (שעות/משלוחים/מחירים אם צוינו), ומה לעשות כשאין תשובה (להפנות לבעל העסק). החזר רק את ההנחיה עצמה, בלי הקדמות." },
        { role: "user", content: raw },
      ],
      max_tokens: 500,
    }),
  });
  const j = await res.json().catch(() => ({}));
  return j?.choices?.[0]?.message?.content?.trim() || raw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ ok: false, error: "Invalid session" }, 401);

  let body: { text?: string; audio?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  try {
    const raw = body.audio ? await transcribe(body.audio) : (body.text || "");
    if (!raw.trim()) return json({ ok: false, error: "no input" }, 400);
    const prompt = await refineToPrompt(raw);
    return json({ ok: true, prompt, transcript: body.audio ? raw : undefined });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "error" }, 500);
  }
});
