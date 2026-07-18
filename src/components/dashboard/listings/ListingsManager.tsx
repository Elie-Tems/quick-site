import { useState, useRef } from "react";
import { Plus, Flame, MapPin, Loader2, Building2, Image, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListings, useUpsertListing } from "@/hooks/useListings";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/hooks/useListings";

const CATS = [
  { key: "sale", label: "מכירה" },
  { key: "rent", label: "השכרה" },
  { key: "commercial", label: "מסחרי" },
];

const EMPTY_DRAFT = { title: "", price: "", city: "", category: "sale", is_hot: false, rooms: "", size: "", description: "" };

function derivedPricePeriod(category: string): string | null {
  return category === "rent" || category === "commercial" ? "month" : null;
}

async function uploadListingImage(businessId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `listings/${businessId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
  return data.publicUrl;
}

const ListingsManager = ({ businessId }: { businessId: string }) => {
  const { data: listings = [], isLoading } = useListings(businessId);
  const upsert = useUpsertListing();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Listing>>({});
  const [uploading, setUploading] = useState<string | null>(null); // listing id or "new"
  const fileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const add = () => {
    if (!draft.title.trim()) return;
    const rooms = draft.rooms ? Number(draft.rooms) : undefined;
    const size = draft.size ? Number(draft.size) : undefined;
    upsert.mutate({
      business_id: businessId, kind: "property", title: draft.title.trim(),
      price: draft.price ? Number(draft.price) : null, city: draft.city || null,
      category: draft.category, is_hot: draft.is_hot,
      description: draft.description.trim() || null,
      price_period: derivedPricePeriod(draft.category),
      attrs: { ...(rooms ? { rooms } : {}), ...(size ? { size } : {}) },
    }, { onSuccess: () => setDraft(EMPTY_DRAFT) });
  };

  const startEdit = (l: Listing) => {
    setEditId(l.id);
    setEditDraft({
      title: l.title, price: l.price, city: l.city, category: l.category ?? "sale", is_hot: l.is_hot, media: l.media,
      description: l.description ?? "",
      attrs: l.attrs ?? {},
    } as any);
  };

  const saveEdit = () => {
    if (!editId) return;
    const category = (editDraft.category as string) ?? "sale";
    const attrs = editDraft.attrs as { rooms?: string | number; size?: string | number } | undefined;
    const rooms = attrs?.rooms ? Number(attrs.rooms) : undefined;
    const size = attrs?.size ? Number(attrs.size) : undefined;
    upsert.mutate({
      id: editId, business_id: businessId, ...editDraft,
      price_period: derivedPricePeriod(category),
      attrs: { ...(rooms ? { rooms } : {}), ...(size ? { size } : {}) },
    } as any, {
      onSuccess: () => { setEditId(null); setEditDraft({}); },
    });
  };

  const archiveListing = (l: Listing) => {
    if (!window.confirm(`למחוק את "${l.title}"? הנכס יוסר מהאתר.`)) return;
    upsert.mutate({ id: l.id, business_id: businessId, active: false } as any);
  };

  const handleImageUpload = async (file: File, listingId: string) => {
    setUploading(listingId);
    try {
      const url = await uploadListingImage(businessId, file);
      const existing = listings.find(l => l.id === listingId);
      const images = existing?.media?.images ?? [];
      upsert.mutate({ id: listingId, business_id: businessId, media: { ...existing?.media, images: [url, ...images] } } as any);
    } finally {
      setUploading(null);
    }
  };

  const removeImage = (l: Listing, imgUrl: string) => {
    const images = (l.media?.images ?? []).filter(u => u !== imgUrl);
    upsert.mutate({ id: l.id, business_id: businessId, media: { ...l.media, images } } as any);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" /> הנכסים שלי
      </h3>

      <div className="space-y-3">
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}

        {listings.map((l) => (
          <div key={l.id} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Images row */}
            <div className="flex gap-2 p-3 overflow-x-auto">
              {(l.media?.images ?? []).map((img, i) => (
                <div key={i} className="relative shrink-0 w-24 h-16 rounded-lg overflow-hidden group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(l, img)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => { if (editFileRef.current) { editFileRef.current.dataset.target = l.id; editFileRef.current.click(); } }}
                className="shrink-0 w-24 h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary"
              >
                {uploading === l.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Image className="w-5 h-5" />}
                <span className="text-xs">הוסף תמונה</span>
              </button>
            </div>

            {/* Details */}
            {editId === l.id ? (
              <div className="flex flex-wrap gap-2 p-3 pt-0 items-center border-t border-border">
                <Input value={editDraft.title ?? ""} onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} placeholder="כותרת" className="max-w-[180px]" />
                <Input value={editDraft.price ?? ""} onChange={e => setEditDraft(d => ({ ...d, price: e.target.value ? Number(e.target.value) : null }))} placeholder="מחיר" className="max-w-[110px]" />
                <Input value={editDraft.city ?? ""} onChange={e => setEditDraft(d => ({ ...d, city: e.target.value }))} placeholder="עיר" className="max-w-[110px]" />
                <select value={editDraft.category ?? "sale"} onChange={e => setEditDraft(d => ({ ...d, category: e.target.value }))} className="h-10 rounded-md border border-border bg-background px-2 text-sm">
                  {CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <Input value={(editDraft.attrs as any)?.rooms ?? ""} onChange={e => setEditDraft(d => ({ ...d, attrs: { ...(d.attrs as any), rooms: e.target.value } }))} placeholder="חדרים" type="number" className="max-w-[90px]" />
                <Input value={(editDraft.attrs as any)?.size ?? ""} onChange={e => setEditDraft(d => ({ ...d, attrs: { ...(d.attrs as any), size: e.target.value } }))} placeholder="מ״ר" type="number" className="max-w-[90px]" />
                <button onClick={() => setEditDraft(d => ({ ...d, is_hot: !d.is_hot }))}
                  className={`h-10 px-3 rounded-md border text-sm flex items-center gap-1 ${editDraft.is_hot ? "bg-rose-500/10 border-rose-500/40 text-rose-500" : "border-border text-muted-foreground"}`}>
                  <Flame className="w-4 h-4" />
                </button>
                <Input value={editDraft.description ?? ""} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} placeholder="תיאור הנכס" className="w-full" />
                <Button size="sm" onClick={saveEdit} disabled={upsert.isPending}><Check className="w-4 h-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditId(null)}><X className="w-4 h-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 pt-0 border-t border-border">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate flex items-center gap-1.5">
                    {l.title} {l.is_hot && <Flame className="w-3.5 h-3.5 text-rose-500" />}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    {l.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {l.city}</span>}
                    <span>{CATS.find(c => c.key === l.category)?.label ?? l.category}</span>
                    {(l.attrs as any)?.rooms ? <span>{(l.attrs as any).rooms} חד'</span> : null}
                    {(l.attrs as any)?.size ? <span>{(l.attrs as any).size} מ״ר</span> : null}
                  </div>
                </div>
                <div className="font-bold text-primary whitespace-nowrap">{l.price ? `₪${l.price.toLocaleString()}` : "-"}</div>
                <button onClick={() => startEdit(l)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => archiveListing(l)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        ))}

        {!isLoading && listings.length === 0 && (
          <p className="text-sm text-muted-foreground">עדיין אין נכסים - הוסיפו את הראשון.</p>
        )}
      </div>

      {/* Add new */}
      <div className="flex flex-wrap gap-2 items-end p-3 rounded-xl border border-border">
        <Input placeholder="כותרת (דירת 4 חד')" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className="max-w-[200px]" />
        <Input placeholder="מחיר" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} className="max-w-[110px]" />
        <Input placeholder="עיר" value={draft.city} onChange={e => setDraft({ ...draft, city: e.target.value })} className="max-w-[120px]" />
        <select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} className="h-10 rounded-md border border-border bg-background px-2 text-sm">
          {CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <Input placeholder="חדרים" type="number" value={draft.rooms} onChange={e => setDraft({ ...draft, rooms: e.target.value })} className="max-w-[90px]" />
        <Input placeholder="מ״ר" type="number" value={draft.size} onChange={e => setDraft({ ...draft, size: e.target.value })} className="max-w-[90px]" />
        <button onClick={() => setDraft({ ...draft, is_hot: !draft.is_hot })}
          className={`h-10 px-3 rounded-md border text-sm flex items-center gap-1 ${draft.is_hot ? "bg-rose-500/10 border-rose-500/40 text-rose-500" : "border-border text-muted-foreground"}`}>
          <Flame className="w-4 h-4" /> מציאה
        </button>
        <Input placeholder="תיאור הנכס" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} className="w-full" />
        <Button onClick={add} disabled={upsert.isPending}><Plus className="w-4 h-4 ml-1" /> הוסף נכס</Button>
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={editFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0];
          const targetId = e.target.dataset.target;
          if (file && targetId) await handleImageUpload(file, targetId);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default ListingsManager;
