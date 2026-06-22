import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import { useStorefront } from "@/hooks/useStorefront";
import StoreFooterV2 from "@/components/storefront-v2/StoreFooterV2";
import FloatingWhatsApp from "@/components/storefront/FloatingWhatsApp";

const StoreAboutPageV2 = () => {
  const { slug } = useParams<{ slug: string }>();
  const { business, isLoading, isError, error } = useStorefront(slug);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !business) {
    const isUnpublished = error instanceof Error && error.message === 'SITE_NOT_PUBLISHED';
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isUnpublished ? 'האתר עדיין לא פורסם' : 'החנות לא נמצאה'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isUnpublished 
              ? 'אתר זה עדיין לא פורסם לציבור.'
              : 'לא הצלחנו למצוא חנות בכתובת הזו.'
            }
          </p>
        </div>
      </div>
    );
  }

  const title = `אודות ${business.name}`;
  const body = business.about_page_body || "";
  const storeSlug = (business.slug as string) || slug || "";

  const goBack = () => {
    navigate(`/store/${storeSlug}/v2`);
  };

  const hasContact = business.phone || business.email;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={body.slice(0, 150)} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" dir="rtl">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
          <div className="container px-4 md:px-6 py-4">
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted text-sm font-medium text-foreground transition-all duration-300 hover:scale-105"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה לחנות
            </button>
          </div>
        </header>

        <main className="container px-4 md:px-6 max-w-4xl py-12 md:py-16">
          {/* Page Title */}
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="h-px w-12 bg-primary" />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                אודותינו
              </h1>
              <div className="h-px w-12 bg-primary" />
            </div>
            <p className="text-lg text-muted-foreground">
              {business.name}
            </p>
          </div>

          {/* About Content */}
          {body && (
            <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-8 md:p-12 shadow-xl mb-12">
              <p className="text-lg md:text-xl leading-relaxed text-foreground whitespace-pre-wrap text-center">
                {body}
              </p>
            </div>
          )}

          {/* Contact Section */}
          {hasContact && (
            <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-8 md:p-12 shadow-xl">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
                יצירת קשר
              </h2>

              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="flex items-center gap-4 p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300 hover:scale-105 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-xs text-muted-foreground mb-1">טלפון</p>
                      <p className="text-lg font-bold text-foreground" dir="ltr">
                        {business.phone}
                      </p>
                    </div>
                  </a>
                )}

                {business.email && (
                  <a
                    href={`mailto:${business.email}`}
                    className="flex items-center gap-4 p-6 rounded-2xl bg-muted/50 hover:bg-muted transition-all duration-300 hover:scale-105 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-xs text-muted-foreground mb-1">אימייל</p>
                      <p className="text-lg font-bold text-foreground" dir="ltr">
                        {business.email}
                      </p>
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!body && !hasContact && (
            <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-12 md:p-16 text-center shadow-xl">
              <p className="text-lg text-muted-foreground">
                אין מידע זמין כרגע
              </p>
            </div>
          )}
        </main>

        <StoreFooterV2 
          businessName={business.name}
          phone={business.phone || undefined}
          email={business.email || undefined}
          storeSlug={storeSlug}
        />

        {business.phone && (business.whatsapp_enabled ?? true) && (
          <FloatingWhatsApp
            phone={business.phone}
            message={(business as any).whatsapp_message || undefined}
            businessName={business.name}
          />
        )}
      </div>
    </>
  );
};

export default StoreAboutPageV2;
