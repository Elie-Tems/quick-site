import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { getCategoryConfig, type BusinessCategory } from "@/lib/categoryConfig";

export type ProductCategory = Tables<"product_categories">;
type ProductCategoryInsert = TablesInsert<"product_categories">;
type ProductCategoryUpdate = TablesUpdate<"product_categories">;

export function useProductCategories(businessId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["product-categories", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as ProductCategory[];
    },
    enabled: !!businessId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: ProductCategoryInsert) => {
      const { data, error } = await supabase
        .from("product_categories")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ProductCategory;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["product-categories", data.business_id] });
      queryClient.invalidateQueries({ queryKey: ["storefront-categories", data.business_id] });
      toast.success("הקטגוריה נוספה");
    },
    onError: (e) => toast.error("שגיאה: " + (e as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: ProductCategoryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("product_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ProductCategory;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["product-categories", data.business_id] });
      queryClient.invalidateQueries({ queryKey: ["storefront-categories", data.business_id] });
      toast.success("הקטגוריה עודכנה");
    },
    onError: (e) => toast.error("שגיאה: " + (e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, businessId }: { id: string; businessId: string }) => {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) throw error;
      return { id, businessId };
    },
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-categories", businessId] });
      queryClient.invalidateQueries({ queryKey: ["products", businessId] });
      queryClient.invalidateQueries({ queryKey: ["storefront-categories", businessId] });
      toast.success("הקטגוריה נמחקה");
    },
    onError: (e) => toast.error("שגיאה: " + (e as Error).message),
  });

  /** ייבוא קטגוריות מ-categoryConfig לפי סוג העסק - נשמרות ב-DB ומופיעות בניהול */
  const seedFromBusinessCategoryMutation = useMutation({
    mutationFn: async ({
      businessId,
      businessCategory,
    }: {
      businessId: string;
      businessCategory: BusinessCategory;
    }) => {
      const config = getCategoryConfig(businessCategory);
      const names = config.categories.filter((name) => name !== "הכל");
      for (let i = 0; i < names.length; i++) {
        const { error } = await supabase.from("product_categories").insert({
          business_id: businessId,
          name: names[i],
          description: null,
          sort_order: i,
        });
        if (error) throw error;
      }
      return { businessId };
    },
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-categories", businessId] });
      queryClient.invalidateQueries({ queryKey: ["storefront-categories", businessId] });
      toast.success("הקטגוריות נוספו ומופיעות כעת בניהול");
    },
    onError: (e) => toast.error("שגיאה בייבוא: " + (e as Error).message),
  });

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createCategory: createMutation.mutateAsync,
    updateCategory: updateMutation.mutateAsync,
    deleteCategory: deleteMutation.mutateAsync,
    seedFromBusinessCategory: seedFromBusinessCategoryMutation.mutateAsync,
    isSeedingFromBusinessCategory: seedFromBusinessCategoryMutation.isPending,
  };
}
