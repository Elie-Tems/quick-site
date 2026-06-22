import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Coupon {
  id: string;
  business_id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  current_uses: number;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useCoupons = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["coupons", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!businessId,
  });
};

export const useCreateCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (coupon: Omit<Coupon, "id" | "created_at" | "updated_at" | "current_uses">) => {
      const { data, error } = await supabase
        .from("coupons")
        .insert({
          business_id: coupon.business_id,
          code: coupon.code.toUpperCase(),
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          min_order_amount: coupon.min_order_amount,
          max_uses: coupon.max_uses,
          active: coupon.active,
          start_date: coupon.start_date,
          end_date: coupon.end_date,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coupons", variables.business_id] });
      toast.success("הקופון נוצר בהצלחה");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("קוד הקופון כבר קיים");
      } else {
        toast.error("שגיאה ביצירת הקופון");
      }
    },
  });
};

export const useUpdateCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, businessId, ...updates }: Partial<Coupon> & { id: string; businessId: string }) => {
      const { data, error } = await supabase
        .from("coupons")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coupons", variables.businessId] });
      toast.success("הקופון עודכן בהצלחה");
    },
    onError: () => {
      toast.error("שגיאה בעדכון הקופון");
    },
  });
};

export const useDeleteCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, businessId }: { id: string; businessId: string }) => {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coupons", variables.businessId] });
      toast.success("הקופון נמחק בהצלחה");
    },
    onError: () => {
      toast.error("שגיאה במחיקת הקופון");
    },
  });
};

// Hook for validating coupon in checkout
export const useValidateCoupon = () => {
  return useMutation({
    mutationFn: async ({ code, businessId, orderTotal }: { code: string; businessId: string; orderTotal: number }) => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("business_id", businessId)
        .eq("code", code.toUpperCase())
        .eq("active", true)
        .single();

      if (error || !data) {
        throw new Error("קוד קופון לא תקין");
      }

      const coupon = data as Coupon;
      const now = new Date();

      // Check date validity
      if (coupon.start_date && new Date(coupon.start_date) > now) {
        throw new Error("הקופון עדיין לא פעיל");
      }
      if (coupon.end_date && new Date(coupon.end_date) < now) {
        throw new Error("הקופון פג תוקף");
      }

      // Check usage limit
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        throw new Error("הקופון מוצה");
      }

      // Check minimum order
      if (coupon.min_order_amount && orderTotal < coupon.min_order_amount) {
        throw new Error(`הזמנה מינימלית לקופון: ₪${coupon.min_order_amount}`);
      }

      // Calculate discount
      let discount = 0;
      if (coupon.discount_type === "percentage") {
        discount = (orderTotal * coupon.discount_value) / 100;
      } else {
        discount = Math.min(coupon.discount_value, orderTotal);
      }

      return { coupon, discount };
    },
  });
};

// Increment coupon usage after order - direct update instead of RPC
export const useIncrementCouponUsage = () => {
  return useMutation({
    mutationFn: async (couponId: string) => {
      // First get current usage
      const { data: coupon, error: fetchError } = await supabase
        .from("coupons")
        .select("current_uses")
        .eq("id", couponId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Then increment
      const { error } = await supabase
        .from("coupons")
        .update({ current_uses: (coupon?.current_uses || 0) + 1 })
        .eq("id", couponId);
      
      if (error) throw error;
    },
  });
};
