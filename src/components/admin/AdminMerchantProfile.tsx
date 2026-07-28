import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  ArrowRight, Mail, ExternalLink, StickyNote, Trash2,
  Globe, ToggleLeft, ToggleRight, Loader2, ChevronLeft,
  Pencil, Plus, X, Check, Upload, Image as ImageIcon,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface MerchantProfileData {
  businessId: string;
  businessName: string;
  slug: string | null;
  businessCategory: string | null;
  isPublished: boolean;
  enabledModules: Record<string, boolean>;
  businessPhone: string | null;
  businessEmail: string | null;
  businessCreatedAt: string;
  aboutText: string;
  heroTitle: string;
  tagline: string;
  promoText: string;
  heroBenefits: string[];
  profileId: string | null;
  userId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerRegisteredAt: string | null;
  adminNotes: string;
  heroImageUrl: string | null;
  galleryImages: { heading: string; images: { url: string; caption: string }[] } | null;
  plan: string | null;
  subscriptionStatus: string | null;
  paidUntil: string | null;
  cancelAt: string | null;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  recentOrders: Array<{ id: string; created_at: string; total_price: number | null; status: string | null }>;
  recentActivity: Array<{ text: string; time: string }>;
}

function useMerchantProfile(businessId: string) {
  return useQuery<MerchantProfileData>({
    queryKey: ["merchant-profile", businessId],
    queryFn: async () => {
      const [bizRes, ordersRes, customersRes] = await Promise.all([
        (supabase as any)
          .from("businesses")
          .select(`
            id, name, slug, business_category, is_published,
            enabled_modules, phone, email, created_at, about_text,
            hero_title, tagline, promo_text, hero_benefits,
            hero_image_url, gallery_images,
            profiles ( id, user_id, full_name, email, phone, created_at, admin_notes )
          `)
          .eq("id", businessId)
          .maybeSingle(),
        (supabase as any)
          .from("orders")
          .select("id, created_at, total_price, status")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(20),
        (supabase as any)
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId),
      ]);

      const biz = bizRes.data;
      if (!biz) throw new Error("Business not found");

      const profile = Array.isArray(biz.profiles) ? biz.profiles[0] : biz.profiles;
      const orders = (ordersRes.data || []) as Array<{ id: string; created_at: string; total_price: number | null; status: string | null }>;

      let sub: any = null;
      if (profile?.user_id) {
        const { data } = await (supabase as any)
          .from("subscriptions")
          .select("plan, status, paid_until, cancel_at")
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        sub = data;
      }

      const totalRevenue = orders.reduce((s, o) => s + (Number(o.total_price) || 0), 0);

      const recentActivity = orders.slice(0, 5).map(o => ({
        text: `הזמנה #${o.id.slice(0, 8)} — ₪${Math.round(Number(o.total_price) || 0)}`,
        time: format(new Date(o.created_at), "dd/MM HH:mm", { locale: he }),
      }));

      return {
        businessId: biz.id,
        businessName: biz.name,
        slug: biz.slug,
        businessCategory: biz.business_category,
        isPublished: biz.is_published ?? false,
        enabledModules: (biz.enabled_modules as Record<string, boolean>) || {},
        businessPhone: biz.phone,
        businessEmail: biz.email,
        businessCreatedAt: biz.created_at,
        profileId: profile?.id ?? null,
        userId: profile?.user_id ?? null,
        ownerName: profile?.full_name ?? null,
        ownerEmail: profile?.email ?? null,
        ownerPhone: profile?.phone ?? null,
        ownerRegisteredAt: profile?.created_at ?? null,
        adminNotes: (profile?.admin_notes as string) ?? "",
        heroImageUrl: biz.hero_image_url ?? null,
        galleryImages: (biz.gallery_images as any) ?? null,
        aboutText: biz.about_text ?? "",
        heroTitle: biz.hero_title ?? "",
        tagline: biz.tagline ?? "",
        promoText: biz.promo_text ?? "",
        heroBenefits: Array.isArray(biz.hero_benefits) ? biz.hero_benefits : [],
        plan: sub?.plan ?? null,
        subscriptionStatus: sub?.status ?? null,
        paidUntil: sub?.paid_until ?? null,
        cancelAt: sub?.cancel_at ?? null,
        totalOrders: orders.length,
        totalRevenue,
        totalCustomers: customersRes.count || 0,
        recentOrders: orders,
        recentActivity,
      };
    },
  });
}

async function uploadToStorage(businessId: string, folder: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${businessId}/${folder}/${Date.now()}.${ext}`;
  const { error } = await (supabase as any).storage.from("business-assets").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  const { data } = (supabase as any).storage.from("business-assets").getPublicUrl(path);
  return data.publicUrl as string;
}

type Tab = "overview" | "log" | "content" | "products" | "site" | "notes";

function OverviewTab({ data }: { data: MerchantProfileData }) {
  const ils = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'הזמנות סה"כ', value: data.totalOrders },
          { label: "מחזור כולל", value: ils(data.totalRevenue) },
          { label: "לקוחות", value: data.totalCustomers },
          { label: "סטטוס מנוי", value: data.subscriptionStatus === "active" ? "פעיל" : data.subscriptionStatus || "—" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">פעילות אחרונה</div>
          {data.recentActivity.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">אין פעילות עדיין</p>
          ) : data.recentActivity.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="flex-1 text-muted-foreground">{a.text}</span>
              <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">פרטי חשבון</div>
          {[
            { label: "שם בעלים", value: data.ownerName || "—" },
            { label: "מייל", value: data.ownerEmail || "—" },
            { label: "טלפון", value: data.ownerPhone || "—" },
            { label: "מסלול", value: data.plan || "ללא מנוי" },
            { label: "חידוש הבא", value: data.paidUntil ? format(new Date(data.paidUntil), "dd.MM.yyyy", { locale: he }) : "—" },
          ].map(f => (
            <div key={f.label} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 text-sm">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-medium">{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogTab({ data }: { data: MerchantProfileData }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">לוג הזמנות</div>
      {data.recentOrders.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">אין הזמנות עדיין</p>
      ) : data.recentOrders.map(o => (
        <div key={o.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 text-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <span className="flex-1 text-muted-foreground">הזמנה #{o.id.slice(0, 8)}</span>
          <span className="font-medium">₪{Math.round(Number(o.total_price) || 0)}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {format(new Date(o.created_at), "dd/MM/yy HH:mm", { locale: he })}
          </span>
        </div>
      ))}
    </div>
  );
}

function ContentTab({ businessId, data, onRefresh }: {
  businessId: string;
  data: MerchantProfileData;
  onRefresh: () => void;
}) {
  const [heroTitle, setHeroTitle] = useState(data.heroTitle);
  const [tagline, setTagline] = useState(data.tagline);
  const [promoText, setPromoText] = useState(data.promoText);
  const [aboutText, setAboutText] = useState(data.aboutText);
  const [saving, setSaving] = useState(false);

  const [heroImageUrl, setHeroImageUrl] = useState(data.heroImageUrl);
  const [uploadingHero, setUploadingHero] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const [galleryImages, setGalleryImages] = useState<{ url: string; caption: string }[]>(
    data.galleryImages?.images ?? []
  );
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("businesses")
      .update({
        hero_title: heroTitle || null,
        tagline: tagline || null,
        promo_text: promoText || null,
        about_text: aboutText || null,
      })
      .eq("id", businessId);
    setSaving(false);
    if (error) toast.error("שגיאה בשמירה: " + error.message);
    else { toast.success("תוכן עודכן"); onRefresh(); }
  };

  const uploadHeroImage = async (file: File) => {
    setUploadingHero(true);
    try {
      const url = await uploadToStorage(businessId, "hero", file);
      const { error } = await (supabase as any).from("businesses").update({ hero_image_url: url }).eq("id", businessId);
      if (error) throw error;
      setHeroImageUrl(url);
      toast.success("תמונת הירו עודכנה");
      onRefresh();
    } catch (e: any) {
      toast.error("שגיאה בהעלאה: " + e.message);
    } finally {
      setUploadingHero(false);
    }
  };

  const removeHeroImage = async () => {
    const { error } = await (supabase as any).from("businesses").update({ hero_image_url: null }).eq("id", businessId);
    if (error) { toast.error("שגיאה"); return; }
    setHeroImageUrl(null);
    onRefresh();
  };

  const uploadGalleryImages = async (files: FileList) => {
    setUploadingGallery(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadToStorage(businessId, "gallery", file);
        urls.push(url);
      }
      const newImages = [...galleryImages, ...urls.map(u => ({ url: u, caption: "" }))];
      const current = data.galleryImages ?? { heading: "", images: [] };
      const { error } = await (supabase as any).from("businesses").update({
        gallery_images: { ...current, images: newImages },
      }).eq("id", businessId);
      if (error) throw error;
      setGalleryImages(newImages);
      toast.success(`${urls.length} תמונות נוספו`);
      onRefresh();
    } catch (e: any) {
      toast.error("שגיאה בהעלאה: " + e.message);
    } finally {
      setUploadingGallery(false);
    }
  };

  const removeGalleryImage = async (idx: number) => {
    const newImages = galleryImages.filter((_, i) => i !== idx);
    const current = data.galleryImages ?? { heading: "", images: [] };
    const { error } = await (supabase as any).from("businesses").update({
      gallery_images: { ...current, images: newImages },
    }).eq("id", businessId);
    if (error) { toast.error("שגיאה"); return; }
    setGalleryImages(newImages);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Text content */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">כותרת ראשית (hero)</label>
          <input
            value={heroTitle}
            onChange={e => setHeroTitle(e.target.value)}
            dir="rtl"
            placeholder={data.businessName}
            className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">טאגליין</label>
          <input
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            dir="rtl"
            placeholder="משפט מייחד..."
            className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">טקסט פרומו (בנר עליון)</label>
          <input
            value={promoText}
            onChange={e => setPromoText(e.target.value)}
            dir="rtl"
            placeholder="הצעה מיוחדת..."
            className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">טקסט אודות</label>
          <textarea
            value={aboutText}
            onChange={e => setAboutText(e.target.value)}
            rows={6}
            dir="rtl"
            placeholder="אודות העסק..."
            className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-y"
          />
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : null}
          שמור תוכן
        </Button>
      </div>

      {/* Hero image */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">תמונת ירו ראשית</p>
        {heroImageUrl ? (
          <div className="relative w-full">
            <img src={heroImageUrl} alt="hero" className="w-full h-40 object-cover rounded-lg" />
            <button
              onClick={removeHeroImage}
              className="absolute top-2 left-2 p-1 rounded-full bg-background/80 hover:bg-background text-destructive transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-28 rounded-lg border-2 border-dashed border-border text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        <input
          ref={heroInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) uploadHeroImage(e.target.files[0]); }}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={uploadingHero}
          onClick={() => heroInputRef.current?.click()}
        >
          {uploadingHero ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : <Upload className="h-3.5 w-3.5 ml-1" />}
          {heroImageUrl ? "החלף תמונה" : "העלה תמונה"}
        </Button>
      </div>

      {/* Gallery images */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">תמונות גלריה / אווירה ({galleryImages.length})</p>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files?.length) uploadGalleryImages(e.target.files); }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={uploadingGallery}
            onClick={() => galleryInputRef.current?.click()}
          >
            {uploadingGallery ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : <Upload className="h-3.5 w-3.5 ml-1" />}
            הוסף תמונות
          </Button>
        </div>
        {galleryImages.length === 0 ? (
          <div className="flex items-center justify-center h-20 rounded-lg border-2 border-dashed border-border text-muted-foreground text-sm">
            אין תמונות גלריה
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {galleryImages.map((img, idx) => (
              <div key={idx} className="relative group">
                <img src={img.url} alt="" className="w-full h-24 object-cover rounded-lg" />
                <button
                  onClick={() => removeGalleryImage(idx)}
                  className="absolute top-1 left-1 p-1 rounded-full bg-background/80 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AdminProduct {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  is_active: boolean | null;
  image_url: string | null;
}

function ProductsTab({ businessId }: { businessId: string }) {
  const { data: products, isLoading, refetch } = useQuery<AdminProduct[]>({
    queryKey: ["admin-products", businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id, name, price, description, is_active, image_url")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as AdminProduct[];
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [uploadingProductImg, setUploadingProductImg] = useState(false);
  const productImgRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const startEdit = (p: AdminProduct) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPrice(p.price?.toString() ?? "");
    setEditDesc(p.description ?? "");
    setEditImageUrl(p.image_url ?? null);
  };

  const uploadProductImage = async (file: File) => {
    if (!editingId) return;
    setUploadingProductImg(true);
    try {
      const url = await uploadToStorage(businessId, "products", file);
      setEditImageUrl(url);
    } catch (e: any) {
      toast.error("שגיאה בהעלאה: " + e.message);
    } finally {
      setUploadingProductImg(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("products")
      .update({
        name: editName,
        price: editPrice ? parseFloat(editPrice) : null,
        description: editDesc || null,
        image_url: editImageUrl || null,
      })
      .eq("id", editingId);
    setSaving(false);
    if (error) toast.error("שגיאה בשמירה");
    else { toast.success("מוצר עודכן"); setEditingId(null); refetch(); }
  };

  const toggleActive = async (p: AdminProduct) => {
    await (supabase as any).from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    refetch();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("למחוק מוצר זה?")) return;
    await (supabase as any).from("products").delete().eq("id", id);
    refetch();
  };

  const addProduct = async () => {
    if (!newName.trim()) { toast.error("שם המוצר חובה"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("products").insert({
      business_id: businessId,
      name: newName,
      price: newPrice ? parseFloat(newPrice) : null,
      description: newDesc || null,
      is_active: true,
    });
    setSaving(false);
    if (error) toast.error("שגיאה בהוספה: " + error.message);
    else {
      toast.success("מוצר נוסף");
      setAddingNew(false);
      setNewName(""); setNewPrice(""); setNewDesc("");
      refetch();
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{products?.length ?? 0} מוצרים</span>
        <Button size="sm" variant="outline" onClick={() => setAddingNew(true)}>
          <Plus className="h-3.5 w-3.5 ml-1" /> הוסף מוצר
        </Button>
      </div>

      {addingNew && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">מוצר חדש</p>
          <input value={newName} onChange={e => setNewName(e.target.value)} dir="rtl" placeholder="שם המוצר *" className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2" />
          <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" dir="ltr" placeholder="מחיר (₪)" className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2" />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} dir="rtl" rows={3} placeholder="תיאור (אופציונלי)" className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none" />
          <div className="flex gap-2">
            <Button size="sm" onClick={addProduct} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : null} הוסף
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddingNew(false)}>ביטול</Button>
          </div>
        </div>
      )}

      {!products?.length && !addingNew && (
        <p className="text-sm text-muted-foreground text-center py-6">אין מוצרים עדיין</p>
      )}

      {products?.map(p => (
        <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden">
          {editingId === p.id ? (
            <div className="p-4 space-y-3">
              <input value={editName} onChange={e => setEditName(e.target.value)} dir="rtl" className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2" />
              <input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" dir="ltr" placeholder="מחיר" className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2" />
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} dir="rtl" rows={3} className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none" />
              {/* Image upload */}
              <div className="flex items-center gap-3">
                {editImageUrl ? (
                  <div className="relative">
                    <img src={editImageUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                    <button onClick={() => setEditImageUrl(null)} className="absolute -top-1 -left-1 p-0.5 rounded-full bg-background border border-border text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
                <input
                  ref={productImgRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) uploadProductImage(e.target.files[0]); }}
                />
                <Button size="sm" variant="outline" disabled={uploadingProductImg} onClick={() => productImgRef.current?.click()}>
                  {uploadingProductImg ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : <Upload className="h-3.5 w-3.5 ml-1" />}
                  {editImageUrl ? "החלף" : "העלה תמונה"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={saving || uploadingProductImg}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : <Check className="h-3.5 w-3.5 ml-1" />} שמור
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              {p.image_url && (
                <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  {!p.is_active && <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">לא פעיל</span>}
                </div>
                {p.price != null && <div className="text-xs text-muted-foreground">₪{p.price}</div>}
                {p.description && <div className="text-xs text-muted-foreground truncate">{p.description}</div>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleActive(p)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title={p.is_active ? "כבה מוצר" : "הפעל מוצר"}>
                  {p.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
                <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SiteTab({ data, businessId, onRefresh }: {
  data: MerchantProfileData;
  businessId: string;
  onRefresh: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const knownModules = [
    { key: "booking", label: "יומן תורים" },
    { key: "gallery", label: "גלריה" },
    { key: "crm_plus", label: "CRM+" },
    { key: "campaigns", label: "קמפיינים" },
    { key: "coupons", label: "קופונים" },
  ];

  const toggleModule = async (key: string, current: boolean) => {
    setSaving(true);
    const updated = { ...data.enabledModules, [key]: !current };
    const { error } = await (supabase as any)
      .from("businesses")
      .update({ enabled_modules: updated })
      .eq("id", businessId);
    setSaving(false);
    if (error) toast.error("שגיאה בעדכון מודול");
    else { toast.success("מודול עודכן"); onRefresh(); }
  };

  return (
    <div className="space-y-4">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">הגדרות אתר</div>
        {[
          { label: "שם עסק", value: data.businessName },
          { label: "slug", value: data.slug || "—" },
          { label: "קטגוריה", value: data.businessCategory || "—" },
          { label: "טלפון", value: data.businessPhone || "—" },
          { label: "מייל", value: data.businessEmail || "—" },
        ].map(f => (
          <div key={f.label} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 text-sm">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="font-medium text-left" dir="ltr">{f.value}</span>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground flex items-center justify-between">
          מודולים פעילים
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
        {knownModules.map(m => {
          const active = !!data.enabledModules[m.key];
          return (
            <div key={m.key} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 text-sm">
              <span className="text-muted-foreground">{m.label}</span>
              <button
                onClick={() => toggleModule(m.key, active)}
                disabled={saving}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${active ? "text-green-600" : "text-muted-foreground"}`}
              >
                {active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                {active ? "פעיל" : "כבוי"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}

function NotesTab({ profileId, notes, setNotes, savingNotes, setSavingNotes }: {
  profileId: string | null;
  notes: string;
  setNotes: (v: string) => void;
  savingNotes: boolean;
  setSavingNotes: (v: boolean) => void;
}) {
  const save = async () => {
    if (!profileId) { toast.error("אין פרופיל — לא ניתן לשמור הערה"); return; }
    setSavingNotes(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ admin_notes: notes })
      .eq("id", profileId);
    setSavingNotes(false);
    if (error) toast.error("שגיאה בשמירת הערה: " + error.message);
    else toast.success("הערה נשמרה");
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">הערות פנימיות — נראה רק למוטי ודניאל</p>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={6}
        placeholder="הוסף הערה..."
        dir="rtl"
        className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-y"
      />
      <Button size="sm" onClick={save} disabled={savingNotes}>
        {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : null}
        שמור הערה
      </Button>
    </div>
  );
}

const AdminMerchantProfile = ({
  businessId,
  onBack,
}: {
  businessId: string;
  onBack: () => void;
}) => {
  const { data, isLoading, error } = useMerchantProfile(businessId);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [notes, setNotes] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (data && notes === null) setNotes(data.adminNotes);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (error || !data) return (
    <div className="p-6 text-destructive">שגיאה בטעינת הפרופיל</div>
  );

  const initials = (data.businessName || "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Back bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-card text-sm">
        <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="h-4 w-4" /> סוחרים
        </button>
        <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        <span className="text-foreground font-medium">{data.businessName}</span>
      </div>

      {/* Merchant header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg">{data.businessName}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${data.isPublished ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
              {data.isPublished ? "פעיל" : "לא פורסם"}
            </span>
            {data.plan && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{data.plan}</span>
            )}
            {data.businessCategory && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">{data.businessCategory}</span>
            )}
          </div>
          {data.slug && (
            <p className="text-xs text-muted-foreground mt-1">
              siango.app/{data.slug} · נרשם {data.businessCreatedAt ? format(new Date(data.businessCreatedAt), "dd.MM.yyyy", { locale: he }) : "—"}
            </p>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border bg-card flex-wrap">
        {data.ownerEmail && (
          <a href={`mailto:${data.ownerEmail}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-primary">
            <Mail className="h-3.5 w-3.5" /> שלח מייל
          </a>
        )}
        {data.slug && (
          <a href={`https://siango.app/${data.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors">
            <Globe className="h-3.5 w-3.5" /> פתח אתר
          </a>
        )}
        <button
          onClick={() => setActiveTab("notes")}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
        >
          <StickyNote className="h-3.5 w-3.5" /> הוסף הערה
        </button>
        <button
          onClick={() => setDeleteDialogOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors mr-auto"
        >
          <Trash2 className="h-3.5 w-3.5" /> מחק אתר
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-0 border-b border-border bg-background overflow-x-auto">
        {(["overview", "log", "content", "products", "site", "notes"] as Tab[]).map(t => {
          const labels: Record<Tab, string> = {
            overview: "סקירה",
            log: "לוג פעילות",
            content: "תוכן האתר",
            products: "מוצרים",
            site: "הגדרות אתר",
            notes: "הערות פנימיות",
          };
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-3 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${activeTab === t ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === "overview" && <OverviewTab data={data} />}
        {activeTab === "log" && <LogTab data={data} />}
        {activeTab === "content" && (
          <ContentTab
            businessId={businessId}
            data={data}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["merchant-profile", businessId] })}
          />
        )}
        {activeTab === "products" && <ProductsTab businessId={businessId} />}
        {activeTab === "site" && (
          <SiteTab
            data={data}
            businessId={businessId}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["merchant-profile", businessId] })}
          />
        )}
        {activeTab === "notes" && (
          <NotesTab
            profileId={data.profileId}
            notes={notes ?? ""}
            setNotes={setNotes}
            savingNotes={savingNotes}
            setSavingNotes={setSavingNotes}
          />
        )}
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת אתר — {data.businessName}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האתר, המוצרים, ההזמנות, והלקוחות שלו יימחקו לצמיתות. אין דרך חזרה.</p>
          <DialogFooter className="flex gap-2 justify-start">
            <Button variant="destructive" disabled={deleting} onClick={async () => {
              setDeleting(true);
              const { error } = await (supabase as any).from("businesses").delete().eq("id", businessId);
              setDeleting(false);
              if (error) { toast.error("שגיאה במחיקה: " + error.message); return; }
              toast.success("האתר נמחק");
              setDeleteDialogOpen(false);
              onBack();
            }}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
              מחק לצמיתות
            </Button>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMerchantProfile;
