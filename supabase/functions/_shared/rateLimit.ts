// Shared server-side rate limiter. Calls the consume_rate_limit() SQL function
// (atomic sliding-window counter) with the service role. Returns true when the
// caller is WITHIN the limit (allow), false when over (caller should 429).
// Fails OPEN on any infra error - the goal is cost/abuse protection, not a hard
// security gate, so a transient DB error must not block legitimate users.
import { createClient } from "npm:@supabase/supabase-js@2";

export async function consumeRateLimit(
  admin: ReturnType<typeof createClient>,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}
