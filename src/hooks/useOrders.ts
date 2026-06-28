import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Order = Tables<'orders'>;
type OrderInsert = TablesInsert<'orders'>;
type OrderUpdate = TablesUpdate<'orders'>;
type OrderItem = Tables<'order_items'>;
type OrderItemInsert = TablesInsert<'order_items'>;

// Get orders for a business (for dashboard)
export const useOrders = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['orders', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
};

// Get order items for an order
export const useOrderItems = (orderId: string | undefined) => {
  return useQuery({
    queryKey: ['order-items', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!orderId,
  });
};

// Create order with items (for storefront COD checkout)
// Prices are recomputed server-side by the orders-create Edge Function —
// the client supplies only product IDs and quantities, never prices.
export const useCreateOrder = () => {
  return useMutation({
    mutationFn: async ({
      order,
      items,
    }: {
      order: Pick<OrderInsert, 'business_id' | 'customer_name' | 'customer_phone' | 'customer_email' | 'notes' | 'delivery_method' | 'delivery_address' | 'coupon_id'>;
      items: { product_id: string; quantity: number }[];
    }) => {
      const { data, error } = await supabase.functions.invoke('orders-create', {
        body: {
          businessId: order.business_id,
          items,
          customer: {
            fullName: order.customer_name ?? '',
            phone: order.customer_phone ?? '',
            email: order.customer_email ?? '',
          },
          notes: order.notes ?? undefined,
          deliveryMethod: order.delivery_method ?? undefined,
          deliveryAddress: order.delivery_address ?? undefined,
          couponId: order.coupon_id ?? undefined,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || 'שגיאה ביצירת ההזמנה');
      return data;
    },
    onSuccess: () => {
      toast.success('ההזמנה נשלחה בהצלחה!');
    },
    onError: (error) => {
      toast.error('שגיאה בשליחת ההזמנה: ' + error.message);
    },
  });
};

// Update order status (for dashboard)
export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: OrderUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders', data.business_id] });
      toast.success('ההזמנה עודכנה בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה בעדכון ההזמנה: ' + error.message);
    },
  });
};

// Delete order
export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, businessId }: { id: string; businessId: string }) => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, businessId };
    },
    onSuccess: ({ businessId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', businessId] });
      toast.success('ההזמנה נמחקה בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה במחיקת ההזמנה: ' + error.message);
    },
  });
};
