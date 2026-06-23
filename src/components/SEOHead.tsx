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
  title = "סיאנגו - אתר מכירתי לעסק שלך תוך 5 דקות",
  description = "צור אתר מכירתי מקצועי לעסק שלך תוך 5 דקות בלבד. ללא מתכנת, ללא עיצוב, תשלום חודשי נמוך. מושלם לעסקים קטנים ובינוניים בישראל.",
  canonical = "https://quick-site.app/",
  ogImage = "https://quick-site.app/og-image.png",
  ogType = "website",
  noindex = false,
}: SEOHeadProps) => {
  const siteName = "סיאנגו";
  
  // Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": siteName,
    "url": "https://quick-site.app",
    "logo": "https://quick-site.app/favicon.png",
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
    "url": "https://quick-site.app",
    "inLanguage": "he-IL",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://quick-site.app/store/{search_term_string}",
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
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "ILS",
      "lowPrice": "99",
      "highPrice": "299",
      "offerCount": "3"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    }
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
