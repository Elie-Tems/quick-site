// Returns the authenticated merchant's invoices from iCount.
// verify_jwt = true: only the logged-in merchant, and only their OWN documents
// (looked up by their business / account email). Server-side only - the iCount
// API token lives in the ICOUNT_API_TOKEN secret and is never exposed to the client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ICOUNT_BASE = "https://api.icount.co.il/api/v3.php";

async function icount(endpoint: string, payload: Record<string, unknown>) {
  const token = Deno.env.get("ICOUNT_API_TOKEN");
  if (!token) return { status: false, reason: "not_configured" } as any;
  const r = await fetch(`${ICOUNT_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return await r.json();
}

// iCount's success shape varies; find the array of documents defensively.
function extractDocs(res: any): any[] {
  if (!res || typeof res !== "object") return [];
  for (const key of ["docs", "doclist", "documents", "results", "list", "data"]) {
    const v = res[key];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      const arr = Object.values(v);
      if (arr.length && typeof arr[0] === "object") return arr as any[];
    }
  }
  return [];
}

const num = (...vals: any[]) => {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n) && n !== 0) return n;
  }
  return 0;
};
const str = (...vals: any[]) => {
  for (const v of vals) if (v != null && String(v).trim() !== "") return String(v);
  return "";
};

// Normalize one iCount doc to the shape the dashboard renders.
function normalize(d: any) {
  return {
    doctype: str(d.doctype, d.doc_type, d.type),
    doctype_name: str(d.doctype_name, d.doc_type_name, d.type_name),
    docnum: str(d.docnum, d.doc_number, d.number, d.id),
    date: str(d.doc_date, d.date, d.dateissued, d.created),
    total: num(d.totalwithvat, d.total_with_vat, d.totalpaid, d.totalsum, d.total, d.sum),
    url: str(d.doc_url, d.url, d.pdf_url, d.doc_copy_url),
    raw: d,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ ok: false, error: "Invalid session" }, 401);

  if (!Deno.env.get("ICOUNT_API_TOKEN")) {
    return json({ ok: true, configured: false, clientFound: false, docs: [] });
  }

  // Look up the merchant's invoices by their VERIFIED login email only. We must
  // NOT use businesses.email here: it's a merchant-editable field, so a merchant
  // could set it to a victim's address and read that victim's iCount documents
  // (IDOR). The verified auth email is the one tied to their real identity.
  const admin = createClient(supabaseUrl, serviceKey);
  const emails = user.email ? [String(user.email).trim().toLowerCase()] : [];
  if (!emails.length) return json({ ok: true, configured: true, clientFound: false, docs: [] });

  // Look up the client's documents by email (iCount resolves email -> client).
  let docs: any[] = [];
  let clientFound = false;
  for (const email of emails) {
    const res = await icount("doc/search", { email });
    if (res?.status) {
      clientFound = true;
      docs = extractDocs(res).map(normalize);
      break;
    }
    // client_not_found / no_results_found -> try the next candidate email
    if (res?.reason && res.reason !== "client_not_found" && res.reason !== "no_results_found") {
      // a real error (auth/config) - surface it
      return json({ ok: false, error: res.reason, configured: true }, 502);
    }
    if (res?.reason === "no_results_found") {
      clientFound = true; // the client exists, just has no docs
    }
  }

  // newest first
  docs.sort((a, b) => (a.date < b.date ? 1 : -1));
  return json({ ok: true, configured: true, clientFound, docs });
});
