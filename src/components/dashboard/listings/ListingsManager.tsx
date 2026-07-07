import { useState } from "react";
import { Plus, Flame, MapPin, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListings, useUpsertListing } from "@/hooks/useListings";

/**
 * Merchant-side listings management (real estate / vehicles). Feature-gated on
 * the "listings" module. Leads come in via the CRM LeadsBoard. Needs the
 * listings migration applied.
 */
const CATS = [
  { key: "sale", label: "מכירה" },
  { key: "rent", label: "השכרה" },
  { key: "commercial", label: "מסחרי" },
];

const ListingsManager = ({ businessId }: { businessId: string }) => {
  const { data: listings = [], isLoading } = useListings(businessId);
  const upsert = useUpsertListing();
  const [draft, setDraft] = useState({ title: "", price: "", city: "", category: "sale", is_hot: false });

  const add = () => {
    if (!draft.title.trim()) return;
    upsert.mutate({
      business_id: businessId, kind: "property", title: draft.title.trim(),
      price: draft.price ? Number(draft.price) : null, city: draft.city || null,
      category: draft.category, is_hot: draft.is_hot,
    }, { onSuccess: () => setDraft({ title: "", price: "", city: "", category: "sale", is_hot: false }) });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> הנכסים שלי</h3>

      <div className="space-y-2">
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
        {listings.map((l) => (
          <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate flex items-center gap-1.5">
                {l.title} {l.is_hot && <Flame className="w-3.5 h-3.5 text-rose-500" />}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {l.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {l.city}</span>}
                <span>{CATS.find((c) => c.key === l.category)?.label ?? l.category}</span>
              </div>
            </div>
            <div className="font-bold text-primary whitespace-nowrap">{l.price ? `₪${l.price.toLocaleString()}` : "-"}</div>
          </div>
        ))}
        {!isLoading && listings.length === 0 && <p className="text-sm text-muted-foreground">עדיין אין נכסים - הוסיפו את הראשון.</p>}
      </div>

      <div className="flex flex-wrap gap-2 items-end p-3 rounded-xl border border-border">
        <Input placeholder="כותרת (דירת 4 חד')" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="max-w-[200px]" />
        <Input placeholder="מחיר" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className="max-w-[110px]" />
        <Input placeholder="עיר" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} className="max-w-[120px]" />
        <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="h-10 rounded-md border border-border bg-background px-2 text-sm">
          {CATS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <button onClick={() => setDraft({ ...draft, is_hot: !draft.is_hot })}
          className={`h-10 px-3 rounded-md border text-sm flex items-center gap-1 ${draft.is_hot ? "bg-rose-500/10 border-rose-500/40 text-rose-500" : "border-border text-muted-foreground"}`}>
          <Flame className="w-4 h-4" /> מציאה
        </button>
        <Button onClick={add} disabled={upsert.isPending}><Plus className="w-4 h-4 ml-1" /> הוסף נכס</Button>
      </div>
    </div>
  );
};

export default ListingsManager;
