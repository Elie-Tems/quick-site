import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2 } from "lucide-react";
import { useStorefront } from "@/hooks/useStorefront";
import {
  buildDefaultDocument,
  injectBusinessDetails,
  LEGAL_DOC_TITLES,
  type LegalDocType,
  type LegalSection,
} from "@/lib/legalTemplates";

/**
 * Public legal page for a storefront (terms or privacy). Renders the merchant's
 * edited sections, or the default Hebrew template (with business details filled
 * in) when nothing has been saved yet. Always shows the locked disclaimer.
 */
const StoreLegalPage = ({ docType, slugOverride }: { docType: LegalDocType; slugOverride?: string }) => {
  const params = useParams<{ slug: string }>();
  const slug = slugOverride ?? params.slug;
  const { business, isLoading, isError } = useStorefront(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        החנות לא נמצאה
      </div>
    );
  }

  const details = {
    name: business.name,
    email: (business as any).email,
    phone: (business as any).phone,
    address: (business as any).address,
  };

  const stored = (docType === "terms"
    ? (business as any).terms_sections
    : (business as any).privacy_sections) as LegalSection[] | null | undefined;

  const sections: LegalSection[] =
    stored && stored.length > 0
      ? stored
      : buildDefaultDocument(docType).map((s) => ({ ...s, body: injectBusinessDetails(s.body, details) }));

  const docTitle = LEGAL_DOC_TITLES[docType];
  const storeHome = slugOverride ? "/" : `/${business.slug}`;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>{`${docTitle} | ${business.name}`}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <header className="border-b border-border">
        <div className="container max-w-3xl flex items-center justify-between h-16">
          <h1 className="text-lg font-bold text-foreground">{business.name}</h1>
          <Link to={storeHome} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            חזרה לחנות <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="container max-w-3xl py-10">
        <h2 className="text-3xl font-bold text-foreground mb-8">{docTitle}</h2>

        <div className="space-y-7">
          {sections.map((section) => (
            <section key={section.id}>
              <h3
                className={`text-lg font-semibold mb-2 ${
                  section.locked ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                }`}
              >
                {section.heading}
              </h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StoreLegalPage;
