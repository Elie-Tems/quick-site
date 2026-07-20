import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMyBusiness, useUpdateBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const DashboardWhatsAppButton = () => {
  const { t } = useLanguage();
  const { data: business } = useMyBusiness();
  const updateBusiness = useUpdateBusiness();

  const [enabled, setEnabled] = useState(true);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!business) return;
    setEnabled((business as any).whatsapp_enabled ?? true);
    setPhone((business as any).phone || "");
    setMessage((business as any).whatsapp_message || "");
  }, [business]);

  const handleSave = async () => {
    if (!business?.id) return;
    await updateBusiness.mutateAsync({
      id: business.id,
      whatsapp_enabled: enabled,
      phone,
      whatsapp_message: message || null,
    } as any);
    toast.success(t("dash.whatsappbtn.saved_toast"));
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t("dash.whatsappbtn.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("dash.whatsappbtn.subtitle")}</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {enabled
              ? t("dash.whatsappbtn.enabled_desc")
              : t("dash.whatsappbtn.disabled_desc")}
          </p>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="waPhone">{t("dash.whatsappbtn.phone_label")}</Label>
              <Input
                id="waPhone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-0000000"
              />
              <p className="text-xs text-muted-foreground">
                {t("dash.whatsappbtn.phone_help")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waMessage">{t("dash.whatsappbtn.message_label")}</Label>
              <Textarea
                id="waMessage"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("dash.whatsappbtn.message_placeholder")}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                {t("dash.whatsappbtn.message_help")}
              </p>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20">
              <p className="text-sm font-medium text-foreground mb-2">{t("dash.whatsappbtn.preview_label")}</p>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-md shrink-0">
                  <MessageCircle className="h-6 w-6" fill="currentColor" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{t("dash.whatsappbtn.preview_desc")}</p>
                  <p className="text-sm font-medium text-foreground mt-1">
                    "{message || t("dash.whatsappbtn.message_placeholder")}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={updateBusiness.isPending} className="w-full">
        {updateBusiness.isPending ? t("dash.whatsappbtn.saving") : t("dash.whatsappbtn.save_btn")}
      </Button>
    </div>
  );
};

export default DashboardWhatsAppButton;
