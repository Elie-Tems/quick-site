# Shipping/delivery API research (2026-06-28)

Goal: let Siango stores offer real shipping with an easy, documented API -
Israeli carriers preferred, ideally so the MERCHANT doesn't need to open an
account with each carrier (Siango integrates once).

## Two integration models
- **A. Siango-master (recommended):** Siango integrates ONE aggregator/carrier
  via API and holds the master account; merchants ship through Siango (we bill
  them, add a markup -> recurring revenue, like domains/email). Merchant needs no
  carrier account. Matches "without them needing [a carrier account]".
- **B. Merchant-connect:** each merchant plugs in their own carrier API keys.
  More work for the merchant; no markup for us.

## Israeli options (preferred)
| Provider | What it is | API | Fit |
|---|---|---|---|
| **LionWheel** (לайונוויל) | Israeli delivery-management platform that connects stores <-> many carriers (eCommerce/ERP/POS integrations, auto order sync) | Yes - documented integrations + API | **Top pick** - purpose-built for IL e-commerce delivery, aggregates carriers |
| **HFD** | Largest B2C e-commerce delivery in Israel, "one-stop shop" incl. pickup lockers | Yes - integration/API for stores | Strong direct-carrier option (dominant in IL) |
| **Cheetah (צ'יטה)** | Courier + pickup-point network, tracking | Has integrations | Good for pickup points |
| **Israel Post (דואר ישראל)** | National postal | API (also exposed via AfterShip) | Cheapest baseline / small parcels |

## Global aggregators that COVER Israel (one API, many carriers)
| Provider | Strength | Notes |
|---|---|---|
| **AfterShip** | One REST API, **Israel Post + 1,200 carriers** tracking (125 for labels), great docs | Best for unified TRACKING widget |
| **Easyship** | One REST API, 550+ carrier services, cross-border, SDKs + sandbox, fast | Best for multi-carrier rates+labels / international |
| **EasyPost / Shippo** | Global label/rate APIs | US-centric, weaker IL |
| **Onfleet** | Last-mile dispatch REST API (drivers/tasks/notifications) | If we do our own couriers |

## Recommendation
1. **Primary: LionWheel** (Israeli, aggregates carriers, built for store integration) under **Model A** - one integration, merchants get shipping with no carrier account, we add a markup (recurring revenue, fits the product suite).
2. **Tracking layer: AfterShip** - clean unified tracking (Israel Post + everyone) for the customer "where's my order" page.
3. HFD as a strong direct alternative/addition (dominant B2C carrier).

## Open items to verify (quick email/call with each)
- Exact API access terms: cost, sandbox, whether a reseller/master account is
  available (Model A), label + pickup-point + tracking endpoints, rate quoting.
- Whether LionWheel/HFD allow a partner/reseller model so merchants ship under
  Siango without their own contract.

## Contacts (verified online)
- **LionWheel** - API/dev: **support@lionwheel.com** (also gives sandbox/testing env) · general: **info@lionwheel.com** · public API docs: support.lionwheel.com/en/article/api + github.com/lionwheel/api . (No public WhatsApp found - use email.)
- **HFD** - **dev/API: hfd-dev@hfd.co.il** · general: support@hfd.co.il · phone 1-700-704-645 · partnerships: shirazi@hfd.co.il (+972-54-688-2297). WhatsApp customer line exists (via hfd.co.il contact page).

## Draft outreach email (Hebrew) - send to both
**Subject:** שיתוף פעולה / חיבור API - פלטפורמת Siango (בניית חנויות אונליין)

> שלום,
> אנחנו Siango (siango.app) - פלטפורמה ישראלית שבונה לעסקים קטנים חנויות אונליין תוך דקות. יש לנו קהל גדל של בעלי חנויות שצריכים פתרון משלוחים מובנה.
>
> אנחנו מעוניינים **לחבר את שירות המשלוחים שלכם ל-API שלנו**, כך שהסוחרים שלנו יוכלו לשלוח חבילות ישירות מהדשבורד. נשמח לדעת:
> 1. האם יש מודל **שותף/ריסלר** שבו אנחנו מתממשקים פעם אחת והסוחרים שולחים תחת ההתקשרות שלנו - בלי שכל סוחר יצטרך לפתוח חשבון נפרד אצלכם? (אם לא - מה התהליך לחיבור סוחר?)
> 2. גישה ל-API + סביבת בדיקות (sandbox): תיעוד, אימות, ואילו פעולות נתמכות - **תמחור/הצעת מחיר, יצירת תווית משלוח, נקודות איסוף, ומעקב (tracking)**.
> 3. התנאים המסחריים (מחירים/עמלות) לנפח גדל.
>
> נשמח לשיחה קצרה או לקבל את החומר הטכני. תודה!
> [שם] · Siango · siango.app

*(שלח ל-support@lionwheel.com וגם ל-hfd-dev@hfd.co.il. ל-HFD אפשר גם בוואטסאפ דרך דף צור-קשר שלהם.)*

## Sources
- LionWheel integrations: https://www.lionwheel.com/en/features-en/integrations
- HFD: https://www.hfd.co.il/en/
- Cheetah: https://chitadelivery.co.il/en/
- AfterShip Israel Post API: https://www.aftership.com/carriers/israel-post-domestic/api
- Easyship API: https://www.easyship.com/developers
