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

const ORDER_WEBHOOK_URL = import.meta.env.VITE_ORDER_WEBHOOK_URL || '';

// Create order with items (for storefront checkout)
export const useCreateOrder = () => {
  return useMutation({
    mutationFn: async ({ 
      order, 
      items,
      businessName,
      businessEmail,
      businessPhone,
    }: { 
      order: OrderInsert; 
      items: Omit<OrderItemInsert, 'order_id'>[];
      businessName?: string;
      businessEmail?: string | null;
      businessPhone?: string | null;
    }) => {
      // Create the order first
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Then create order items
      const orderItems = items.map(item => ({
        ...item,
        order_id: orderData.id,
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
      
      // Send to Make.com webhook (fire-and-forget; don't fail order if webhook fails)
      if (ORDER_WEBHOOK_URL) {
        const itemsWithTotal = orderItems.map((item) => ({
          ...item,
          line_total: item.price_at_order * item.quantity,
        }));
        const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
        fetch(ORDER_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: orderData,
            items: itemsWithTotal,
            businessName: businessName ?? null,
            businessEmail: businessEmail ?? null,
            businessPhone: businessPhone ?? null,
            totalItems,
          }),
        }).catch((err) => console.warn('Order webhook failed:', err));
      }
      
      return orderData;
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
