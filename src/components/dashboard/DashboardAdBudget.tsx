import { useState } from "react";
import {
  Megaphone, Plus, Trash2, ChevronDown, ChevronUp,
  Copy, Check, ExternalLink, Pencil, X, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AdChannel, AdLink, buildUTMUrl,
  useAdChannels, useCreateChannel, useUpdateChannel, useDeleteChannel,
  useAdLinks, useCreateLink, useUpdateLink, useDeleteLink,
} from "@/hooks/useAdBudget";

const CHANNEL_ICONS: Record<string, string> = {
  פייסבוק: "📘", גוגל: "🔍", אינסטגרם: "📸", טיקטוק: "🎵",
  יוטיוב: "▶️", לינקדאין: "💼", טוויטר: "🐦", אחר: "📣",
};

const PERIOD_LABELS: Record<string, string> = {
  monthly: "חודשי", weekly: "שבועי", custom: "טווח מותאם",
};

interface Props { businessId?: string }

// ── Link row ──────────────────────────────────────────────────────────────────
function LinkRow({ link, onUpdate, onDelete }: {
  link: AdLink;
  onUpdate: (patch: Partial<AdLink> & { id: string; channel_id: string }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...link });
  const [copied, setCopied] = useState(false);

  const utmUrl = buildUTMUrl(link);

  const copy = () => {
    navigator.clipboard.writeText(utmUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("קישור UTM הועתק");
  };

  const save = () => {
    onUpdate({ ...form, id: link.id, channel_id: link.channel_id });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="border border-primary/30 rounded-lg p-3 space-y-2 bg-muted/30">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">תווית</Label>
            <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">URL יעד</Label>
            <Input value={form.destination_url} onChange={e => setForm(f => ({ ...f, destination_url: e.target.value }))} className="h-8 text-sm" dir="ltr" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const).map(k => (
            <div key={k}>
              <Label className="text-xs">{k.replace("utm_", "")}</Label>
              <Input value={(form as any)[k] ?? ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="h-8 text-xs" dir="ltr" placeholder={k.replace("utm_", "")} />
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
          <Button size="sm" onClick={save}><Save className="h-4 w-4 ml-1" /> שמור</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{link.label}</p>
        <p className="text-xs text-muted-foreground truncate dir-ltr" dir="ltr">{utmUrl}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{link.clicks} קליקים</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(utmUrl, "_blank")}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Channel card ──────────────────────────────────────────────────────────────
function ChannelCard({ channel, businessId, onDelete }: {
  channel: AdChannel; businessId: string; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    budget_amount: channel.budget_amount,
    budget_period: channel.budget_period,
    budget_start_date: channel.budget_start_date ?? "",
    budget_end_date: channel.budget_end_date ?? "",
  });
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLink, setNewLink] = useState({ label: "", destination_url: "", utm_source: channel.name.toLowerCase(), utm_medium: "paid", utm_campaign: "", utm_content: "" });

  const { data: links } = useAdLinks(channel.id);
  const updateChannel = useUpdateChannel();
  const deleteLink = useDeleteLink();
  const updateLink = useUpdateLink();
  const createLink = useCreateLink();

  const icon = CHANNEL_ICONS[channel.name] ?? channel.icon ?? "📣";
  const spent = 0; // could be wired to real ad spend data later
  const pct = channel.budget_amount > 0 ? Math.min((spent / channel.budget_amount) * 100, 100) : 0;

  const saveBudget = () => {
    updateChannel.mutate({ id: channel.id, ...budgetForm });
    setEditingBudget(false);
  };

  const addLink = () => {
    if (!newLink.label || !newLink.destination_url) { toast.error("מלא תווית וURL"); return; }
    createLink.mutate({ ...newLink, channel_id: channel.id, business_id: businessId, utm_term: null, is_active: true });
    setNewLink({ label: "", destination_url: "", utm_source: channel.name.toLowerCase(), utm_medium: "paid", utm_campaign: "", utm_content: "" });
    setShowAddLink(false);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-card cursor-pointer hover:bg-muted/30" onClick={() => setOpen(o => !o)}>
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <p className="font-semibold">{channel.name}</p>
          <p className="text-xs text-muted-foreground">
            {channel.budget_amount > 0
              ? `₪${channel.budget_amount.toLocaleString()} ${PERIOD_LABELS[channel.budget_period]}`
              : "לא הוגדר תקציב"}
            {channel.budget_start_date && ` · ${channel.budget_start_date}`}
            {channel.budget_end_date && ` - ${channel.budget_end_date}`}
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">{links?.length ?? 0} קישורים</Badge>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="h-4 w-4" />
        </Button>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>

      {open && (
        <div className="border-t border-border p-4 space-y-4 bg-muted/10">
          {/* Budget editor */}
          {editingBudget ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 border border-border rounded-lg bg-card">
              <div>
                <Label className="text-xs">תקציב (₪)</Label>
                <Input type="number" value={budgetForm.budget_amount} onChange={e => setBudgetForm(f => ({ ...f, budget_amount: +e.target.value }))} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">תדירות</Label>
                <Select value={budgetForm.budget_period} onValueChange={v => setBudgetForm(f => ({ ...f, budget_period: v as any }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">חודשי</SelectItem>
                    <SelectItem value="weekly">שבועי</SelectItem>
                    <SelectItem value="custom">טווח מותאם</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">מתאריך</Label>
                <Input type="date" value={budgetForm.budget_start_date} onChange={e => setBudgetForm(f => ({ ...f, budget_start_date: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">עד תאריך</Label>
                <Input type="date" value={budgetForm.budget_end_date} onChange={e => setBudgetForm(f => ({ ...f, budget_end_date: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="col-span-full flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setEditingBudget(false)}>ביטול</Button>
                <Button size="sm" onClick={saveBudget}><Save className="h-4 w-4 ml-1" /> שמור תקציב</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setEditingBudget(true)}>
                <Pencil className="h-3 w-3 ml-1" /> עדכן תקציב
              </Button>
            </div>
          )}

          {/* Links */}
          <div className="space-y-1">
            {(links ?? []).map(link => (
              <LinkRow
                key={link.id}
                link={link}
                onUpdate={patch => updateLink.mutate(patch)}
                onDelete={() => deleteLink.mutate({ id: link.id, channelId: link.channel_id })}
              />
            ))}
          </div>

          {/* Add link */}
          {showAddLink ? (
            <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">תווית (לדוג׳ "סרטון 1")</Label>
                  <Input value={newLink.label} onChange={e => setNewLink(f => ({ ...f, label: e.target.value }))} className="h-8 text-sm" placeholder="סרטון 1" />
                </div>
                <div>
                  <Label className="text-xs">URL יעד</Label>
                  <Input value={newLink.destination_url} onChange={e => setNewLink(f => ({ ...f, destination_url: e.target.value }))} className="h-8 text-sm" dir="ltr" placeholder="https://..." />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const).map(k => (
                  <div key={k}>
                    <Label className="text-xs">{k.replace("utm_", "")}</Label>
                    <Input value={(newLink as any)[k] ?? ""} onChange={e => setNewLink(f => ({ ...f, [k]: e.target.value }))} className="h-8 text-xs" dir="ltr" placeholder={k.replace("utm_", "")} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setShowAddLink(false)}>ביטול</Button>
                <Button size="sm" onClick={addLink}><Plus className="h-4 w-4 ml-1" /> הוסף קישור</Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setShowAddLink(true)}>
              <Plus className="h-4 w-4 ml-1" /> הוסף קישור UTM
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const DashboardAdBudget = ({ businessId }: Props) => {
  const { data: channels, isLoading } = useAdChannels(businessId);
  const createChannel = useCreateChannel();
  const deleteChannel = useDeleteChannel();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");

  const add = () => {
    if (!newName.trim() || !businessId) return;
    createChannel.mutate({
      business_id: businessId,
      name: newName.trim(),
      icon: newIcon || CHANNEL_ICONS[newName.trim()] || "📣",
      budget_amount: 0,
      budget_currency: "ILS",
      budget_period: "monthly",
      budget_start_date: null,
      budget_end_date: null,
      notes: null,
    });
    setNewName("");
    setNewIcon("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" /> ניהול תקציב פרסום
        </h2>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1">
          <Plus className="h-4 w-4" /> ערוץ חדש
        </Button>
      </div>

      {/* Add channel dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>הוסף ערוץ פרסום</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>שם הערוץ</Label>
              <Select onValueChange={v => { setNewName(v); setNewIcon(CHANNEL_ICONS[v] ?? "📣"); }}>
                <SelectTrigger><SelectValue placeholder="בחר ערוץ..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANNEL_ICONS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v} {k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">או הכנס ידנית:</p>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="שם ערוץ מותאם" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>ביטול</Button>
            <Button onClick={add} disabled={!newName.trim()}>הוסף</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (channels ?? []).length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">עדיין לא הגדרת ערוצי פרסום</p>
          <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 ml-1" /> הוסף ערוץ ראשון</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {(channels ?? []).map(ch => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              businessId={businessId!}
              onDelete={() => deleteChannel.mutate({ id: ch.id, businessId: businessId! })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardAdBudget;
