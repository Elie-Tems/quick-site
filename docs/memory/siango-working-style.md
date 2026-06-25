---
name: siango-working-style
description: "How Moti wants Claude to work - proceed autonomously, don't re-ask order/permission, report in chunks"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e5a7400b-1a5c-4f07-afb9-125d736d1967
---

Moti delegated task prioritization to Claude ("אתה מגדיר את סדר המשימות") and was then annoyed at being asked again ("אתה לא צריך לשאול כל פעם מחדש").

**How to work:**
- **Don't ask which task is next or "should I continue" / "should I proceed".** Decide the order yourself, just do it, and report progress.
- Proceed autonomously through an approved list; only stop to ask when there's a genuine *decision that is his to make* (money/payment, irreversible/destructive actions, production-DB changes the classifier blocks) or a real data dependency you cannot resolve yourself.
- Work in chunks: do a coherent unit, deploy, report briefly, continue. Don't dump options or ask for confirmation between steps.
- He is non-technical - explain outcomes simply, not process. He values momentum.

**Why:** repeated confirmation questions frustrate him and slow things down; he trusts Claude to drive.

See [[siango-product-decisions]].
