/**
 * Cloudflare Pages Function — /api/shabbat-status
 *
 * Decides whether NEW-SITE creation (registration + onboarding) should be
 * closed right now because it is Shabbat or a Yom Tov **at the visitor's own
 * location**. Published customer stores are never affected — this only gates
 * the platform's signup flow.
 *
 * Location: taken from Cloudflare's edge geo (`request.cf`), so every visitor is
 * judged by their own country's candle-lighting / havdalah times. Falls back to
 * explicit ?lat&lon&tz query params (for testing) and otherwise FAILS OPEN
 * (returns not-closed) so we never wrongly block a paying user.
 *
 * Times: pulled from the free Hebcal API (halachic candle-lighting at the local
 * sunset offset, havdalah at nightfall) including major holidays, so Yom Tov is
 * covered too.
 */

interface CfGeo {
  latitude?: string;
  longitude?: string;
  timezone?: string;
  country?: string;
}

interface HebcalItem {
  title?: string;
  hebrew?: string;
  date: string; // ISO (candles/havdalah include tz offset; holidays are date-only)
  category?: string; // 'candles' | 'havdalah' | 'holiday' | ...
  yomtov?: boolean;
}

const json = (body: unknown, cacheSeconds = 0): Response =>
  new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Per-visitor (geo-specific) → don't share across users at the edge.
      "Cache-Control": cacheSeconds > 0 ? `private, max-age=${cacheSeconds}` : "no-store",
    },
  });

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const onRequest = async (context: {
  request: Request;
}): Promise<Response> => {
  const { request } = context;
  const open = { closed: false as const };

  try {
    const url = new URL(request.url);
    const cf = ((request as unknown as { cf?: CfGeo }).cf) || {};

    const lat = url.searchParams.get("lat") || cf.latitude;
    const lon = url.searchParams.get("lon") || cf.longitude;
    const tz = url.searchParams.get("tz") || cf.timezone;

    // No location → fail open (don't block).
    if (!lat || !lon || !tz) return json(open);

    const now = Date.now();
    const start = ymd(new Date(now - 3 * 86400000)); // a few days back…
    const end = ymd(new Date(now + 9 * 86400000)); // …through next week

    const hebcalUrl =
      `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=off&mod=off&nx=off` +
      `&mf=off&ss=off&c=on&M=on&s=off&lg=he` +
      `&geo=pos&latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}` +
      `&tzid=${encodeURIComponent(tz)}&b=18&start=${start}&end=${end}`;

    const res = await fetch(hebcalUrl, { headers: { Accept: "application/json" } });
    if (!res.ok) return json(open);
    const data = (await res.json()) as { items?: HebcalItem[] };
    const items = Array.isArray(data.items) ? data.items : [];

    // Time-ordered candle-lighting / havdalah boundary events.
    const events = items
      .filter((i) => i.category === "candles" || i.category === "havdalah")
      .map((i) => ({ t: Date.parse(i.date), cat: i.category as "candles" | "havdalah" }))
      .filter((e) => !Number.isNaN(e.t))
      .sort((a, b) => a.t - b.t);

    // A closed block runs from a candle-lighting to the next havdalah.
    let until: number | null = null;
    for (let i = 0; i < events.length; i++) {
      if (events[i].cat !== "candles") continue;
      const end = events.slice(i + 1).find((e) => e.cat === "havdalah");
      if (end && now >= events[i].t && now < end.t) {
        until = end.t;
        break;
      }
    }

    if (until == null) return json(open, 300);

    // Label: Yom Tov name if this block is a holiday, otherwise "שבת".
    const holiday = items.find(
      (i) => i.category === "holiday" && i.yomtov && Math.abs(Date.parse(i.date) - until!) < 2 * 86400000,
    );
    const label = holiday?.hebrew || holiday?.title || "שבת";

    return json({ closed: true, until: new Date(until).toISOString(), label });
  } catch {
    // Any failure → fail open so signup is never wrongly blocked.
    return json(open);
  }
};
