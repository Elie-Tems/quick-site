import type { StoreTemplate } from '@/lib/storeTemplates';
import type { BusinessCategory } from '@/lib/categoryConfig';
import type { Product } from '@/components/storefront/StoreProducts';
import type { StoreCategoryItem } from '@/components/storefront/StoreHeader';
import type { CartItem } from '@/components/storefront/FloatingCart';
import type { ReviewsCache } from '@/components/storefront/StoreReviews';

export interface StorefrontBanner {
  id: string;
  title?: string;
  text?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
}

export interface StorefrontLayoutProps {
  // Business identity
  businessName: string;
  businessSlug: string;
  logoUrl?: string;
  phone?: string;
  tagline?: string | null;
  ctaText?: string | null;
  heroTitle?: string | null;
  heroBadge?: string;
  heroImageUrl?: string;
  heroBenefits?: string[] | null;
  primaryColor?: string;
  promoText?: string;
  aboutText?: string;
  whatsappEnabled?: boolean;
  whatsappMessage?: string;
  showMarqueeBar?: boolean;
  businessCategory?: BusinessCategory;
  reviewsCache?: ReviewsCache | null;

  // Template
  template: StoreTemplate;

  // Products & categories
  products: Product[];
  categories: StoreCategoryItem[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;

  // Banners
  banners: StorefrontBanner[];

  // Campaign popup
  campaignPopup?: {
    enabled: boolean;
    campaignId?: string;
    title?: string;
    text?: string;
    ctaText?: string;
    ctaUrl?: string;
    imageUrl?: string;
    couponCode?: string;
    accent?: string;
  };

  // Cart state
  cartItems: CartItem[];
  favoritesCount: number;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onCheckout: () => void;
  onNavigateToCart: () => void;
  onNavigateToFavorites: () => void;
  onScrollToProducts: () => void;
  onNavigateHome: () => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (productId: string) => void;
  hasPayment: boolean;
}
