import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBusinessById, useUpdateBusiness } from "@/hooks/useBusiness";
import { Loader2, Info, Eye } from "lucide-react";
import AboutEditor from "./AboutEditor";

interface DashboardAboutPageProps {
  businessId?: string;
}

const DashboardAboutPage = ({ businessId }: DashboardAboutPageProps) => {
  const { data: business, isLoading } = useBusinessById(businessId);
  const updateBusiness = useUpdateBusiness();

  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [bodyAlign, setBodyAlign] = useState<"center" | "right" | "left">("center");

  useEffect(() => {
    if (business) {
      setTitle(((business as any).about_page_title as string) || "");
      setBody(((business as any).about_page_body as string) || "");
      setContact(((business as any).about_page_contact as string) || "");
      setBodyAlign(
        ((business as any).about_page_body_align as string) === "right"
          ? "right"
          : ((business as any).about_page_body_align as string) === "left"
          ? "left"
          : "center"
      );
    }
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    setIsSaving(true);
    try {
      await updateBusiness.mutateAsync({
        id: businessId,
        about_page_title: title || null,
        about_page_body: body || null,
        about_page_contact: contact || null,
        about_page_body_align: bodyAlign,
      } as any);
    } finally {
      setIsSaving(false);
    }
  };

  if (!businessId) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          לא נמצא עסק פעיל. נא לוודא שסיימת את תהליך ההרשמה.
        </p>
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

  const displayTitle = title.trim() || `אודות ${business?.name || ""}`;
  const hasContact = Boolean(contact.trim() || business?.phone || business?.email);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Info className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">אודות</h1>
          <p className="text-sm text-muted-foreground">
            נהל את טקסט האודות שמופיע בחנות, וגם את דף האודות המלא עם פרטי יצירת קשר.
          </p>
        </div>
      </div>

      {/* About text for storefront (business.about_text) */}
      {/* {business && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-4">
          <h2 className="font-semibold text-lg text-foreground">טקסט אודות לחנות</h2>
          <p className="text-sm text-muted-foreground">
            טקסט זה מופיע בחנות (למשל מתחת למוצרים ובקמפיינים). אפשר להקליט, לכתוב קצר, והמערכת תיצור עבורך טקסט מקצועי.
          </p>
          <AboutEditor
            businessId={business.id}
            businessName={business.name}
            businessCategory={(business as any).business_category as string | undefined}
            currentAboutText={(business as any).about_text as string | undefined}
            onSave={() => {
              // הטקסט נשמר ישירות ב-DB; דף זה ישתמש בערך המעודכן ברענון הבא
            }}
          />
        </div>
      )} */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-stretch">
        {/* טופס עריכה של דף האודות הייעודי */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col space-y-4 min-w-0"
        >
          <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-4 flex-1">
            <div className="space-y-2">
              <Label htmlFor="aboutTitle">כותרת הדף</Label>
              <Input
                id="aboutTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`אודות ${business?.name || ""}`}
              />
              {/* <p className="text-xs text-muted-foreground">
                כותרת גדולה שתופיע בראש דף האודות.
              </p> */}
            </div>

            <div className="space-y-2">
              <Label>יישור טקסט כללי</Label>
              <div className="inline-flex rounded-full border border-border bg-muted/40 p-1">
              <button
                  type="button"
                  onClick={() => setBodyAlign("right")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    bodyAlign === "right"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  מיושר לימין
                </button>
                <button
                  type="button"
                  onClick={() => setBodyAlign("center")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    bodyAlign === "center"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ממורכז
                </button>
                <button
                  type="button"
                  onClick={() => setBodyAlign("left")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    bodyAlign === "left"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  מיושר לשמאל
                </button>
                
              </div>
              {/* <p className="text-xs text-muted-foreground">
                קבע אם הטקסט יוצג ממורכז (ברירת מחדל) או מיושר לימין.
              </p> */}
            </div>

            <div className="space-y-2">
              {/* <Label>טקסט כללי (יופיע בדף האודות)</Label> */}
              <AboutEditor
                businessId={business.id}
                businessName={business.name}
                businessCategory={(business as any).business_category as string | undefined}
                currentAboutText={body}
                disableInternalSave
                onSave={(aboutText) => {
                  setBody(aboutText);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aboutContact">פרטי יצירת קשר</Label>
              <Textarea
                id="aboutContact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={
                  "לדוגמה:\n📍 כתובת: רחוב Example 10, תל אביב\n📞 טלפון נוסף: 03-0000000\n✉️ מייל: info@example.com"
                }
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                יוצג בדף האודות כבלוק נפרד של פרטי יצירת קשר.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full gap-2"
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            שמור דף אודות
          </Button>
        </form>

        {/* תצוגה מקדימה */}
        <div className="min-w-0">
          <div className="bg-muted/30 rounded-xl border border-border overflow-hidden shadow-sm h-full min-h-[480px] flex flex-col">
            <div className="p-4 space-y-4 flex-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    תצוגה מקדימה
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <Info className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-bold text-foreground text-center">
                  {displayTitle}
                </h2>
              </div>

              {body.trim() ? (
                <div className="bg-background/60 rounded-lg border border-border/60 p-3">
                  <p
                    className={`text-sm leading-relaxed text-muted-foreground whitespace-pre-line ${
                      bodyAlign === "right" ? "text-right" : bodyAlign === "left" ? "text-left" : "text-center"
                    }`}
                  >
                    {body}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-3">
                  <p className="text-xs text-muted-foreground/80 text-center">
                    הטקסט הכללי יופיע כאן
                  </p>
                </div>
              )}

              {hasContact && (
                <section className="bg-card rounded-lg border border-border p-3 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    פרטי יצירת קשר
                  </h3>
                  {contact.trim() && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line text-right">
                      {contact}
                    </p>
                  )}
                  {(business?.phone || business?.email) && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {business?.phone && <p dir="ltr">{business.phone}</p>}
                      {business?.email && <p dir="ltr">{business.email}</p>}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAboutPage;

