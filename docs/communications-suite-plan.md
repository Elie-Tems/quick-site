# Communications & marketing suite - plan (#7 internal ESP)

A bulk email-marketing product (Rav-Masser-style) that is also sellable
standalone. Built as ONE suite with WhatsApp + business-email, sharing a common
spine, so we don't build 3 overlapping silos.

## Provider decision (deliverability vs cost)
| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Resend** (current) | already integrated; good deliverability; Broadcasts + Audiences API; dedicated-IP option; we own `send.siango.app` (DKIM/SPF done) | per-email cost higher than SES at huge scale | **Start here** - least friction, strong deliverability |
| Amazon SES | cheapest at scale (~$0.10/1k) | we manage reputation/warmup/bounce+complaint loops ourselves; more ops | move here for cost at scale (abstract the provider) |
| Brevo / MailerSend | built-in marketing UI | we're building our own UI; less control | no |

**Recommendation:** build on **Resend** now behind a thin `EmailProvider`
interface so we can swap to SES at scale without touching product code.
Deliverability musts (most already in place): dedicated sending domain, DKIM/
SPF/DMARC, **one-click unsubscribe (done)**, warmup for new IPs, bounce +
complaint suppression, list hygiene.

## Shared spine (build once, used by Email + WhatsApp)
- **Contacts / audiences** - per merchant; consent + source recorded; reuse the
  `email_unsubscribes` suppression list (Chok HaSpam) already built.
- **Segmentation** - by purchase history, tags, activity ("didn't buy in 30d").
- **Templates** - RTL email templates (reuse `_shared/email/rtlEmail.ts`) + WA
  templates (already built).
- **Campaigns** - one-off + scheduled + drip sequences; per-channel send.
- **Analytics** - sent/delivered/open/click/reply + revenue attributed to real
  orders (our edge over standalone tools - we own the store data).

## Data model (new tables)
`audiences`, `contacts` (audience_id, email/phone, consent, tags),
`segments` (rule json), `campaigns` (channel, template, segment, schedule,
status), `campaign_sends` (campaign_id, contact_id, status, opened_at, clicked_at),
`email_templates`. RLS: owner-scoped per merchant.

## AI layer (Moti wants "very advanced")
- Subject-line + body generation from a product/offer (LLM gateway + the
  `israeli-email-sequences` skill for IL-tuned copy + Chok HaSpam compliance).
- Send-time optimization (per-contact best hour from open history).
- Auto-segmentation suggestions ("re-engage 142 lapsed buyers").
- Voice-prompt -> campaign (reuse the WhatsApp bot voice->prompt pattern).

## Phasing
1. **Spine + Email MVP:** audiences/contacts import (with consent checkbox - done
   pattern), a simple campaign composer (RTL template), send via Resend, basic
   analytics. Unsubscribe already compliant.
2. **AI compose** (subject/body) + segmentation.
3. **Drip sequences** + send-time optimization.
4. **Unify WhatsApp** onto the same spine (campaigns choose channel).
5. **Sell standalone** (pricing tier) + deliverability hardening (SES option,
   dedicated IP, warmup).

## Compliance (Israel)
Opt-in only, provable consent (have it), one-click unsubscribe (done), sender
identity + physical address in footer (done in rtlEmail), honor unsubscribe
across ALL channels via the shared suppression list. Use the
`israeli-email-sequences` skill for Amendment 40 specifics.
