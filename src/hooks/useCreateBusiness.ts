import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCategoryConfig, type BusinessCategory } from "@/lib/categoryConfig";
import { DEFAULT_LAYOUT, hasModule } from "@/lib/businessModules";
import { getTemplate } from "@/lib/storeTemplates";

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
  // Vertical chosen in StepBusinessType. Drives per-vertical modules
  // (src/lib/businessModules.ts) and the auto-selected storefront layout.
  businessType?: "products" | "services" | "realestate" | "nonprofit" | null;
  businessSubType?: string | null;

  // AI-generated content from StepContentAI
  heroTitle?: string;
  aboutText?: string;
  heroBenefits?: string;
  promoText?: string;

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
      
      // 2+3. Create the business, retrying with a fresh slug suffix on a unique
      // violation. generateUniqueSlug's pre-check is RLS-scoped, so it can miss an
      // existing same-slug row that this user can't see; the global constraint
      // (businesses_slug_key) still fires on insert, so we handle 23505 here.
      const slugify = (s: string) =>
        s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^֐-׿a-z0-9-]/g, "");
      const baseSlug = slugify(data.slug || data.businessName) || "store";

      // Auto-layout by vertical: derive the storefront layout from the chosen
      // business_type (services -> service, realestate -> property, nonprofit ->
      // classic, products -> market/classic), keeping the brand palette.
      let resolvedTemplateId: string | null = data.templateId || null;
      if (data.businessType) {
        const paletteId = getTemplate(data.templateId).paletteId;
        resolvedTemplateId = `${DEFAULT_LAYOUT[data.businessType]}-${paletteId}`;
      }

      let business: { id: string } | null = null;
      let businessError: any = null;
      let slug = "";
      for (let attempt = 0; attempt < 6; attempt++) {
        slug =
          attempt === 0
            ? await generateUniqueSlug(data.slug || data.businessName)
            : `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
        const res = await supabase
          .from('businesses')
          .insert({
            name: data.businessName,
            slug,
            phone: data.phone || null,
            email: data.email || null,
            tagline: data.tagline || null,
            // Also written to about_page_body below (not just about_text) so it shows
            // up immediately in the dashboard's "אודות העסק" tab, which reads about_text
            // with a fallback to about_page_body (DashboardContent.tsx).
            about_page_body: data.aboutText || null,
            owner_id: profileId,
            primary_color: data.primaryColor || '#7c3aed',
            color_palette: data.colorPalette || [],
            brand_style: data.brandStyle || 'modern',
            template_id: resolvedTemplateId,
            business_category: data.businessCategory || 'other',
            custom_category_name: data.customCategoryName || null,
            is_religious_audience: data.isReligiousAudience || false,
            whatsapp_enabled: !!data.phone,
            payment_enabled: data.paymentEnabled,
            payment_provider: data.paymentProvider || null,
            is_published: false,
            // AI-generated content from StepContentAI
            hero_title: data.heroTitle || null,
            about_text: data.aboutText || null,
            hero_benefits: data.heroBenefits || null,
            promo_text: data.promoText || null,
            // ברירות מחדל מפורשות לחלקים אופציונליים - כולם מכובים
            marquee_bar_enabled: false,
            hero_badge: null,
          } as any)
          .select('id')
          .single();
        if (!res.error) { business = res.data; businessError = null; break; }
        businessError = res.error;
        const isDup = res.error.code === '23505' || String(res.error.message || '').includes('slug');
        if (!isDup) break;
      }

      if (!business) throw businessError;

      const businessId = business.id;

      // Persist the vertical chosen at onboarding (products/services/realestate/
      // nonprofit) - it was collected in StepBusinessType but never saved, so
      // nothing could branch on it. Best-effort separate update: if the
      // business_type column isn't in prod yet (migration 20260707120000 not
      // applied), this fails silently and the business is still created fine;
      // the moment the migration is applied it starts persisting automatically.
      // Drives per-vertical modules - see src/lib/businessModules.ts.
      if (data.businessType || data.businessSubType) {
        try {
          await supabase
            .from('businesses')
            .update({
              ...(data.businessType ? { business_type: data.businessType } : {}),
              ...(data.businessSubType ? { business_sub_type: data.businessSubType } : {}),
            } as any)
            .eq('id', businessId);
        } catch { /* columns may not exist until migration is applied - ignore */ }
      }

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
      
      // 7. Create products (or listings for realestate businesses, or donation
      // campaigns for nonprofit/synagogue businesses).
      const isRealEstate = data.businessType === 'realestate';
      // Nonprofit/synagogue verticals route the seeded demo items to
      // donation_campaigns (read by DonationWidget), not the products table.
      const isDonations = hasModule({ business_type: data.businessType }, 'donations');
      // Listing kind is driven by the business category: a car dealer routed to
      // the realestate vertical sells vehicles, everyone else lists property.
      const listingKind = data.businessCategory === 'automotive' ? 'vehicle' : 'property';
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

        // Real estate businesses: save to listings table (leads-based, not cart-based).
        // kind is derived from the category (vehicle for car dealers, else property).
        if (isRealEstate) {
          const { error: listingError } = await (supabase as any)
            .from('listings')
            .insert({
              business_id: businessId,
              kind: listingKind,
              title: product.name,
              description: product.description || null,
              price: product.price,
              media: productImageUrl ? { images: [productImageUrl] } : {},
              sort_order: i,
              active: true,
            });
          if (listingError) console.error('Failed to create listing:', listingError);
          continue;
        }

        // Nonprofit/synagogue businesses: save seeded demo items as donation
        // campaigns (read by DonationWidget) instead of add-to-cart products.
        // Mirrors the realestate -> listings branch above.
        if (isDonations) {
          const { error: campaignError } = await (supabase as any)
            .from('donation_campaigns')
            .insert({
              business_id: businessId,
              title: product.name,
              description: product.description || null,
              goal_amount: product.price || null,
              cover_url: productImageUrl,
              sort_order: i,
              active: true,
            });
          if (campaignError) console.error('Failed to create donation campaign:', campaignError);
          continue;
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
          throw new Error(`יצירת מוצר "${product.name}" נכשלה: ${productError.message}`);
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
