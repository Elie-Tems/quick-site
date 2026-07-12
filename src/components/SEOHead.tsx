import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  noindex?: boolean;
}

const SEOHead = ({
  // Broadened beyond "אתר מכירתי" to the terms Israelis actually search for
  // (בניית אתר לעסק / חנות אונליין / אתר מכירות), covering the verticals - the
  // homepage uses these defaults; other pages pass their own.
  title = "בניית אתר לעסק וחנות אונליין תוך 5 דקות | סיאנגו",
  description = "בונים אתר מקצועי לעסק תוך 5 דקות - חנות אונליין, אתר מכירות, אתר לנותני שירות וקביעת תורים או אתר לעמותה. בלי מתכנת ובלי עיצוב, החל מ-69 ₪ + מע"מ לחודש. מותאם לעסקים בישראל.",
  canonical = "https://siango.app/",
  ogImage = "https://siango.app/og-image.png",
  ogType = "website",
  noindex = false,
}: SEOHeadProps) => {
  const siteName = "סיאנגו";
  const keywords = "בניית אתר לעסק, חנות אונליין, אתר מכירות, בניית אתרים, אתר לעסק קטן, אתר אינטרנט לעסק, חנות וירטואלית, אתר לנותני שירות, קביעת תורים אונליין, אתר לעמותה, בניית אתר בזול, אתר לעסק ללא מתכנת";
  
  // Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": siteName,
    "url": "https://siango.app",
    "logo": "https://siango.app/favicon.png",
    "description": description,
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IL"
    },
    "sameAs": []
  };

  // WebSite Schema for sitelinks search box
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": siteName,
    "url": "https://siango.app",
    "inLanguage": "he-IL",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://siango.app/store/{search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  // SoftwareApplication Schema
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": siteName,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    // Single real price: 69 ILS/month, VAT NOT included (added on top, per Israeli
    // Consumer Protection Law disclosure). The previous 99/199/299 tiers were never
    // real. Extra features (e.g. CRM) are priced separately, not part of this offer.
    "offers": {
      "@type": "Offer",
      "priceCurrency": "ILS",
      "price": "69",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "69",
        "priceCurrency": "ILS",
        "valueAddedTaxIncluded": false
      }
    }
    // aggregateRating removed: it was a fabricated 4.8/150 rating. Google penalizes
    // fake review markup, and the project rule forbids invented numbers. Re-add only
    // when computed from real, aggregated customer reviews.
  };

  // FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "כמה זמן לוקח לבנות אתר מכירות?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "עם סיאנגו ניתן לבנות אתר מכירות מלא תוך 5 דקות בלבד. פשוט מזינים את פרטי העסק, מעלים מוצרים, והאתר מוכן."
        }
      },
      {
        "@type": "Question",
        "name": "האם צריך ידע בתכנות או עיצוב?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "לא, לא צריך שום ידע מקדים. הממשק אינטואיטיבי ופשוט, וכל אחד יכול לבנות אתר מקצועי בקלות."
        }
      },
      {
        "@type": "Question",
        "name": "כמה עולה לבנות אתר מכירות?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "התוכניות מתחילות מ-99 ש״ח לחודש בלבד, כולל אתר מלא, עדכונים ללא הגבלה, ותמיכה."
        }
      },
      {
        "@type": "Question",
        "name": "האם האתר מותאם למובייל?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "כן, כל האתרים שנבנים בסיאנגו מותאמים אוטומטית לכל גודל מסך - מובייל, טאבלט ומחשב."
        }
      }
    ]
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />
      
      {/* Language and Direction */}
      <html lang="he" dir="rtl" />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="he_IL" />
      <meta property="og:site_name" content={siteName} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Additional Meta Tags for SEO */}
      <meta name="author" content={siteName} />
      <meta name="publisher" content={siteName} />
      <meta name="copyright" content={siteName} />
      <meta name="geo.region" content="IL" />
      <meta name="geo.placename" content="Israel" />
      <meta name="content-language" content="he" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(softwareSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
    </Helmet>
  );
};

export default SEOHead;
