---
name: no-em-dashes
description: "Never use em/en dashes anywhere - always a regular hyphen \"-\""
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e5a7400b-1a5c-4f07-afb9-125d736d1967
---

Never use the long dash "—" (em dash) or "–" (en dash) anywhere - not in UI copy, emails, commit messages, or any user-facing text for the Siango project. Always use a regular hyphen "-".

**Why:** The user (Hebrew, non-technical business owner) finds the long dash looks off / "AI-generated" and explicitly asked for a blanket rule: only "-".

**How to apply:** When writing or editing any text, use "-". A repo-wide replace was run on 2026-06-24 (src + functions); keep new content dash-free too.
