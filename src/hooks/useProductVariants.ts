import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// product_variants is a new table not yet in the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface ProductVariant {
  id: string;
  product_id: string;
  business_id: string;
  color: string | null;
  color_hex: string | null;
  size: string | null;
  sku: string | null;
  stock: number;
  price_override: number | null;
  image_url: string | null;
  sort_order: number;
}

/** All variant rows (color x size combinations) for a product. */
export const useProductVariants = (productId?: string) =>
  useQuery({
    queryKey: ["product-variants", productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProductVariant[]> => {
      const { data, error } = await sb.from("product_variants")
        .select("*").eq("product_id", productId).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

export type VariantInput = Pick<ProductVariant, "color" | "color_hex" | "size" | "sku" | "stock" | "price_override">;

/**
 * Replace-all save of a product's variant matrix: delete the existing rows and
 * insert the new set. Mirrors the working-hours pattern - simple and atomic
 * enough for the small matrices a clothing product has.
 */
export const useSaveProductVariants = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, businessId, variants }: {
      productId: string; businessId: string; variants: VariantInput[];
    }) => {
      await sb.from("product_variants").delete().eq("product_id", productId);
      const rows = variants.map((v, i) => ({
        product_id: productId,
        business_id: businessId,
        color: v.color?.trim() || null,
        color_hex: v.color_hex || null,
        size: v.size?.trim() || null,
        sku: v.sku?.trim() || null,
        stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
        price_override: v.price_override != null && v.price_override !== undefined ? Number(v.price_override) : null,
        sort_order: i,
      }));
      if (rows.length) {
        const { error } = await sb.from("product_variants").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["product-variants", v.productId] }),
  });
};
