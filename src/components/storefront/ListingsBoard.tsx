import { useState } from "react";
import { MapPin, Flame, X, ArrowLeft, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useListings, useSubmitLead, type Listing } from "@/hooks/useListings";

/**
 * Storefront listings board (real estate / vehicles). Renders active listings
 * with a category filter + hot-deal badge; opening one shows a lead form that
 * submits to the CRM via contacts-capture (no cart). Real replacement for the
 * RealEstateStore mockup. Rendered by StorefrontVertical when the business has
 * the "listings" module.
 */

const CATS = [
  { key: "all", label: "הכל" },
  { key: "sale", label: "מכירה" },
  { key: "rent", label: "השכרה" },
  { key: "commercial", label: "מסחרי" },
];

const ListingsBoard = ({ businessId }: { businessId: string }) => {
  const [cat, setCat] = useState("all");
  const { data: listings = [], isLoading } = useListings(businessId, { category: cat });
  const [open, setOpen] = useState<Listing | null>(null);
  const submit = useSubmitLead();
  const [lead, setLead] = useState({ name: "", phone: "" });

  const sendLead = () => {
    if (!open || !lead.name || !lead.phone) return;
    submit.mutate(
      { businessId, name: lead.name, phone: lead.phone, title: open.title, value: open.price ?? undefined,
        details: { listing_id: open.id, category: open.category } },
      {
        onSuccess: () => { toast.success("פנייתך נשלחה! נחזור אליך בהקדם"); setOpen(null); setLead({ name: "", phone: "" }); },
        onError: () => toast.error("שליחה נכשלה, נסו שוב"),
      },
    );
  };

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-2 mb-6">
        {CATS.map((c) => (
          <button key={c.key} onClick={() => setCat(c.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${cat === c.key ? "bg-primary text-white border-primary" : "border-border text-foreground hover:border-primary/40"}`}>
            {c.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
      {!isLoading && listings.length === 0 && <p className="text-center text-muted-foreground py-10">אין נכסים זמינים כרגע.</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {listings.map((l) => (
          <button key={l.id} onClick={() => setOpen(l)} className="text-right">
            <div className="rounded-2xl overflow-hidden border border-border bg-card group h-full">
              <div className="relative aspect-[16/11] overflow-hidden bg-muted">
                {l.media?.images?.[0] && <img src={l.media.images[0]} alt={l.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                {l.is_hot && <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-bold"><Flame className="w-3.5 h-3.5" /> מציאה</span>}
                {l.price != null && <div className="absolute bottom-3 right-3 text-white font-bold text-lg">₪{l.price.toLocaleString()}{l.price_period === "month" ? " /חודש" : ""}</div>}
              </div>
              <div className="p-4">
                <div className="font-bold text-foreground mb-1">{l.title}</div>
                {l.city && <div className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {l.city}</div>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(null)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-background border border-border p-5">
            <button onClick={() => setOpen(null)} className="absolute top-3 left-3 w-9 h-9 rounded-full bg-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
            {open.media?.images?.[0] && <img src={open.media.images[0]} alt="" className="w-full h-48 object-cover rounded-2xl mb-4" />}
            <h2 className="text-2xl font-bold text-foreground">{open.title}</h2>
            {open.city && <div className="text-muted-foreground text-sm flex items-center gap-1 mb-2"><MapPin className="w-4 h-4" /> {open.city}</div>}
            {open.description && <p className="text-sm text-foreground/80 leading-relaxed mb-4">{open.description}</p>}
            <div className="rounded-2xl border border-border p-4">
              <div className="font-bold text-foreground mb-3">מעוניינים? השאירו פרטים</div>
              <div className="grid sm:grid-cols-2 gap-2 mb-2">
                <Input placeholder="שם מלא" value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} />
                <Input placeholder="טלפון" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
              </div>
              <Button className="w-full" onClick={sendLead} disabled={submit.isPending || !lead.name || !lead.phone}>
                {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>תיאום ביקור <ArrowLeft className="w-4 h-4 mr-1" /></>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ListingsBoard;
