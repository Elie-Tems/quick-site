import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Flame, X, Loader2, BedDouble, Maximize, Building2, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { useListings, useSubmitLead, type Listing } from "@/hooks/useListings";

const CATS = [
  { key: "all", label: "הכל" },
  { key: "sale", label: "מכירה" },
  { key: "rent", label: "השכרה" },
  { key: "commercial", label: "מסחרי" },
];

const CAT_LABELS: Record<string, string> = { sale: "מכירה", rent: "השכרה", commercial: "מסחרי" };

function fmtPrice(l: Listing) {
  if (l.price == null) return null;
  return `₪${l.price.toLocaleString()}${l.price_period === "month" ? " / חודש" : ""}`;
}

function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 10;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-muted text-muted-foreground text-xs">
      {children}
    </span>
  );
}

function LeadForm({ listing, businessId, businessPhone, onClose }: {
  listing: Listing;
  businessId: string;
  businessPhone?: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const submitLead = useSubmitLead();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    if (!isValidPhone(phone)) { toast.error("מספר טלפון לא תקין"); return; }
    try {
      await submitLead.mutateAsync({
        businessId,
        name: name.trim(),
        phone: phone.trim(),
        title: listing.title,
        value: listing.price ?? undefined,
        details: { listingId: listing.id, city: listing.city, category: listing.category },
      });
      toast.success("הפרטים נשלחו - ניצור איתך קשר בקרוב!");
      onClose();
    } catch (err) {
      toast.error("שליחה נכשלה - נסה שוב");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" dir="rtl">
      <p className="text-sm font-semibold text-foreground">השאר פרטים ונחזור אליך</p>
      <input
        value={name} onChange={(e) => setName(e.target.value)}
        placeholder="שם מלא"
        required
        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <input
        value={phone} onChange={(e) => setPhone(e.target.value)}
        placeholder="טלפון"
        type="tel"
        required
        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        type="submit"
        disabled={submitLead.isPending || !name.trim() || !phone.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {submitLead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        שלח פרטים
      </button>
      {businessPhone && (
        <a href={`tel:${businessPhone}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-foreground hover:bg-muted transition-colors">
          <Phone className="w-4 h-4" /> התקשר עכשיו
        </a>
      )}
    </form>
  );
}

const ListingsBoard = ({ businessId, businessPhone }: {
  businessId: string;
  businessPhone?: string;
}) => {
  const [cat, setCat] = useState("all");
  const { data: listings = [], isLoading } = useListings(businessId, { category: cat });
  const [open, setOpen] = useState<Listing | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const openImages = ((open?.media?.images ?? []).map((s) => s?.trim()).filter(Boolean)) as string[];

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATS.map((c) => (
          <button key={c.key} onClick={() => setCat(c.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${cat === c.key ? "bg-primary text-white border-primary" : "border-border text-foreground hover:border-primary/40"}`}>
            {c.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      )}
      {!isLoading && listings.length === 0 && (
        <div className="text-center py-16">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">אין נכסים זמינים כרגע.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {listings.map((l, i) => {
          const img = l.media?.images?.[0]?.trim() || undefined;
          const rooms = (l.attrs as any)?.rooms;
          const size  = (l.attrs as any)?.size;
          const price = fmtPrice(l);

          return (
            <motion.button key={l.id} onClick={() => { setOpen(l); setGalleryIdx(0); }} className="text-right"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="rounded-2xl overflow-hidden border border-border bg-card group h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <div className="relative aspect-[16/11] overflow-hidden bg-muted">
                  {img
                    ? <img src={img} alt={l.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    : <div className="w-full h-full flex items-center justify-center"><Building2 className="w-12 h-12 text-muted-foreground/30" /></div>
                  }
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {l.is_hot && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-bold shadow-lg">
                      <Flame className="w-3.5 h-3.5" /> מציאה
                    </span>
                  )}
                  {l.category && CAT_LABELS[l.category] && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs">
                      {CAT_LABELS[l.category]}
                    </span>
                  )}
                  {price && (
                    <div className="absolute bottom-3 right-3 text-white font-display font-bold text-lg drop-shadow">
                      {price}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-display font-bold text-foreground mb-2 leading-snug">{l.title}</div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    {l.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {l.city}</span>}
                    {rooms != null && rooms > 0 && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {rooms}</span>}
                    {size != null && <span className="flex items-center gap-1"><Maximize className="w-3.5 h-3.5" /> {size} מ״ר</span>}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(null)} />
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-background border border-border">
              <div className="relative h-56">
                {openImages.length > 0
                  ? <img src={openImages[Math.min(galleryIdx, openImages.length - 1)]} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-muted flex items-center justify-center"><Building2 className="w-14 h-14 text-muted-foreground/30" /></div>
                }
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <button onClick={() => setOpen(null)}
                  className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
                {openImages.length > 1 && (
                  <>
                    <button onClick={() => setGalleryIdx((i) => (i - 1 + openImages.length) % openImages.length)}
                      className="absolute top-1/2 -translate-y-1/2 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center">
                      ‹
                    </button>
                    <button onClick={() => setGalleryIdx((i) => (i + 1) % openImages.length)}
                      className="absolute top-1/2 -translate-y-1/2 left-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center">
                      ›
                    </button>
                    <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                      {openImages.map((_, i) => (
                        <button key={i} onClick={() => setGalleryIdx(i)}
                          className={`w-2 h-2 rounded-full transition-colors ${i === galleryIdx ? "bg-white" : "bg-white/40"}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="p-5" dir="rtl">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-foreground">{open.title}</h2>
                    {open.city && (
                      <div className="flex items-center gap-1 text-muted-foreground text-sm mt-0.5">
                        <MapPin className="w-4 h-4" /> {open.city}
                      </div>
                    )}
                  </div>
                  {fmtPrice(open) && (
                    <div className="text-xl font-display font-bold text-primary whitespace-nowrap">{fmtPrice(open)}</div>
                  )}
                </div>

                <div className="flex gap-2 mb-4 flex-wrap">
                  {(open.attrs as any)?.rooms > 0 && <Pill><BedDouble className="w-3.5 h-3.5" /> {(open.attrs as any).rooms} חד'</Pill>}
                  {(open.attrs as any)?.size && <Pill><Maximize className="w-3.5 h-3.5" /> {(open.attrs as any).size} מ״ר</Pill>}
                  {open.category && CAT_LABELS[open.category] && <Pill><Building2 className="w-3.5 h-3.5" /> {CAT_LABELS[open.category]}</Pill>}
                  {open.is_hot && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
                      <Flame className="w-3.5 h-3.5" /> מציאה
                    </span>
                  )}
                </div>

                {open.description && (
                  <p className="text-sm text-foreground/80 leading-relaxed mb-5">{open.description}</p>
                )}

                <LeadForm listing={open} businessId={businessId} businessPhone={businessPhone} onClose={() => setOpen(null)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ListingsBoard;
