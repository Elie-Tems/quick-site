import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/contexts/LanguageContext";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  sku?: string;
}

interface StoreSEOProps {
  business: {
    id: string;
    name: string;
    slug?: string | null;
    tagline?: string | null;
    about_text?: string | null;
    phone?: string | null;
    email?: string | null;
    logo_url?: string | null;
    hero_image_url?: string | null;
    business_category?: string | null;
    primary_color?: string | null;
  };
  products: Product[];
  storeUrl: string;
}

const StoreSEO = ({ business, products, storeUrl }: StoreSEOProps) => {
  const { t } = useLanguage();
  const siteName = business.name;
  const pageTitle = t("store.seo.page_title").replace("{business}", siteName);
  const description = business.tagline || business.about_text?.slice(0, 160) || t("store.seo.default_description").replace("{business}", siteName);
  const ogImage = business.hero_image_url || business.logo_url || "https://siango.app/og-image.png";
  
  // Category mapping for Schema.org
  const categoryMap: Record<string, string> = {
    food: "FoodEstablishment",
    fashion: "ClothingStore",
    cosmetics: "BeautySalon",
    electronics: "ElectronicsStore",
    home: "HomeGoodsStore",
    toys: "ToyStore",
    jewelry: "JewelryStore",
    art: "ArtGallery",
    sports: "SportingGoodsStore",
    pets: "PetStore",
    books: "BookStore",
    other: "Store",
  };

  const schemaType = categoryMap[business.business_category || "other"] || "Store";

  // LocalBusiness Schema
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": storeUrl,
    "name": siteName,
    "description": description,
    "url": storeUrl,
    "image": ogImage,
    ...(business.logo_url && { "logo": business.logo_url }),
    ...(business.phone && { 
      "telephone": business.phone,
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": business.phone,
        "contactType": "customer service",
        "availableLanguage": "Hebrew"
      }
    }),
    ...(business.email && { "email": business.email }),
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IL"
    },
    "priceRange": "₪₪",
    "currenciesAccepted": "ILS",
    "paymentAccepted": "Cash, Credit Card",
    "areaServed": {
      "@type": "Country",
      "name": "Israel"
    }
  };

  // WebSite Schema for the store
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": siteName,
    "url": storeUrl,
    "inLanguage": "he-IL",
    "publisher": {
      "@type": "Organization",
      "name": siteName,
      ...(business.logo_url && { "logo": business.logo_url })
    }
  };

  // Product List Schema (ItemList)
  const productListSchema = products.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": t("store.seo.product_list_name").replace("{business}", siteName),
    "numberOfItems": products.length,
    "itemListElement": products.slice(0, 10).map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "@id": `${storeUrl}#product-${product.id}`,
        "name": product.name,
        ...(product.description && { "description": product.description }),
        ...(product.imageUrl && { "image": product.imageUrl }),
        ...(product.sku && { "sku": product.sku }),
        "offers": {
          "@type": "Offer",
          "url": storeUrl,
          "priceCurrency": "ILS",
          "price": product.price,
          "availability": "https://schema.org/InStock",
          "seller": {
            "@type": "Organization",
            "name": siteName
          }
        }
      }
    }))
  } : null;

  const fallbackImage = ogImage;

  // NOTE: shipping cost and return policy are intentionally NOT emitted here.
  // They were previously hardcoded (free shipping + 14-day free returns) for
  // every product of every store, which is fabricated per-merchant data -
  // a Google Merchant policy risk and against the project's no-fake-data rule.
  // Re-add as OfferShippingDetails / MerchantReturnPolicy only when the store
  // actually configures real shipping and return terms.

  // Individual Product Schemas (for first 5 products)
  const productSchemas = products.slice(0, 5).map(product => ({
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${storeUrl}#product-${product.id}`,
    "name": product.name,
    ...(product.description && { "description": product.description }),
    "image": product.imageUrl || fallbackImage,
    ...(product.sku && { "sku": product.sku }),
    "brand": {
      "@type": "Brand",
      "name": siteName
    },
    "offers": {
      "@type": "Offer",
      "url": storeUrl,
      "priceCurrency": "ILS",
      "price": product.price,
      ...(product.originalPrice && {
        "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }),
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": siteName
      }
    }
  }));

  // BreadcrumbList Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": t("store.seo.brand_name"),
        "item": "https://siango.app"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": siteName,
        "item": storeUrl
      }
    ]
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={description} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={storeUrl} />
      
      {/* Language and Direction */}
      <html lang="he" dir="rtl" />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={storeUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="he_IL" />
      <meta property="og:site_name" content={siteName} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={storeUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Additional Meta Tags */}
      <meta name="author" content={siteName} />
      <meta name="geo.region" content="IL" />
      <meta name="geo.placename" content="Israel" />
      <meta name="content-language" content="he" />
      
      {/* Theme Color */}
      {business.primary_color && (
        <meta name="theme-color" content={business.primary_color} />
      )}
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(localBusinessSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      {productListSchema && (
        <script type="application/ld+json">
          {JSON.stringify(productListSchema)}
        </script>
      )}
      {productSchemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default StoreSEO;
