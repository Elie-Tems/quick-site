import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const StoreLeadForm = ({
  businessId,
  accent,
  heading,
  subheading,
}: {
  businessId: string;
  accent: string;
  heading?: string;
  subheading?: string;
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError(t("store.leadform.validation_required"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error: fnErr } = await supabase.functions.invoke("contacts-capture", {
        body: { businessId, name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, message: message.trim() || undefined },
      });
      if (fnErr) throw fnErr;
      setSent(true);
    } catch {
      setError(t("store.leadform.submit_error"));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <section className="py-8 px-4">
        <div className="max-w-md mx-auto text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: accent }} />
          <h2 className="text-xl font-bold">{t("store.leadform.success_title")}</h2>
          <p className="text-muted-foreground">{t("store.leadform.success_subtitle")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-5">
          <span className="inline-block h-1 w-12 rounded-full mb-3" style={{ background: accent }} />
          <h2 className="text-2xl font-bold text-foreground">{heading || t("store.leadform.default_heading")}</h2>
          {subheading && <p className="text-muted-foreground mt-1.5">{subheading}</p>}
        </div>
        <div className="rounded-2xl border-2 shadow-lg bg-card p-5 md:p-6" style={{ borderColor: `${accent}55` }}>
          <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            <div className="space-y-1.5">
              <Label htmlFor="lead-name">{t("store.leadform.label_name")}</Label>
              <Input id="lead-name" value={name} onChange={e => setName(e.target.value)} placeholder={t("store.leadform.placeholder_name")} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">{t("store.leadform.label_phone")}</Label>
              <Input id="lead-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("store.leadform.placeholder_phone")} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">{t("store.leadform.label_email")}</Label>
              <Input id="lead-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t("store.leadform.placeholder_email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-message">{t("store.leadform.label_message")}</Label>
              <Textarea id="lead-message" value={message} onChange={e => setMessage(e.target.value)} placeholder={t("store.leadform.placeholder_message")} rows={3} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full py-3 font-semibold text-white"
              disabled={loading}
              style={{ background: accent }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("store.leadform.submit_button")}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default StoreLeadForm;
