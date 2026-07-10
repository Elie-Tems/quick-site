// AES-GCM encryption for OAuth tokens at rest (calendar_connections.*_enc).
// Key: CALENDAR_TOKEN_KEY secret - a base64 or hex 32-byte key. We never store
// raw Google/Microsoft tokens; only these ciphertexts. Format: base64(iv).base64(ct).

function keyBytes(raw: string): Uint8Array {
  // Accept hex (64 chars) or base64; fall back to UTF-8 bytes padded/truncated to 32.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return new Uint8Array(raw.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  }
  try {
    const b = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    if (b.length === 32) return b;
  } catch { /* not base64 */ }
  const enc = new TextEncoder().encode(raw);
  const out = new Uint8Array(32);
  out.set(enc.subarray(0, 32));
  return out;
}

async function importKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("CALENDAR_TOKEN_KEY");
  if (!raw) throw new Error("CALENDAR_TOKEN_KEY not set");
  return crypto.subtle.importKey("raw", keyBytes(raw), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

const b64 = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptToken(plain: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return `${b64(iv)}.${b64(ct)}`;
}

export async function decryptToken(blob: string): Promise<string> {
  const key = await importKey();
  const [ivB64, ctB64] = blob.split(".");
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(ivB64) }, key, unb64(ctB64),
  );
  return new TextDecoder().decode(pt);
}
