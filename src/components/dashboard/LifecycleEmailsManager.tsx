import { useState } from "react";
import { Mail, RotateCcw, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getEnabledModules, type BusinessLike } from "@/lib/businessModules";
import { lifecycleEmailsForModules, type LifecycleEmailDef } from "@/lib/lifecycleEmails";
import { useLifecycleEmails, useSaveLifecycleEmail, useResetLifecycleEmail } from "@/hooks/useLifecycleEmails";
import { useLanguage } from "@/contexts/LanguageContext";

// Email-type display names (def.label in lifecycleEmails.ts is the Hebrew
// fallback/DB-facing value; this maps each def.key to its translated label
// for the editor UI).
const emailTypeLabel = (t: (key: string) => string, key: string): string => {
  const map: Record<string, string> = {
    order_confirm: t("dash.lifecycle.label_order_confirm"),
    cart_abandon: t("dash.lifecycle.label_cart_abandon"),
    review_request: t("dash.lifecycle.label_review_request"),
    booking_confirm: t("dash.lifecycle.label_booking_confirm"),
    booking_reminder: t("dash.lifecycle.label_booking_reminder"),
    booking_cancel: t("dash.lifecycle.label_booking_cancel"),
    lead_reply: t("dash.lifecycle.label_lead_reply"),
    donation_thanks: t("dash.lifecycle.label_donation_thanks"),
    donation_recurring: t("dash.lifecycle.label_donation_recurring"),
  };
  return map[key] ?? key;
};

/**
 * Merchant editor for the automatic (transactional) emails their customers get.
 * Each email can be turned off (e.g. a service provider that doesn't allow
 * cancellations disables "ביטול תור") and its wording overridden. Absent override
 * = the built-in default. The logo + colors come from the business automatically.
 */
const EmailCard = ({ businessId, def, override }: {
  businessId: string;
  def: LifecycleEmailDef;
  override?: { enabled: boolean; subject: string | null; heading: string | null; body: string | null; button_text: string | null };
}) => {
  const { t } = useLanguage();
  const save = useSaveLifecycleEmail();
  const reset = useResetLifecycleEmail();
  const [open, setOpen] = useState(false);
  const enabled = override?.enabled ?? true;
  const [draft, setDraft] = useState({
    subject: override?.subject ?? def.defaults.subject,
    heading: override?.heading ?? def.defaults.heading,
    body: override?.body ?? def.defaults.body,
    button_text: override?.button_text ?? (def.defaults.button ?? ""),
  });

  const doSave = () =>
    save.mutate({ businessId, templateKey: def.key, ...draft },
      { onSuccess: () => toast.success(t("dash.lifecycle.toast_saved")), onError: () => toast.error(t("dash.lifecycle.toast_save_failed")) });

  const doReset = () =>
    reset.mutate({ businessId, templateKey: def.key }, {
      onSuccess: () => { setDraft({ subject: def.defaults.subject, heading: def.defaults.heading, body: def.defaults.body, button_text: def.defaults.button ?? "" }); toast.success(t("dash.lifecycle.toast_reset")); },
    });

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-3.5">
        <Mail className="w-5 h-5 text-primary shrink-0" />
        <button onClick={() => setOpen((o) => !o)} className="flex-1 text-right">
          <div className="font-medium text-foreground flex items-center gap-1.5">{emailTypeLabel(t, def.key)} <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} /></div>
          <div className="text-xs text-muted-foreground truncate">{override?.subject ?? def.defaults.subject}</div>
        </button>
        {def.cancellable ? (
          <button onClick={() => save.mutate({ businessId, templateKey: def.key, enabled: !enabled }, { onSuccess: () => toast.success(enabled ? t("dash.lifecycle.toast_email_disabled") : t("dash.lifecycle.toast_email_enabled")) })}
            className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${enabled ? "bg-primary justify-end" : "bg-muted justify-start"}`}>
            <span className="w-5 h-5 rounded-full bg-white shadow" />
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground shrink-0">{t("dash.lifecycle.always_sent")}</span>
        )}
      </div>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-2 border-t border-border pt-3">
          <div>
            <label className="text-xs text-muted-foreground">{t("dash.lifecycle.subject_label")}</label>
            <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("dash.lifecycle.heading_label")}</label>
            <Input value={draft.heading} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("dash.lifecycle.body_label")}</label>
            <Textarea rows={3} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("dash.lifecycle.button_label")}</label>
            <Input value={draft.button_text} onChange={(e) => setDraft({ ...draft, button_text: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={doSave} disabled={save.isPending} className="gap-1.5"><Check className="w-4 h-4" /> {t("dash.lifecycle.save")}</Button>
            <Button size="sm" variant="outline" onClick={doReset} disabled={reset.isPending} className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> {t("dash.lifecycle.reset_default")}</Button>
          </div>
        </div>
      )}
    </div>
  );
};

const LifecycleEmailsManager = ({ business }: { business: (BusinessLike & { id: string }) | null | undefined }) => {
  const { t } = useLanguage();
  const { data: overrides = {} } = useLifecycleEmails(business?.id);
  if (!business?.id) return null;
  const defs = lifecycleEmailsForModules(getEnabledModules(business));
  if (!defs.length) return null;

  return (
    <section>
      <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> {t("dash.lifecycle.title")}</h3>
      <p className="text-sm text-muted-foreground mb-3">{t("dash.lifecycle.subtitle")}</p>
      <div className="space-y-2">
        {defs.map((def) => <EmailCard key={def.key} businessId={business.id} def={def} override={overrides[def.key]} />)}
      </div>
    </section>
  );
};

export default LifecycleEmailsManager;
