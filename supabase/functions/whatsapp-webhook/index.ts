// Twilio inbound webhook. Handles three things:
//   1. STATUS CALLBACKS (MessageStatus) -> update whatsapp_messages delivered/read/failed.
//   2. INBOUND customer messages to a MERCHANT's number -> upsert contact + log
//      (opens the 24h service window).
//   3. The SIANGO COMPANY BOT: a merchant texts our bot a product PHOTO + CAPTION
//      -> we map the sender to their business, parse the caption, upload the image,
//      create the product, and reply "added".
// BUILD-ONLY: ready to deploy but not activated until Moti approves.
import { createClient } from "npm:@supabase/supabase-js@2";
import { twilioCreds, sendWhatsAppText, toE164 } from "../_shared/whatsapp/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};
// Twilio expects TwiML or an empty 200; we just ack.
const ack = () => new Response("<Response></Response>", { status: 200, headers: { ...corsHeaders, "Content-Type": "text/xml" } });

async function parseForm(req: Request): Promise<Record<string, string>> {
  const text = await req.text();
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(text).entries()) out[k] = v;
  return out;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Verify the request actually came from Twilio (per their X-Twilio-Signature
// spec: base64(HMAC-SHA1(authToken, fullUrl + each sorted POST key+value))).
// Without this, anyone could forge inbound messages, create products, or burn
// AI-reply credits. Enforced only when TWILIO_AUTH_TOKEN is configured.
async function validTwilioSignature(req: Request, params: Record<string, string>, authToken: string): Promise<boolean> {
  const sig = req.headers.get("x-twilio-signature");
  if (!sig) return false;
  // Twilio signs over the EXACT public webhook URL it was configured with. Inside a
  // Supabase edge function req.url is an internal URL that differs, so try several
  // URL candidates (the configured public URL + req.url variants) and accept if the
  // signature matches any of them. Still requires a valid Twilio signature.
  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const reqUrl = req.url;
  const candidates = [
    `${base}/functions/v1/whatsapp-webhook`,
    reqUrl,
    reqUrl.replace(/\?.*$/, ""),
    reqUrl.replace(/^http:/, "https:"),
  ];
  const suffix = Object.keys(params).sort().map((k) => k + params[k]).join("");
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  for (const u of [...new Set(candidates)]) {
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(u + suffix));
    const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
    if (safeEqual(sig, expected)) return true;
  }
  return false;
}

/** Best-effort caption parse: "<name> | <price> | <description>" OR detect a price
 *  number and treat the rest as the name. Returns name/price/description. */
function parseCaption(caption: string): { name: string; price: number | null; description: string | null } {
  const raw = (caption || "").trim();
  if (!raw) return { name: "מוצר חדש", price: null, description: null };
  const parts = raw.split(/\s*[|\n]\s*/).filter(Boolean);
  if (parts.length >= 2) {
    const price = Number((parts[1].match(/[\d.]+/) || [])[0]);
    return { name: parts[0].slice(0, 120), price: Number.isFinite(price) ? price : null, description: parts[2] || null };
  }
  // Single blob: pull a price like "₪89" / "89 שח" / "89", name = text without it.
  const priceMatch = raw.match(/(?:₪\s*)?(\d+(?:\.\d+)?)(?:\s*(?:ש"?ח|שקל|nis|ils))?/i);
  const price = priceMatch ? Number(priceMatch[1]) : null;
  const name = raw.replace(priceMatch?.[0] || "", "").trim().slice(0, 120) || "מוצר חדש";
  return { name, price, description: null };
}

/** Gabbai WhatsApp commands (synagogue vertical): update a prayer time, log an
 *  aliyah/neder pledge, or set the display-screen announcement. Returns null if the
 *  message isn't a recognized command. */
function parseGabbaiCommand(text: string):
  | { kind: "prayer"; key: string; label: string; time: string }
  | { kind: "pledge"; pledgeType: "aliyah" | "neder"; name: string; amount: number }
  | { kind: "announce"; text: string }
  | null {
  const t = (text || "").trim();
  const timeM = t.match(/([0-2]?\d:[0-5]\d)/);
  const PRAYERS: [RegExp, string, string][] = [
    [/שחרית/, "shacharit", "שחרית"],
    [/מנחה/, "mincha", "מנחה"],
    [/ער(ב|ו)ית|מעריב/, "maariv", "ערבית"],
    [/כניסת שבת|הדלקת נרות/, "shabbat_in", "כניסת שבת"],
    [/דף יומי/, "daf_yomi", "דף יומי"],
  ];
  if (timeM) for (const [re, key, label] of PRAYERS) if (re.test(t)) return { kind: "prayer", key, label, time: timeM[1] };
  const pledgeM = t.match(/^(עלייה|עליה|נדר)\s+(.+?)\s+(\d+)\s*(?:ש"?ח|₪)?$/);
  if (pledgeM) return { kind: "pledge", pledgeType: pledgeM[1].startsWith("נדר") ? "neder" : "aliyah", name: pledgeM[2].trim(), amount: Number(pledgeM[3]) };
  const annM = t.match(/^הודעה[:\s]+(.+)$/);
  if (annM) return { kind: "announce", text: annM[1].trim() };
  return null;
}

/** AI service-bot reply: generate a response to a customer using the merchant's
 *  prompt, via the Lovable AI gateway (same as the rest of the app). Best-effort. */
async function generateBotReply(botPrompt: string, customerMsg: string): Promise<string | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `אתה נציג שירות בוואטסאפ של עסק. ענה קצר, אדיב ובעברית. הנחיות העסק:\n${botPrompt}\nאם אינך יודע - אמור שתעביר לבעל העסק.` },
          { role: "user", content: customerMsg },
        ],
        max_tokens: 300,
      }),
    });
    const j = await res.json().catch(() => ({}));
    return j?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return ack();

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  const form = await parseForm(req);

  // Reject forged requests. Fail CLOSED: if the Twilio auth token is not set we
  // reject rather than trust an unauthenticated inbound payload - this endpoint
  // creates products, sends WhatsApp messages, and spends AI credits, so it must
  // never process a request it cannot verify. (WhatsApp is build-only today;
  // going live requires setting TWILIO_AUTH_TOKEN, which this now enforces.)
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!twilioAuthToken || !(await validTwilioSignature(req, form, twilioAuthToken))) {
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  const siangoBot = Deno.env.get("TWILIO_WHATSAPP_FROM"); // the Siango company-bot number

  try {
    // --- 1. Delivery/read status callback ---
    if (form.MessageStatus && form.MessageSid) {
      await admin.from("whatsapp_messages")
        .update({ status: form.MessageStatus, updated_at: new Date().toISOString() })
        .eq("provider_sid", form.MessageSid);
      // Roll the delivered/read counts up to the campaign so its analytics
      // (whatsapp_campaigns.delivered_count/read_count) actually populate.
      // A message only carries a campaign_id when it was part of a broadcast;
      // read implies delivered, so delivered_count counts delivered + read.
      const { data: msg } = await admin.from("whatsapp_messages")
        .select("campaign_id").eq("provider_sid", form.MessageSid).maybeSingle();
      if (msg?.campaign_id) {
        const { count: deliveredCount } = await admin.from("whatsapp_messages")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", msg.campaign_id).in("status", ["delivered", "read"]);
        const { count: readCount } = await admin.from("whatsapp_messages")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", msg.campaign_id).eq("status", "read");
        await admin.from("whatsapp_campaigns")
          .update({ delivered_count: deliveredCount ?? 0, read_count: readCount ?? 0, updated_at: new Date().toISOString() })
          .eq("id", msg.campaign_id);
      }
      return ack();
    }

    const from = toE164(form.From || "");
    const to = toE164(form.To || "");
    const bodyText = form.Body || "";
    const numMedia = Number(form.NumMedia || "0");

    // --- 3. Siango company bot: a merchant managing their store via WhatsApp ---
    if (siangoBot && toE164(siangoBot) === to) {
      // Map the sender phone -> a business (via the owner profile's phone).
      const { data: prof } = await admin.from("profiles").select("id, phone").eq("phone", from).maybeSingle();
      let businessId: string | null = null;
      let businessType: string | null = null;
      if (prof) {
        const { data: b } = await admin.from("businesses").select("id, business_type").eq("owner_id", prof.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
        businessId = b?.id || null;
        businessType = (b as any)?.business_type || null;
      }
      const creds = twilioCreds();
      const reply = async (msg: string) => { if (creds && siangoBot) await sendWhatsAppText(creds, siangoBot, from, msg); };

      if (!businessId) {
        await reply("היי! לא הצלחנו לזהות את החנות שלך לפי המספר הזה. ודא/י שזה המספר הרשום ב-Siango. 🙏");
        return ack();
      }
      if (numMedia > 0 && form.MediaUrl0) {
        // Product-upload bot: download the image, parse the caption, create the product.
        const parsed = parseCaption(bodyText);
        try {
          const mediaRes = await fetch(form.MediaUrl0, {
            headers: creds ? { Authorization: "Basic " + btoa(`${creds.accountSid}:${creds.authToken}`) } : undefined,
          });
          const ct = form.MediaContentType0 || mediaRes.headers.get("content-type") || "image/jpeg";
          const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
          const bytes = new Uint8Array(await mediaRes.arrayBuffer());
          const path = `${businessId}/products/wa-${Date.now()}.${ext}`;
          await admin.storage.from("business-assets").upload(path, bytes, { contentType: ct, upsert: false });
          const { data: pub } = admin.storage.from("business-assets").getPublicUrl(path);
          const imageUrl = pub?.publicUrl ? `${pub.publicUrl}?t=${Date.now()}` : null;

          const { error: insErr } = await admin.from("products").insert({
            business_id: businessId,
            name: parsed.name,
            price: parsed.price ?? 0,
            description: parsed.description,
            image_url: imageUrl,
            active: true,
          });
          if (insErr) throw insErr;
          await reply(`נוסף ✅\nמוצר: ${parsed.name}${parsed.price ? `\nמחיר: ₪${parsed.price}` : "\n(לא זוהה מחיר - אפשר לעדכן בדשבורד)"}\nתוכל/י לערוך בדשבורד.`);
        } catch (e) {
          console.error("product-upload bot failed:", e);
          await reply("אופס, משהו השתבש בהוספת המוצר. נסה/י שוב או הוסף/י מהדשבורד. 🙏");
        }
        return ack();
      }
      // Synagogue gabbai commands (update times / log a pledge / set an announcement).
      // Updates the site + display screen instantly. Gated on a synagogue business.
      if (businessType === "synagogue" && numMedia === 0 && bodyText.trim()) {
        const cmd = parseGabbaiCommand(bodyText);
        if (cmd?.kind === "prayer") {
          const { data: s } = await admin.from("synagogue_settings").select("prayer_times").eq("business_id", businessId).maybeSingle();
          const pt = { ...((s?.prayer_times as Record<string, string>) ?? {}), [cmd.key]: cmd.time };
          await admin.from("synagogue_settings").upsert({ business_id: businessId, prayer_times: pt, updated_at: new Date().toISOString() }, { onConflict: "business_id" });
          await reply(`✅ ${cmd.label} עודכן ל-${cmd.time}. האתר והמסך בבית הכנסת מתעדכנים.`);
          return ack();
        }
        if (cmd?.kind === "pledge") {
          await admin.from("synagogue_pledges").insert({ business_id: businessId, member_name: cmd.name, pledge_type: cmd.pledgeType, amount: cmd.amount, status: "open" });
          await reply(`✅ נרשם חוב ₪${cmd.amount} ל${cmd.name} (${cmd.pledgeType === "neder" ? "נדר" : "עלייה"}).`);
          return ack();
        }
        if (cmd?.kind === "announce") {
          await admin.from("synagogue_settings").upsert({ business_id: businessId, announcements: cmd.text, updated_at: new Date().toISOString() }, { onConflict: "business_id" });
          await reply("✅ ההודעה עודכנה על המסך בבית הכנסת.");
          return ack();
        }
        await reply("היי גבאי! 🕍 אפשר לעדכן מכאן:\n· \"מנחה 17:15\" - זמן תפילה\n· \"עלייה דוד 250\" - רישום עלייה/נדר\n· \"הודעה שיעור הערב 20:15\" - הודעה למסך");
        return ack();
      }

      // Text-only to the bot: a friendly help reply.
      await reply("היי! 👋 כדי להוסיף מוצר - שלח/י לי תמונה של המוצר עם כיתוב: שם | מחיר | תיאור. לדוגמה: \"חולצה כחולה | 89 | כותנה 100%\".");
      return ack();
    }

    // --- 2. Inbound customer message to a merchant's number ---
    const { data: acct } = await admin.from("whatsapp_accounts")
      .select("business_id, phone_number, bot_enabled, bot_prompt")
      .eq("phone_number", `+${to.replace(/^\+/, "")}`).maybeSingle();
    const businessId = acct?.business_id;
    if (businessId && from) {
      const now = new Date().toISOString();
      await admin.from("whatsapp_contacts").upsert(
        { business_id: businessId, phone: from, last_message_at: now, source: "inbound" },
        { onConflict: "business_id,phone", ignoreDuplicates: false },
      );
      await admin.from("whatsapp_messages").insert({
        business_id: businessId, contact_phone: from, direction: "in", body: bodyText, status: "delivered", category: "service",
      });

      // Opt-out handling (Chok HaSpam + Meta): a STOP/הסר message unsubscribes
      // the contact from marketing and we confirm. No bot reply after that.
      const optOut = /^\s*(הסר|הסרה|הסירו|stop|unsubscribe|ביטול|בטל)\s*$/i.test(bodyText);
      if (optOut) {
        await admin.from("whatsapp_contacts").update({ opted_in: false, opt_in_source: "unsubscribe" }).eq("business_id", businessId).eq("phone", from);
        const creds = twilioCreds();
        const acctNum = (acct as any)?.phone_number;
        if (creds && acctNum) await sendWhatsAppText(creds, acctNum, from, "הוסרת מרשימת התפוצה ולא תקבל/י עוד הודעות שיווק. תודה 🙏");
        return ack();
      }

      // AI service bot: if the merchant enabled it, auto-reply (within the 24h window).
      const creds = twilioCreds();
      if (acct?.bot_enabled && acct.bot_prompt && bodyText && creds && acct.phone_number) {
        const reply = await generateBotReply(acct.bot_prompt, bodyText);
        if (reply) {
          const r = await sendWhatsAppText(creds, acct.phone_number, from, reply);
          await admin.from("whatsapp_messages").insert({
            business_id: businessId, contact_phone: from, direction: "out", body: reply,
            status: r.ok ? (r.status || "sent") : "failed", category: "service",
            provider_sid: r.sid || null, error: r.ok ? null : r.error || null,
          });
        }
      }
    }
    return ack();
  } catch (e) {
    console.error("whatsapp-webhook error:", e);
    return ack();
  }
});


