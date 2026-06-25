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

See [[siango-overview]], [[siango-architecture]].
