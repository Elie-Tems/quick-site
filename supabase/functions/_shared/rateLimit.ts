import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LIMITS: Record<string, { max: number; windowSecs: number }> = {
  "orders-create":    { max: 10, windowSecs: 60 },
  "generate-content": { max: 5,  windowSecs: 60 },
};

const DEFAULT_LIMIT = { max: 20, windowSecs: 60 };

export async function checkRateLimit(
  req: Request,
  endpoint: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown";

  if (ip === "unknown" || ip === "127.0.0.1" || ip === "::1") {
    return { allowed: true };
  }

  const { max, windowSecs } = LIMITS[endpoint] ?? DEFAULT_LIMIT;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const windowStart = new Date(Date.now() - windowSecs * 1000).toISOString();

  const { count, error } = await admin
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("endpoint", endpoint)
    .gte("created_at", windowStart);

  if (error) {
    console.error("[rate-limit] check error:", error.message);
    return { allowed: true };
  }

  if ((count ?? 0) >= max) {
    return { allowed: false, retryAfter: windowSecs };
  }

  // Fire-and-forget insert to keep latency low
  admin
    .from("rate_limit_log")
    .insert({ ip, endpoint })
    .then(({ error: e }) => { if (e) console.error("[rate-limit] insert:", e.message); });

  // Prune old rows ~1% of the time
  if (Math.random() < 0.01) {
    admin.rpc("prune_rate_limit_log").then(() => {});
  }

  return { allowed: true };
}

export function rateLimitedResponse(retryAfter = 60): Response {
  return new Response(
    JSON.stringify({ error: "יותר מדי בקשות. נסה שוב בעוד דקה." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}

// Legacy helper used by generate-content: key-based rate limiting via a
// separate rate_limit_tokens table (older approach, kept for compatibility).
export async function consumeRateLimit(
  // deno-lint-ignore no-explicit-any
  client: any,
  key: string,
  maxCalls: number,
  windowSecs: number,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowSecs * 1000).toISOString();
  const { count, error } = await client
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("ip", key)
    .eq("endpoint", "generate-content")
    .gte("created_at", windowStart);

  if (error) return true; // fail open

  if ((count ?? 0) >= maxCalls) return false;

  await client.from("rate_limit_log").insert({ ip: key, endpoint: "generate-content" });
  return true;
}
