import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Phone, Mail, MapPin } from "lucide-react";
import { useStorefront } from "@/hooks/useStorefront";
import StoreFooter from "@/components/storefront/StoreFooter";
import StoreHeader from "@/components/storefront/StoreHeader";
import { BusinessCategory } from "@/lib/categoryConfig";
import FloatingWhatsApp from "@/components/storefront/FloatingWhatsApp";

const StoreAboutPage = ({ slugOverride }: { slugOverride?: string } = {}) => {
  const params = useParams<{ slug: string }>();
  const slug = slugOverride ?? params.slug;
  const { business, categories, isLoading, isError, error } = useStorefront(slug);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !business) {
    const isUnpublished = error instanceof Error && error.message === 'SITE_NOT_PUBLISHED';
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isUnpublished ? '׳”׳׳×׳¨ ׳¢׳“׳™׳™׳ ׳׳ ׳₪׳•׳¨׳¡׳' : '׳”׳—׳ ׳•׳× ׳׳ ׳ ׳׳¦׳׳”'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isUnpublished 
              ? '׳׳×׳¨ ׳–׳” ׳¢׳“׳™׳™׳ ׳׳ ׳₪׳•׳¨׳¡׳ ׳׳¦׳™׳‘׳•׳¨.'
              : '׳׳ ׳”׳¦׳׳—׳ ׳• ׳׳׳¦׳•׳ ׳—׳ ׳•׳× ׳‘׳›׳×׳•׳‘׳× ׳”׳–׳•.'
            }
          </p>
        </div>
      </div>
    );
  }

  const title =
    ((business as any).about_page_title as string) || `׳׳•׳“׳•׳× ${business.name}`;
  const body =
    ((business as any).about_page_body as string) ||
    (business.about_text as string) ||
    "";
  const contactText = ((business as any).about_page_contact as string) || "";
  const bodyAlign =
    ((business as any).about_page_body_align as string) === "right"
      ? "right"
      : "center";

  const storeSlug = (business.slug as string) || slug || "";

  const goToStoreHome = () => { if (storeSlug) navigate(`/store/${storeSlug}`); };
  const goToStoreProducts = () => { if (storeSlug) navigate(`/store/${storeSlug}#products`); };
  const handleSelectCategory = (_categoryId: string | null) => { if (storeSlug) navigate(`/store/${storeSlug}#products`); };

  const hasContact = contactText || business.phone || business.email || (business as any).address;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={body.slice(0, 150)} />
      </Helmet>

      <StoreHeader
        businessName={business.name}
        logoUrl={business.logo_url || undefined}
        phone={business.phone || undefined}
        showMarqueeBar={(business as any).marquee_bar_enabled ?? true}
        whatsappEnabled={(business as any).whatsapp_enabled ?? false}
        cartItemsCount={0}
        favoritesCount={0}
        promoText={(business as any).promo_text || undefined}
        primaryColor={(business as any).primary_color || undefined}
        businessCategory={(business as any).business_category as BusinessCategory}
        storeCategories={categories.map((c) => ({ id: c.id, name: c.name }))}
        selectedCategoryId={null}
        onSelectCategory={handleSelectCategory}
        onScrollToAbout={() => {}}
        onNavigateHome={goToStoreHome}
        onScrollToProducts={goToStoreProducts}
        onNavigateToFavorites={goToStoreHome}
        onNavigateToCart={goToStoreHome}
      />

      <main dir="rtl" className="min-h-screen bg-background pb-20">

        {/* ג”€ג”€ Page Header ג”€ג”€ */}
        <div className="border-b border-foreground/10">
          <div className="container px-4 md:px-6 py-10 md:py-14">
            <div className="flex items-center gap-3 justify-center">
              <div className="h-px flex-1 max-w-[80px] bg-foreground/10" />
              <h1 className="text-sm font-bold tracking-[0.25em] uppercase text-foreground text-center">
                {title}
              </h1>
              <div className="h-px flex-1 max-w-[80px] bg-foreground/10" />
            </div>
          </div>
        </div>

        <div className="container px-4 md:px-6 max-w-2xl py-12 md:py-16 space-y-12">

          {/* ג”€ג”€ Body text ג”€ג”€ */}
          {body && (
            <section>
              <p
                className={`text-base md:text-lg leading-relaxed text-muted-foreground whitespace-pre-line ${
                  bodyAlign === "right" ? "text-right" : "text-center"
                }`}
              >
                {body}
              </p>
            </section>
          )}

          {/* ג”€ג”€ Contact ג”€ג”€ */}
          {hasContact && (
            <section className="border-t border-foreground/10 pt-10">
              {/* Section label */}
              <div className="flex items-center gap-3 mb-8">
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground">
                  ׳™׳¦׳™׳¨׳× ׳§׳©׳¨
                </span>
                <div className="h-px flex-1 bg-foreground/10" />
              </div>

              <div className="space-y-4">
                {contactText && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed text-right">
                    {contactText}
                  </p>
                )}

                <div className="flex flex-col gap-3">
                  {business.phone && (
                    <a
                      href={`tel:${business.phone}`}
                      dir="ltr"
                      className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors w-fit"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {business.phone}
                    </a>
                  )}
                  {business.email && (
                    <a
                      href={`mailto:${business.email}`}
                      dir="ltr"
                      className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors w-fit"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {business.email}
                    </a>
                  )}
                  {(business as any).address && (
                    <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase text-muted-foreground w-fit">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{(business as any).address}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>
      </main>

      <StoreFooter
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
    </>
  );
};

export default StoreAboutPage;
