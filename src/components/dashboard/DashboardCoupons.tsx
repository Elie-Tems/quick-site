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

interface DashboardCouponsProps {
  businessId: string | undefined;
}

const DashboardCoupons = ({ businessId }: DashboardCouponsProps) => {
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
    if (!businessId || !confirm("האם למחוק את הקופון?")) return;
    await deleteCoupon.mutateAsync({ id: couponId, businessId });
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount_value}%`;
    }
    return `₪${coupon.discount_value}`;
  };

  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.active) return { label: "לא פעיל", variant: "secondary" as const };
    
    const now = new Date();
    if (coupon.start_date && new Date(coupon.start_date) > now) {
      return { label: "עתידי", variant: "outline" as const };
    }
    if (coupon.end_date && new Date(coupon.end_date) < now) {
      return { label: "פג תוקף", variant: "destructive" as const };
    }
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return { label: "מוצה", variant: "destructive" as const };
    }
    return { label: "פעיל", variant: "default" as const };
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Ticket className="w-6 h-6" />
          קופונים
        </h1>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              קופון חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? "עריכת קופון" : "יצירת קופון חדש"}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">קוד קופון</Label>
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
                  <Label>סוג הנחה</Label>
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
                      <SelectItem value="percentage">אחוזים (%)</SelectItem>
                      <SelectItem value="fixed">סכום קבוע (₪)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_value">ערך הנחה</Label>
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
                <Label htmlFor="min_order">הזמנה מינימלית (₪)</Label>
                <Input
                  id="min_order"
                  type="number"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0 = ללא מינימום"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_uses">מקסימום שימושים</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="ריק = ללא הגבלה"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">תאריך התחלה</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">תאריך סיום</Label>
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
                <Label htmlFor="active">קופון פעיל</Label>
              </div>

              <Button type="submit" className="w-full" disabled={createCoupon.isPending || updateCoupon.isPending}>
                {editingCoupon ? "עדכנו קופון" : "צרו קופון"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">טוען...</div>
      ) : !coupons || coupons.length === 0 ? (
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">קופונים מגדילים מכירות</p>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">צרו קוד הנחה שלקוחות יזינו בקופה - דרך מצוינת לעודד רכישות.</p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
              צרו קופון ראשון
            </Button>
          </CardContent>
        </Card>
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
                          הנחה: {formatDiscount(coupon)}
                          {coupon.min_order_amount && coupon.min_order_amount > 0 && (
                            <span> | מינימום: ₪{coupon.min_order_amount}</span>
                          )}
                        </p>
                        {(coupon.start_date || coupon.end_date) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {coupon.start_date && (
                              <span>מתאריך: {format(new Date(coupon.start_date), "dd/MM/yyyy", { locale: he })}</span>
                            )}
                            {coupon.start_date && coupon.end_date && " | "}
                            {coupon.end_date && (
                              <span>עד: {format(new Date(coupon.end_date), "dd/MM/yyyy", { locale: he })}</span>
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
                        ? `שימושים: ${coupon.current_uses}/${coupon.max_uses}`
                        : `שימושים: ${coupon.current_uses || 0}`}
                    </span>
                    {coupon.min_order_amount && coupon.min_order_amount > 0 && (
                      <span>מינימום: ₪{coupon.min_order_amount}</span>
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
