import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon, type Coupon } from "@/hooks/useCoupons";
import { Plus, Pencil, Trash2, Ticket, Percent, Tag } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardCouponsProps {
  businessId: string | undefined;
}

const DashboardCoupons = ({ businessId }: DashboardCouponsProps) => {
  const { t } = useLanguage();
  const { data: coupons, isLoading } = useCoupons(businessId);
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 0,
    min_order_amount: 0,
    max_uses: "",
    active: true,
    start_date: "",
    end_date: "",
  });

  const resetForm = () => {
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: 0,
      min_order_amount: 0,
      max_uses: "",
      active: true,
      start_date: "",
      end_date: "",
    });
    setEditingCoupon(null);
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || 0,
      max_uses: coupon.max_uses?.toString() || "",
      active: coupon.active,
      start_date: coupon.start_date ? coupon.start_date.split("T")[0] : "",
      end_date: coupon.end_date ? coupon.end_date.split("T")[0] : "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    const couponData = {
      business_id: businessId,
      code: formData.code,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      min_order_amount: formData.min_order_amount || null,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      active: formData.active,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    };

    if (editingCoupon) {
      await updateCoupon.mutateAsync({
        id: editingCoupon.id,
        businessId,
        ...couponData,
      });
    } else {
      await createCoupon.mutateAsync(couponData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (couponId: string) => {
    if (!businessId || !confirm(t("dash.coupons.confirm_delete"))) return;
    await deleteCoupon.mutateAsync({ id: couponId, businessId });
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount_value}%`;
    }
    return `₪${coupon.discount_value}`;
  };

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.active) return { label: t("dash.coupons.status_inactive"), variant: "secondary" as const };

    const now = new Date();
    if (coupon.start_date && new Date(coupon.start_date) > now) {
      return { label: t("dash.coupons.status_upcoming"), variant: "outline" as const };
    }
    if (coupon.end_date && new Date(coupon.end_date) < now) {
      return { label: t("dash.coupons.status_expired"), variant: "destructive" as const };
    }
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return { label: t("dash.coupons.status_exhausted"), variant: "destructive" as const };
    }
    return { label: t("dash.coupons.status_active"), variant: "default" as const };
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Colorful header */}
      <div className="rounded-2xl bg-gradient-to-l from-orange-500/15 to-amber-500/5 border border-orange-500/20 p-5 flex items-center gap-4">
        <div className="text-4xl">🏷️</div>
        <div>
          <h1 className="text-lg font-bold text-foreground">{t("dash.coupons.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dash.coupons.subtitle")}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div />
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t("dash.coupons.new_coupon")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? t("dash.coupons.edit_coupon") : t("dash.coupons.create_coupon")}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">{t("dash.coupons.code_label")}</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE10"
                  required
                  disabled={!!editingCoupon}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("dash.coupons.discount_type_label")}</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: "percentage" | "fixed") =>
                      setFormData({ ...formData, discount_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t("dash.coupons.discount_type_percentage")}</SelectItem>
                      <SelectItem value="fixed">{t("dash.coupons.discount_type_fixed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_value">{t("dash.coupons.discount_value_label")}</Label>
                  <Input
                    id="discount_value"
                    type="number"
                    min="0"
                    max={formData.discount_type === "percentage" ? 100 : undefined}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_order">{t("dash.coupons.min_order_label")}</Label>
                <Input
                  id="min_order"
                  type="number"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                  placeholder={t("dash.coupons.min_order_placeholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_uses">{t("dash.coupons.max_uses_label")}</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder={t("dash.coupons.max_uses_placeholder")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">{t("dash.coupons.start_date_label")}</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">{t("dash.coupons.end_date_label")}</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">{t("dash.coupons.active_label")}</Label>
              </div>

              <Button type="submit" className="w-full" disabled={createCoupon.isPending || updateCoupon.isPending}>
                {editingCoupon ? t("dash.coupons.update_button") : t("dash.coupons.create_button")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t("dash.coupons.loading")}</div>
      ) : !coupons || coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="text-5xl mb-4">🏷️</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{t("dash.coupons.empty_title")}</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            {t("dash.coupons.empty_desc")}
          </p>
          <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
            {t("dash.coupons.empty_cta")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {coupons.map((coupon) => {
            const status = getCouponStatus(coupon);
            return (
              <Card key={coupon.id} className="h-full">
                <CardContent className="p-4 h-full flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {coupon.discount_type === "percentage" ? (
                          <Percent className="w-6 h-6 text-primary" />
                        ) : (
                          <Tag className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg font-mono">{coupon.code}</span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("dash.coupons.discount_label")}: {formatDiscount(coupon)}
                          {coupon.min_order_amount && coupon.min_order_amount > 0 && (
                            <span> | {t("dash.coupons.min_order_inline")}: ₪{coupon.min_order_amount}</span>
                          )}
                        </p>
                        {(coupon.start_date || coupon.end_date) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {coupon.start_date && (
                              <span>{t("dash.coupons.from_date")}: {format(new Date(coupon.start_date), "dd/MM/yyyy", { locale: he })}</span>
                            )}
                            {coupon.start_date && coupon.end_date && " | "}
                            {coupon.end_date && (
                              <span>{t("dash.coupons.until_date")}: {format(new Date(coupon.end_date), "dd/MM/yyyy", { locale: he })}</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(coupon)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(coupon.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {coupon.max_uses
                        ? `${t("dash.coupons.uses_label")}: ${coupon.current_uses}/${coupon.max_uses}`
                        : `${t("dash.coupons.uses_label")}: ${coupon.current_uses || 0}`}
                    </span>
                    {coupon.min_order_amount && coupon.min_order_amount > 0 && (
                      <span>{t("dash.coupons.min_order_inline")}: ₪{coupon.min_order_amount}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardCoupons;
