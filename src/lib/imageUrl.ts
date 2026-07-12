// Image URL normalization.
//
// Seed/demo rows (and some older uploads) can store an image_url that is an
// empty or whitespace-only string. A whitespace string is truthy, so guards like
// `product.imageUrl ? <img src={imageUrl}> : <placeholder>` render <img src="   ">.
// The browser trims that to "" and resolves it to the CURRENT PAGE URL, which
// returns HTML (not an image) - showing a broken image on the storefront and in
// the dashboard. Normalizing here (at the DB->view mapping) fixes every consumer
// at once: an empty/blank value becomes undefined/null and the placeholder shows.

/** A usable image URL, or `undefined` for empty/whitespace-only input. */
export const cleanImageUrl = (url?: string | null): string | undefined => {
  const trimmed = url?.trim();
  return trimmed ? trimmed : undefined;
};

/** Same as cleanImageUrl but returns `null` - for nullable DB columns. */
export const cleanImageUrlOrNull = (url?: string | null): string | null => {
  const trimmed = url?.trim();
  return trimmed ? trimmed : null;
};

/** Filter an image list, dropping empty/whitespace-only entries. */
export const cleanImageList = (list?: unknown): string[] =>
  Array.isArray(list)
    ? (list as unknown[])
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter((x): x is string => x.length > 0)
    : [];
