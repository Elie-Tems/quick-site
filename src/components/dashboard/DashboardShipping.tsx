import { useState, useEffect } from "react";
import { Truck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateBusiness } from "@/hooks/useBusiness";
import type { BusinessSettings } from "@/components/dashboard/DashboardSettings";

interface DashboardShippingProps {
  settings: BusinessSettings;
  onSettingsChange: (settings: BusinessSettings) => void;
}

const DashboardShipping = ({ settings, onSettingsChange }: DashboardShippingProps) => {
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
          <h1 className="text-xl font-semibold text-foreground">משלוחים ואיסוף</h1>
          <p className="text-sm text-muted-foreground">
            קבע האם הלקוחות יכולים רק לאסוף מהחנות או גם להזמין משלוח
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
          <div className="space-y-3">
            <Label>אופן אספקה</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="אופן אספקה">
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
                <span className="font-medium text-foreground">איסוף עצמי בלבד</span>
                <span className="text-xs text-muted-foreground">
                  הלקוח יבחר רק איסוף עצמי, ללא אפשרות משלוח.
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
                <span className="font-medium text-foreground">איסוף עצמי + משלוחים</span>
                <span className="text-xs text-muted-foreground">
                  בצ׳קאווט הלקוח יוכל לבחור בין איסוף עצמי למשלוח.
                </span>
              </button>
            </div>
          </div>

          {formData.deliveryMode === "pickup_and_delivery" && (
            <div className="space-y-2">
              <Label htmlFor="deliveryFee">עלות משלוח (₪)</Label>
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
                placeholder="לדוגמה: 25"
              />
              <p className="text-xs text-muted-foreground">
                עלות המשלוח שתתווסף לסכום ההזמנה כאשר הלקוח בוחר משלוח.
              </p>
            </div>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full gap-2" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          שמור הגדרות משלוחים
        </Button>
      </form>
    </div>
  );
};

export default DashboardShipping;
