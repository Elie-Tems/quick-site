import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCategoryConfig, type BusinessCategory } from "@/lib/categoryConfig";

export interface CreateBusinessData {
  // Business details
  businessName: string;
  phone: string;
  email: string;
  slug: string;
  tagline?: string;
  businessCategory?: string;
  customCategoryName?: string;
  isReligiousAudience?: boolean;
  
  // Branding
  primaryColor?: string;
  colorPalette?: string[];
  brandStyle?: string;
  templateId?: string; // Selected store template ID
  
  // Files
  logo?: File | null;
  heroImage?: File | null;
  heroImageUrl?: string; // Pre-generated hero image URL from AI
  
  // Payment
  paymentEnabled: boolean;
  paymentProvider?: string | null;
  
  // Product categories (from onboarding)
  productCategories?: Array<{ id: string; name: string; description?: string }>;
  // Products (categoryId = onboarding category id, resolved to DB id when categories exist)
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    image?: File | null;
    imageUrl?: string;
    categoryId?: string;
  }>;
}

interface CreateBusinessResult {
  businessId: string;
  slug: string;
}

async function uploadImage(
  file: File,
  businessId: string,
  folder: string,
  filename: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${businessId}/${folder}/${filename}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('business-assets')
    .upload(filePath, file, { upsert: true });
  
  if (uploadError) throw uploadError;
  
  const { data } = supabase.storage
    .from('business-assets')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

async function generateUniqueSlug(baseName: string): Promise<string> {
  // Create base slug from business name
  let baseSlug = baseName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0590-\u05ffa-z0-9-]/g, "");
  
  // Check if slug exists
  const { data: existing } = await supabase
    .from('businesses')
    .select('slug')
    .eq('slug', baseSlug)
    .maybeSingle();
  
  if (!existing) {
    return baseSlug;
  }
  
  // Add random suffix if slug exists
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${baseSlug}-${randomSuffix}`;
}

export function useCreateBusiness() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateBusinessData): Promise<CreateBusinessResult> => {
      if (!user) {
        throw new Error('User must be authenticated');
      }
      
      console.log('🔍 useCreateBusiness: Starting profile check for user:', user.id);
      
      // 1. Get profile (should be created by trigger)
      let { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('📊 Initial profile check:', { found: !!existingProfile, error: profileError });
      
      if (profileError) throw profileError;

      let profileId = existingProfile?.id as string | undefined;

      // If profile doesn't exist yet, retry with longer delays (trigger is working but slow)
      if (!profileId) {
        console.log('⏳ Profile not found, waiting for trigger...');
        console.log('👤 User metadata:', user.user_metadata);
        console.log('🔐 User app metadata:', user.app_metadata);
        
        // Try 5 times with longer delays (1s, 1.5s, 2s, 2.5s, 3s)
        for (let i = 0; i < 5 && !profileId; i++) {
          const delay = 1000 + (i * 500);
          console.log(`⏱️ Retry ${i + 1}/5 - waiting ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          const { data: retryProfile, error: retryError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          console.log(`🔄 Retry ${i + 1} result:`, { found: !!retryProfile, error: retryError });
          
          if (retryProfile) {
            profileId = retryProfile.id;
            console.log(`✅ Profile found on retry ${i + 1}`);
            break;
          }
        }
      }
      
      console.log('📍 Profile ID after retries:', profileId);
      
      // If still no profile after all retries, fail with clear message
      if (!profileId) {
        console.error('❌ Profile not found after all retries');
        console.error('🔧 Possible issues:');
        console.error('  1. Trigger is not enabled in Supabase');
        console.error('  2. Trigger is failing silently');
        console.error('  3. Database connection issue');
        throw new Error('Profile not found. The trigger may be slow. Please refresh the page and try again.');
      }
      
      console.log('✅ Using profile ID:', profileId);
      
      // 2. Generate unique slug
      const slug = await generateUniqueSlug(data.slug || data.businessName);
      
      // 3. Create business record
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert({
          name: data.businessName,
          slug,
          phone: data.phone || null,
          email: data.email || null,
          tagline: data.tagline || null,
          owner_id: profileId,
          primary_color: data.primaryColor || '#7c3aed',
          color_palette: data.colorPalette || [],
          brand_style: data.brandStyle || 'modern',
          template_id: data.templateId || null,
          business_category: data.businessCategory || 'other',
          custom_category_name: data.customCategoryName || null,
          is_religious_audience: data.isReligiousAudience || false,
          whatsapp_enabled: !!data.phone,
          payment_enabled: data.paymentEnabled,
          payment_provider: data.paymentProvider || null,
          is_published: false,
          // ברירות מחדל מפורשות לחלקים אופציונליים - כולם מכובים
          marquee_bar_enabled: false,
          hero_badge: null,
          promo_text: null,
        } as any)
        .select('id')
        .single();
      
      if (businessError) throw businessError;
      
      const businessId = business.id;

      // 3.1 Initialize AI credits for this business (50 free credits on creation)
      try {
        await supabase
          .from('ai_credits')
          .insert({
            business_id: businessId,
            credits_remaining: 50,
            total_credits_purchased: 0,
            free_credits_granted: true,
          });
      } catch (error) {
        console.error('Failed to initialize AI credits for business:', error);
      }
      
      // 4. Upload logo if provided
      if (data.logo) {
        try {
          const logoUrl = await uploadImage(data.logo, businessId, 'branding', 'logo');
          await supabase
            .from('businesses')
            .update({ logo_url: logoUrl })
            .eq('id', businessId);
        } catch (error) {
          console.error('Failed to upload logo:', error);
        }
      }
      
      // 5. Upload hero image if provided as file, or use pre-generated URL
      let finalHeroUrl: string | null = null;

      if (data.heroImage) {
        try {
          const heroUrl = await uploadImage(data.heroImage, businessId, 'branding', 'hero');
          finalHeroUrl = heroUrl;
          await supabase
            .from('businesses')
            .update({ hero_image_url: heroUrl })
            .eq('id', businessId);
        } catch (error) {
          console.error('Failed to upload hero image:', error);
        }
      } else if (data.heroImageUrl) {
        // Use pre-generated AI hero image URL
        finalHeroUrl = data.heroImageUrl;
        await supabase
          .from('businesses')
          .update({ hero_image_url: data.heroImageUrl })
          .eq('id', businessId);
      }

      // 5.1 Create AI image job entry for hero image so it appears in dashboard gallery
      if (finalHeroUrl) {
        try {
          await supabase.from('ai_image_jobs').insert({
            business_id: businessId,
            product_id: null,
            original_image_url: '',
            product_type: 'hero-image',
            style_type: data.businessCategory || 'onboarding-hero',
            status: 'completed',
            generated_image_url: finalHeroUrl,
            credits_used: 0,
          });
        } catch (error) {
          console.error('Failed to create ai_image_jobs record for hero image:', error);
        }
      }
      
      // 6. Create product categories: מאונבורדינג (תבנית) או מ-categoryConfig לפי סוג העסק - כדי שיופיעו בדשבורד
      const categoryIdMap = new Map<string, string>();
      let categories = data.productCategories ?? [];
      if (categories.length === 0 && data.businessCategory) {
        const config = getCategoryConfig(data.businessCategory as BusinessCategory);
        // כולל את כל הקטגוריות מ-categoryConfig (גם "הכל")
        categories = config.categories.map((name, i) => ({
          id: `config-${i}-${name}`,
          name,
          description: undefined as string | undefined,
        }));
      }
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const { data: inserted, error: catError } = await supabase
          .from('product_categories')
          .insert({
            business_id: businessId,
            name: cat.name,
            description: cat.description ?? null,
            sort_order: i,
          })
          .select('id')
          .single();
        if (catError) {
          throw new Error(`יצירת קטגוריה "${cat.name}" (${i + 1}/${categories.length}) נכשלה: ${catError.message}`);
        }
        if (inserted?.id) {
          categoryIdMap.set(cat.id, inserted.id);
        }
      }
      
      // 7. Create products
      for (let i = 0; i < data.products.length; i++) {
        const product = data.products[i];
        let productImageUrl = product.imageUrl || null;
        
        // Upload product image if file provided
        if (product.image) {
          try {
            productImageUrl = await uploadImage(
              product.image, 
              businessId, 
              'products', 
              `product-${i}`
            );
          } catch (error) {
            console.error('Failed to upload product image:', error);
          }
        }
        
        const resolvedCategoryId = product.categoryId ? categoryIdMap.get(product.categoryId) ?? null : null;
        const { data: insertedProduct, error: productError } = await supabase
          .from('products')
          .insert({
            business_id: businessId,
            name: product.name,
            description: product.description || null,
            price: product.price,
            image_url: productImageUrl,
            sort_order: i,
            active: true,
            category_id: resolvedCategoryId,
          })
          .select('id')
          .single();
        
        if (productError) {
          console.error('Failed to create product:', productError);
        } else if (insertedProduct?.id && productImageUrl) {
          // Create AI image job entry so product images from onboarding (including generate-product-image)
          // will appear in the dashboard "generated images" gallery
          try {
            await supabase.from('ai_image_jobs').insert({
              business_id: businessId,
              product_id: insertedProduct.id,
              original_image_url: '',
              product_type: 'product',
              style_type: data.businessCategory || 'onboarding-product',
              status: 'completed',
              generated_image_url: productImageUrl,
              credits_used: 0,
            });
          } catch (error) {
            console.error('Failed to create ai_image_jobs record for product image:', error);
          }
        }
      }
      
      return { businessId, slug };
    },
    onSuccess: () => {
      // Invalidate queries to refresh dashboard data
      queryClient.invalidateQueries({ queryKey: ['my-business'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
