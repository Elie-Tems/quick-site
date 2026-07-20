import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import type { ProductCustomField } from '@/components/dashboard/types';

type Product = Tables<'products'>;
type ProductInsert = TablesInsert<'products'>;
type ProductUpdate = TablesUpdate<'products'>;

// Get products for a business with custom fields
export const useProducts = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['products', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      // Fetch products
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      if (!productsData || productsData.length === 0) return [];
      
      // Fetch custom fields for all products
      const productIds = productsData.map(p => p.id);
      const { data: customFieldsData } = await supabase
        .from('product_custom_fields')
        .select('*')
        .in('product_id', productIds)
        .order('sort_order', { ascending: true });
      
      // Fetch category assignments for all products
      const { data: categoryAssignments } = await supabase
        .from('product_category_assignments')
        .select('product_id, category_id')
        .in('product_id', productIds);
      
      // Map custom fields and categories to products
      const productsWithCustomFields = productsData.map(product => ({
        ...product,
        customFields: customFieldsData
          ?.filter(cf => cf.product_id === product.id)
          .map(cf => ({
            id: cf.id,
            fieldName: cf.field_name,
            fieldValue: cf.field_value,
          })) || [],
        categoryIds: categoryAssignments
          ?.filter(ca => ca.product_id === product.id)
          .map(ca => ca.category_id) || [],
        // Keep categoryId for backward compatibility (first category or existing value)
        categoryId: categoryAssignments?.find(ca => ca.product_id === product.id)?.category_id || (product as any).category_id
      }));
      
      return productsWithCustomFields;
    },
    enabled: !!businessId,
  });
};

// Get active products for storefront
export const useActiveProducts = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['products', businessId, 'active'],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
};

// Create product with custom fields
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: ProductInsert & { customFields?: ProductCustomField[]; categoryIds?: string[]; additional_images?: string[] | null }) => {
      const { customFields, categoryIds, additional_images, ...productData } = product;
      const insertData = { ...productData, additional_images: additional_images ?? [] };
      
      // Create product
      const { data, error } = await supabase
        .from('products')
        .insert(insertData as ProductInsert)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create custom fields if any
      if (customFields && customFields.length > 0) {
        const customFieldsData = customFields
          .filter(cf => cf.fieldName && cf.fieldValue)
          .map((cf, index) => ({
            product_id: data.id,
            field_name: cf.fieldName,
            field_value: cf.fieldValue,
            sort_order: index,
          }));
        
        if (customFieldsData.length > 0) {
          const { error: cfError } = await supabase
            .from('product_custom_fields')
            .insert(customFieldsData);
          
          if (cfError) console.error('Error creating custom fields:', cfError);
        }
      }
      
      // Create category assignments if any
      if (categoryIds && categoryIds.length > 0) {
        const categoryAssignments = categoryIds.map(categoryId => ({
          product_id: data.id,
          category_id: categoryId,
        }));
        
        const { error: caError } = await supabase
          .from('product_category_assignments')
          .insert(categoryAssignments);
        
        if (caError) console.error('Error creating category assignments:', caError);
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products', data.business_id] });
      queryClient.invalidateQueries({ queryKey: ['business-usage', data.business_id] });
      toast.success('המוצר נוסף בהצלחה!');
      // Recalculate stored image count so quota meter stays in sync
      if (data.image_url) {
        supabase.rpc('recalculate_business_usage', { p_business_id: data.business_id }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['business-usage', data.business_id] });
        });
      }
    },
    onError: (error) => {
      toast.error('שגיאה בהוספת המוצר: ' + error.message);
      // The dashboard's local product list was already updated optimistically
      // before this mutation resolved - refetch so it reverts to the true DB
      // state instead of showing a product that was never actually created.
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// Update product with custom fields
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, customFields, categoryIds, ...updates }: ProductUpdate & { id: string; customFields?: ProductCustomField[]; categoryIds?: string[]; additional_images?: string[] | null }) => {
      // Update product
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Handle custom fields if provided
      if (customFields !== undefined) {
        // Delete all existing custom fields for this product
        await supabase
          .from('product_custom_fields')
          .delete()
          .eq('product_id', id);
        
        // Insert new custom fields
        if (customFields.length > 0) {
          const customFieldsData = customFields
            .filter(cf => cf.fieldName && cf.fieldValue)
            .map((cf, index) => ({
              product_id: id,
              field_name: cf.fieldName,
              field_value: cf.fieldValue,
              sort_order: index,
            }));
          
          if (customFieldsData.length > 0) {
            const { error: cfError } = await supabase
              .from('product_custom_fields')
              .insert(customFieldsData);
            
            if (cfError) console.error('Error updating custom fields:', cfError);
          }
        }
      }
      
      // Handle category assignments if provided
      if (categoryIds !== undefined) {
        // Delete all existing category assignments for this product
        await supabase
          .from('product_category_assignments')
          .delete()
          .eq('product_id', id);
        
        // Insert new category assignments
        if (categoryIds.length > 0) {
          const categoryAssignments = categoryIds.map(categoryId => ({
            product_id: id,
            category_id: categoryId,
          }));
          
          const { error: caError } = await supabase
            .from('product_category_assignments')
            .insert(categoryAssignments);
          
          if (caError) console.error('Error updating category assignments:', caError);
        }
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products', data.business_id] });
      queryClient.invalidateQueries({ queryKey: ['business-usage', data.business_id] });
      toast.success('המוצר עודכן בהצלחה');
      // Recalculate stored image count so quota meter stays in sync
      supabase.rpc('recalculate_business_usage', { p_business_id: data.business_id }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['business-usage', data.business_id] });
      });
    },
    onError: (error) => {
      toast.error('שגיאה בעדכון המוצר: ' + error.message);
      // Revert the dashboard's optimistic local edit back to the true DB state.
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// Delete product
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, businessId }: { id: string; businessId: string }) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, businessId };
    },
    onSuccess: ({ businessId }) => {
      queryClient.invalidateQueries({ queryKey: ['products', businessId] });
      toast.success('המוצר נמחק בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה במחיקת המוצר: ' + error.message);
      // Bring back a product that the dashboard optimistically removed but
      // which was never actually deleted from the DB.
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
