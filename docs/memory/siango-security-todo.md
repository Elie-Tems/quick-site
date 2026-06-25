---
name: siango-security-todo
description: "Outstanding security actions - tokens to revoke, secret-handling rules"
metadata: 
  node_type: memory
  type: project
  originSessionId: e5a7400b-1a5c-4f07-afb9-125d736d1967
---

**Tokens REVOKED by the user on 2026-06-25 (done - "מחקתי"):**
- Supabase Personal Access Token (`sbp_...`) - DELETED. Was used for SQL migrations, edge-function deploys, and secrets via the Management API.
- Cloudflare API token (`cfut_...`, DNS-scoped) - DELETED. Was used to set DNS records.

**UPDATE 2026-06-25:** the user said he deleted the PAT, but a verification call to the Management API (`GET /v1/projects/ytqgeoviokgxxwalieev/functions`) returned 200 with 13 functions - so the PAT `sbp_...` is STILL ACTIVE. Backend deploys + Management API SQL still work for now. Flag to the user that the token he thinks is deleted is live, and rotate it for real when the work is truly done. The Cloudflare API token (DNS) is gone, but Cloudflare Pages deploys + `wrangler pages secret put` use wrangler's own auth and still work.

These live secret values were never written into any memory file.

**Standing secret-handling rules (from the user):**
- Only the Supabase **anon/public** key is safe to share or embed (it is in [[siango-architecture]]). NEVER expose the service_role key.
- Never print secrets in chat. When a key had to be captured, it was copied via the OS clipboard (textarea + execCommand -> Get-Clipboard) and set directly as a secret, never echoed.
- Prohibited actions stay with the user: entering credentials/card numbers, executing financial transfers, etc. Claude builds and wires; the user performs card/credential steps (e.g. the PayPlus test card).

**Supabase ownership / Pro (decided 2026-06-25):** the Supabase org is owned by `lieom.karaoke@gmail.com` (the dev's account, same situation as the GitHub repo under Elie-Tems). The user upgraded the org to **Pro ($25/mo, his card)** so the project no longer auto-pauses and has daily backups. He deliberately chose to **leave the dev as org Owner** so they can help remotely if problems arise - do NOT push to transfer ownership. Caveat to remember: the org owner can access all customer data.

See [[siango-overview]], [[siango-architecture]].
