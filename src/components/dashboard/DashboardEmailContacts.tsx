import { useEffect, useState } from "react";
import { Users, Upload, Plus, Loader2, Mail, X, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

// Real contact management for the email-marketing backbone (mkt_contacts).
// Owner-scoped via RLS. Import requires a consent confirmation (Israeli spam law:
// opt-in only). Adding here = the merchant declares they have consent.

interface Contact { id: string; email: string | null; name: string | null; status: string; source: string | null; }

const DashboardEmailContacts = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [consent, setConsent] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("mkt_contacts").select("id, email, name, status, source").order("created_at", { ascending: false }).limit(500);
    setContacts((data as Contact[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addOne = async () => {
    if (!user) { toast.error(t("dash.emailcontacts.auth_required")); return; }
    if (!email.trim()) { toast.error(t("dash.emailcontacts.email_required")); return; }
    if (!consent) { toast.error(t("dash.emailcontacts.consent_required")); return; }
    setBusy(true);
    const tags = tagsInput.split(",").map((tg) => tg.trim()).filter(Boolean);
    const { error } = await supabase.from("mkt_contacts").insert({
      owner_id: user.id, email: email.trim().toLowerCase(), name: name.trim() || null,
      status: "active", source: "manual", consent_at: new Date().toISOString(), tags,
    });
    setBusy(false);
    if (error) { toast.error(error.message.includes("duplicate") ? t("dash.emailcontacts.email_exists") : t("dash.emailcontacts.add_error")); return; }
    toast.success(t("dash.emailcontacts.add_success"));
    setEmail(""); setName(""); setTagsInput(""); setShowAdd(false); load();
  };

  const importCsv = async (file: File) => {
    if (!user) { toast.error(t("dash.emailcontacts.auth_required")); return; }
    if (!confirm(t("dash.emailcontacts.import_consent_confirm"))) return;
    const tag = (prompt(t("dash.emailcontacts.import_tag_prompt")) || "").trim();
    const tags = tag ? [tag] : [];
    setBusy(true);
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const now = new Date().toISOString();
      const toInsert: any[] = [];
      for (const row of rows) {
        const cols = row.split(/[,;\t]/).map((c) => c.trim());
        const em = cols.find((c) => /@/.test(c));
        if (!em || /^email$/i.test(em)) continue; // skip header / no-email
        const nm = cols.find((c) => c && !/@/.test(c)) || null;
        toInsert.push({ owner_id: user.id, email: em.toLowerCase(), name: nm, status: "active", source: "import", consent_at: now, tags });
      }
      if (!toInsert.length) { toast.error(t("dash.emailcontacts.import_no_emails")); return; }
      // upsert to skip duplicates (unique owner_id,email)
      const { error } = await supabase.from("mkt_contacts").upsert(toInsert, { onConflict: "owner_id,email", ignoreDuplicates: true });
      if (error) throw error;
      toast.success(`${t("dash.emailcontacts.import_success_prefix")} ${toInsert.length} ${t("dash.emailcontacts.import_success_suffix")}`);
      load();
    } catch (e: any) { toast.error(`${t("dash.emailcontacts.import_error_prefix")} ${e?.message || ""}`); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> {t("dash.emailcontacts.contacts_title")} {!loading && <span className="text-muted-foreground">({contacts.length})</span>}</p>
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-1.5 cursor-pointer hover:border-primary/40">
            <Upload className="w-4 h-4" /> {t("dash.emailcontacts.import_csv_button")}
            <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.currentTarget.value = ""; }} />
          </label>
          <button onClick={() => setShowAdd((s) => !s)} className="flex items-center gap-1.5 text-sm bg-primary/10 text-primary rounded-lg px-3 py-1.5"><Plus className="w-4 h-4" /> {t("dash.emailcontacts.add_button")}</button>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("dash.emailcontacts.email_placeholder")} dir="ltr" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("dash.emailcontacts.name_placeholder")} className="h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder={t("dash.emailcontacts.tags_placeholder")} className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="accent-primary" />
            <ShieldCheck className="w-3.5 h-3.5" /> {t("dash.emailcontacts.consent_label")}
          </label>
          <div className="flex gap-2">
            <button onClick={addOne} disabled={busy} className="text-sm bg-primary text-primary-foreground rounded-lg px-4 py-1.5 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("dash.emailcontacts.save_button")}</button>
            <button onClick={() => setShowAdd(false)} className="text-sm text-muted-foreground px-2">{t("dash.emailcontacts.cancel_button")}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" /></div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t("dash.emailcontacts.empty_state")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {contacts.slice(0, 100).map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{c.name || "—"}</span>
                <span className="text-muted-foreground mr-2" dir="ltr">{c.email}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${c.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{c.status === "active" ? t("dash.emailcontacts.status_active") : t("dash.emailcontacts.status_removed")}</span>
            </div>
          ))}
          {contacts.length > 100 && <p className="text-xs text-muted-foreground text-center">{t("dash.emailcontacts.display_prefix")} 100 {t("dash.emailcontacts.display_of")} {contacts.length}</p>}
        </div>
      )}
    </div>
  );
};

export default DashboardEmailContacts;
