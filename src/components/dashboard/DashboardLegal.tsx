import { useState, useMemo } from "react";
import { ScrollText, ShieldCheck, Loader2, Eye, CheckCircle2 } from "lucide-react";
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
  legal_approved_at?: string | null;
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
  const [approvedAt, setApprovedAt] = useState<string | null>(business?.legal_approved_at ?? null);
  const [isApproving, setIsApproving] = useState(false);

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

  // Approve = save the current docs AND record explicit merchant approval. The
  // store cannot be published (go live) until this is set - enforced server-side
  // in finalize-publish. Editing/saving stays open, so building isn't blocked.
  const handleApprove = async () => {
    if (!business?.id) return;
    setIsApproving(true);
    const now = new Date().toISOString();
    try {
      await updateBusiness.mutateAsync({
        id: business.id,
        terms_sections: terms,
        privacy_sections: privacy,
        legal_approved_at: now,
      } as any);
      setApprovedAt(now);
      toast.success("המסמכים אושרו - האתר מוכן לפרסום");
    } catch (err) {
      console.error("approve legal docs failed:", err);
      toast.error("שגיאה באישור המסמכים");
    } finally {
      setIsApproving(false);
    }
  };

  const approvedDateLabel = approvedAt
    ? new Date(approvedAt).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })
    : null;

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
        ⚖️ המסמכים מגיעים כתבנית מוכנה. <strong>מומלץ להיוועץ בעורך דין</strong> ולהתאים אותם לעסק שלכם - האחריות
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
        <Button onClick={handleSave} variant="outline" size="lg" className="gap-2" disabled={isSaving || !business?.id}>
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

      {/* Approval gate: required before the store can go live. */}
      <div className="mt-8 p-5 rounded-xl border border-border bg-card">
        {approvedAt ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">המסמכים אושרו ✓</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                אושרו בתאריך {approvedDateLabel}. האתר מאושר לפרסום. אם תערכו את המסמכים - מומלץ לאשר שוב.
              </p>
              <Button onClick={handleApprove} variant="ghost" size="sm" className="gap-2 mt-2 text-primary" disabled={isApproving || !business?.id}>
                {isApproving && <Loader2 className="h-4 w-4 animate-spin" />}
                אישור מחדש לאחר עריכה
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-foreground mb-1">אישור לפני פרסום</p>
            <p className="text-sm text-muted-foreground mb-4">
              כדי שהאתר יעלה לאוויר צריך לאשר שקראת את התקנון ומדיניות הפרטיות. האחריות המשפטית על תוכן המסמכים היא של בעל/ת העסק.
              <strong className="text-foreground"> זה לא מעכב את בניית האתר</strong> - רק את הפרסום.
            </p>
            <Button onClick={handleApprove} size="lg" className="gap-2" disabled={isApproving || !business?.id}>
              {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              קראתי ואני מאשר/ת את המסמכים
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardLegal;
