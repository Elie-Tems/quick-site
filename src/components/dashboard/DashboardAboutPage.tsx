import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBusinessById, useUpdateBusiness } from "@/hooks/useBusiness";
import { Loader2, Info, Eye, EyeOff } from "lucide-react";
import AboutEditor from "./AboutEditor";

interface DashboardAboutPageProps {
  businessId?: string;
}

const DashboardAboutPage = ({ businessId }: DashboardAboutPageProps) => {
  const { data: business, isLoading } = useBusinessById(businessId);
  const updateBusiness = useUpdateBusiness();

  const [isSaving, setIsSaving] = useState(false);
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (business) {
      setBody(((business as any).about_page_body as string) || "");
      setContact(((business as any).about_page_contact as string) || "");
    }
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setIsSaving(true);
    try {
      // The page title is derived automatically - one less thing for the merchant.
      await updateBusiness.mutateAsync({
        id: businessId,
        about_page_title: `אודות ${business?.name || ""}`.trim(),
        about_page_body: body || null,
        about_page_contact: contact || null,
      } as any);
    } finally {
      setIsSaving(false);
    }
  };

  if (!businessId) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">לא נמצא עסק פעיל. נא לוודא שסיימת את תהליך ההרשמה.</p>
      </div>
    );
  }

  if (isLoading && !business) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>טוען את פרטי האודות...</span>
      </div>
    );
  }

  const displayTitle = `אודות ${business?.name || ""}`.trim();
  const hasContact = Boolean(contact.trim() || business?.phone || business?.email);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Info className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">אודות</h1>
          <p className="text-sm text-muted-foreground">ספרו על העסק - נעזור לכם לנסח טקסט מקצועי שיופיע בדף האודות.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-card rounded-2xl border border-border p-4 space-y-5">
          <AboutEditor
            businessId={business.id}
            businessName={business.name}
            businessCategory={(business as any).business_category as string | undefined}
            currentAboutText={body}
            disableInternalSave
            onSave={(aboutText) => setBody(aboutText)}
          />

          <div className="space-y-2 pt-4 border-t border-border">
            <Label htmlFor="aboutContact">פרטי יצירת קשר</Label>
            <Textarea
              id="aboutContact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={"📍 כתובת: ...\n📞 טלפון נוסף: ...\n✉️ מייל: ..."}
              rows={4}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="button" variant="outline" onClick={() => setShowPreview((v) => !v)} className="gap-2">
            {showPreview ? <><EyeOff className="h-4 w-4" /> הסתר תצוגה מקדימה</> : <><Eye className="h-4 w-4" /> הצג תצוגה מקדימה</>}
          </Button>
          <Button type="submit" size="lg" className="flex-1 gap-2" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            שמור דף אודות
          </Button>
        </div>
      </form>

      {/* Preview - only when toggled on */}
      {showPreview && (
        <div className="bg-muted/30 rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-center gap-1.5">
            <Info className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold text-foreground text-center">{displayTitle}</h2>
          </div>

          {body.trim() ? (
            <div className="bg-background/60 rounded-lg border border-border/60 p-3">
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line text-center">{body}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 p-3">
              <p className="text-xs text-muted-foreground/80 text-center">הטקסט יופיע כאן</p>
            </div>
          )}

          {hasContact && (
            <section className="bg-card rounded-lg border border-border p-3 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">פרטי יצירת קשר</h3>
              {contact.trim() && <p className="text-xs text-muted-foreground whitespace-pre-line text-right">{contact}</p>}
              {(business?.phone || business?.email) && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {business?.phone && <p dir="ltr">{business.phone}</p>}
                  {business?.email && <p dir="ltr">{business.email}</p>}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardAboutPage;
