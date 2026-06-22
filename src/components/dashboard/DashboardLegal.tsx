import { useState, useMemo } from "react";
import { ScrollText, ShieldCheck, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUpdateBusiness } from "@/hooks/useBusiness";
import LegalDocEditor from "@/components/dashboard/LegalDocEditor";
import {
  buildDefaultDocument,
  injectBusinessDetails,
  type LegalSection,
  type LegalDocType,
} from "@/lib/legalTemplates";

interface BusinessLike {
  id?: string;
  slug?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  terms_sections?: LegalSection[] | null;
  privacy_sections?: LegalSection[] | null;
}

const DashboardLegal = ({ business }: { business?: BusinessLike }) => {
  const updateBusiness = useUpdateBusiness();
  const [activeDoc, setActiveDoc] = useState<LegalDocType>("terms");
  const [isSaving, setIsSaving] = useState(false);

  const details = useMemo(
    () => ({ name: business?.name, email: business?.email, phone: business?.phone, address: business?.address }),
    [business?.name, business?.email, business?.phone, business?.address],
  );

  // Seed each document from the stored sections, or from the Hebrew template
  // with the business details already filled in (so the merchant never sees raw
  // {{placeholders}}).
  const seed = (type: LegalDocType, stored?: LegalSection[] | null): LegalSection[] => {
    if (stored && stored.length > 0) return stored;
    return buildDefaultDocument(type).map((s) => ({
      ...s,
      body: injectBusinessDetails(s.body, details),
    }));
  };

  const [terms, setTerms] = useState<LegalSection[]>(() => seed("terms", business?.terms_sections));
  const [privacy, setPrivacy] = useState<LegalSection[]>(() => seed("privacy", business?.privacy_sections));

  const sections = activeDoc === "terms" ? terms : privacy;
  const setSections = activeDoc === "terms" ? setTerms : setPrivacy;

  const handleSave = async () => {
    if (!business?.id) return;
    setIsSaving(true);
    try {
      await updateBusiness.mutateAsync({
        id: business.id,
        terms_sections: terms,
        privacy_sections: privacy,
      } as any);
      toast.success("המסמכים המשפטיים נשמרו");
    } catch (err) {
      console.error("save legal docs failed:", err);
      toast.error("שגיאה בשמירת המסמכים");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: { id: LegalDocType; label: string; icon: typeof ScrollText }[] = [
    { id: "terms", label: "תקנון", icon: ScrollText },
    { id: "privacy", label: "מדיניות פרטיות", icon: ShieldCheck },
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">מסמכים משפטיים</h1>
          <p className="text-sm text-muted-foreground">תקנון ומדיניות פרטיות לאתר שלכם</p>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-foreground mb-6">
        ⚖️ המסמכים מגיעים כתבנית מוכנה. <strong>מומלץ להיוועץ בעורך דין</strong> ולהתאים אותם לעסק שלכם — האחריות
        המשפטית על בעל האתר.
      </div>

      {/* Doc tabs */}
      <div className="flex gap-2 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveDoc(tab.id)}
            className={`flex items-center gap-2 px-4 h-11 rounded-xl text-sm font-medium transition-colors ${
              activeDoc === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <LegalDocEditor sections={sections} onChange={setSections} />

      <div className="flex items-center gap-3 mt-6 flex-wrap">
        <Button onClick={handleSave} size="lg" className="gap-2" disabled={isSaving || !business?.id}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          שמירת המסמכים
        </Button>
        {business?.slug && (
          <a
            href={`/store/${business.slug}/${activeDoc}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Eye className="w-4 h-4" />
            צפייה בדף בחנות
          </a>
        )}
      </div>
    </div>
  );
};

export default DashboardLegal;
