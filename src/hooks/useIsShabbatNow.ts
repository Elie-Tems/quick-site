import { useQuery } from "@tanstack/react-query";

/**
 * Is it currently Shabbat or Yom Tov in Israel (Jerusalem times)?
 *
 * Used by storefronts with "Shabbat mode" on to show a closed state. Queries the
 * free Hebcal API for candle-lighting/havdalah events around now and checks
 * whether the current moment falls inside a closed window. Fails OPEN (returns
 * false) on any error so a store is never wrongly closed.
 */
export function useIsShabbatNow(enabled: boolean) {
  return useQuery<boolean>({
    queryKey: ["is-shabbat-now"],
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
    queryFn: async () => {
      try {
        const now = Date.now();
        const ymd = (d: number) => new Date(d).toISOString().slice(0, 10);
        // Jerusalem geonameid = 281184; b=18 candle-lighting, M=on havdalah at
        // nightfall, maj=on so Yom Tov is covered too.
        const url =
          `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&c=on&M=on&s=off&geo=geoname&geonameid=281184` +
          `&b=18&start=${ymd(now - 3 * 86400000)}&end=${ymd(now + 3 * 86400000)}`;
        const res = await fetch(url);
        if (!res.ok) return false;
        const data = (await res.json()) as { items?: { date: string; category?: string }[] };
        const events = (data.items || [])
          .filter((i) => i.category === "candles" || i.category === "havdalah")
          .map((i) => ({ t: Date.parse(i.date), cat: i.category as "candles" | "havdalah" }))
          .filter((e) => !Number.isNaN(e.t))
          .sort((a, b) => a.t - b.t);
        for (let i = 0; i < events.length; i++) {
          if (events[i].cat !== "candles") continue;
          const end = events.slice(i + 1).find((e) => e.cat === "havdalah");
          if (end && now >= events[i].t && now < end.t) return true;
        }
        return false;
      } catch {
        return false;
      }
    },
  });
}
