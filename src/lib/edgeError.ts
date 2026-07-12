// supabase-js sets `error` (a FunctionsHttpError) on ANY non-2xx response, with
// the useless message "Edge Function returned a non-2xx status code". The real
// reason lives in the JSON body (our functions return { error } / { message }).
// This surfaces it so users - and we - see what actually went wrong.
export async function edgeErrorMessage(error: unknown, fallback = "משהו השתבש. נסו שוב עוד רגע."): Promise<string> {
  try {
    const ctx = (error as { context?: { json?: () => Promise<unknown> } })?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = (await ctx.json()) as { message?: string; error?: string } | null;
      const msg = body?.message || body?.error;
      if (msg && typeof msg === "string") return msg;
    }
  } catch {
    /* body already consumed / not JSON */
  }
  return fallback;
}
