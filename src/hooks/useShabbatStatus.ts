import { useQuery } from "@tanstack/react-query";

export interface ShabbatStatus {
  closed: boolean;
  /** ISO time the platform reopens (havdalah / end of Yom Tov), when closed. */
  until: string | null;
  /** Hebrew label of the current closure ("שבת" or a Yom Tov name). */
  label: string | null;
}

const OPEN: ShabbatStatus = { closed: false, until: null, label: null };

/**
 * Whether NEW-SITE creation (registration + onboarding) is currently closed for
 * Shabbat / Yom Tov, judged by the visitor's own location (via the edge
 * function). Fails open: any error or unreachable endpoint → not closed, so we
 * never wrongly block a user. Supports a `?preview_shabbat=1|0` query override
 * for previewing the closed screen locally.
 */
export function useShabbatStatus() {
  const preview =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("preview_shabbat")
      : null;

  return useQuery<ShabbatStatus>({
    queryKey: ["shabbat-status", preview],
    queryFn: async () => {
      // Local preview overrides — let us see the closed screen without waiting.
      if (preview === "1") {
        return { closed: true, until: null, label: "שבת" };
      }
      if (preview === "0") return OPEN;

      try {
        const res = await fetch("/api/shabbat-status", { headers: { Accept: "application/json" } });
        if (!res.ok) return OPEN; // e.g. local vite dev (no Pages Functions) → open
        const data = (await res.json()) as Partial<ShabbatStatus>;
        return {
          closed: !!data.closed,
          until: data.until ?? null,
          label: data.label ?? null,
        };
      } catch {
        return OPEN;
      }
    },
    staleTime: 5 * 60 * 1000, // re-check at most every 5 minutes
    refetchOnWindowFocus: true,
    retry: false,
  });
}
