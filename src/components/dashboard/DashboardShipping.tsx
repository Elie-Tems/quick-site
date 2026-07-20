import { useState, useEffect } from "react";
import { Truck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateBusiness } from "@/hooks/useBusiness";
import type { BusinessSettings } from "@/components/dashboard/DashboardSettings";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardShippingProps {
  settings: BusinessSettings;
  onSettingsChange: (settings: BusinessSettings) => void;
}

const DashboardShipping = ({ settings, onSettingsChange }: DashboardShippingProps) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    deliveryMode: settings.deliveryMode ?? "pickup_only",
    deliveryFee: settings.deliveryFee ?? undefined as number | undefined,
  });
  const updateBusiness = useUpdateBusiness();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      deliveryMode: settings.deliveryMode ?? "pickup_only",
      deliveryFee: settings.deliveryFee ?? undefined,
    });
  }, [settings.deliveryMode, settings.deliveryFee]);

  const handleChange = (updates: Partial<typeof formData>) => {
    const next = { ...formData, ...updates };
    setFormData(next);
    onSettingsChange({
      ...settings,
      deliveryMode: next.deliveryMode as BusinessSettings["deliveryMode"],
      deliveryFee: next.deliveryFee,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.id) return;
    setIsSaving(true);
    try {
      await updateBusiness.mutateAsync({
        id: settings.id,
        delivery_mode: formData.deliveryMode,
        delivery_fee:
          formData.deliveryMode === "pickup_and_delivery"
            ? (typeof formData.deliveryFee === "number" ? formData.deliveryFee : 0)
            : null,
      } as any);
      onSettingsChange({
        ...settings,
        deliveryMode: formData.deliveryMode as BusinessSettings["deliveryMode"],
        deliveryFee: formData.deliveryFee,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Truck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("dash.shipping.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("dash.shipping.subtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
          <div className="space-y-3">
            <Label>{t("dash.shipping.mode_label")}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={t("dash.shipping.mode_label")}>
              <button
                type="button"
                onClick={() => handleChange({ deliveryMode: "pickup_only" })}
                className={`flex flex-col gap-1 p-4 rounded-lg border cursor-pointer transition-colors text-right ${
                  formData.deliveryMode === "pickup_only"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30"
                }`}
                aria-pressed={formData.deliveryMode === "pickup_only"}
              >
                <span className="font-medium text-foreground">{t("dash.shipping.pickup_only_title")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("dash.shipping.pickup_only_desc")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleChange({ deliveryMode: "pickup_and_delivery" })}
                className={`flex flex-col gap-1 p-4 rounded-lg border cursor-pointer transition-colors text-right ${
                  formData.deliveryMode === "pickup_and_delivery"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30"
                }`}
                aria-pressed={formData.deliveryMode === "pickup_and_delivery"}
              >
                <span className="font-medium text-foreground">{t("dash.shipping.pickup_and_delivery_title")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("dash.shipping.pickup_and_delivery_desc")}
                </span>
              </button>
            </div>
          </div>

          {formData.deliveryMode === "pickup_and_delivery" && (
            <div className="space-y-2">
              <Label htmlFor="deliveryFee">{t("dash.shipping.fee_label")}</Label>
              <Input
                id="deliveryFee"
                type="number"
                dir="ltr"
                min={0}
                value={formData.deliveryFee ?? ""}
                onChange={(e) =>
                  handleChange({
                    deliveryFee: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
                placeholder={t("dash.shipping.fee_placeholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("dash.shipping.fee_help")}
              </p>
            </div>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full gap-2" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("dash.shipping.save_button")}
        </Button>
      </form>
    </div>
  );
};

export default DashboardShipping;
