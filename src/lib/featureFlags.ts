// Feature flags. WhatsApp is BUILT but must not surface to merchants until Moti
// approves and we go live (see the WhatsApp deploy rule). It stays hidden unless
// VITE_WHATSAPP_ENABLED is explicitly "true", so even an accidental deploy keeps
// it dark. Flip the env var (Cloudflare Pages) only after approval.
export const whatsappEnabled = (): boolean =>
  String(import.meta.env.VITE_WHATSAPP_ENABLED || "").toLowerCase() === "true";

// Business email - same build-don't-deploy rule; hidden until approved + live.
export const emailEnabled = (): boolean =>
  String(import.meta.env.VITE_EMAIL_ENABLED || "").toLowerCase() === "true";
