import { useState, useMemo, useEffect } from "react";
import { Plus, Phone, MessageCircle, Calendar, ChevronLeft, X, AlertCircle, Clock, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { usePipeline, useContacts, useMoveCard, useSetFollowUp, useCreateLead, type PipelineCard } from "@/hooks/useCrm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

const waLink = (phone: string, text?: string) => {
  const n = phone.replace(/\D/g, "").replace(/^0/, "972");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short" });

const DEFAULT_STAGES = [
  { key: "new",       label: "פנייה חדשה",   color: "#6366f1" },
  { key: "interest",  label: "בדיקת עניין",  color: "#0ea5e9" },
  { key: "visit",     label: "ביקור בנכס",   color: "#f59e0b" },
  { key: "nego",      label: 'מו"מ',          color: "#f97316" },
  { key: "signed",    label: "חתימה",         color: "#10b981", is_won: true },
  { key: "lost",      label: "לא רלוונטי",   color: "#94a3b8", is_lost: true },
];

interface AddLeadFormProps {
  pipelineId: string;
  businessId: string;
  stageKey: string;
  onClose: () => void;
}

function AddLeadForm({ pipelineId, businessId, stageKey, onClose }: AddLeadFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const createLead = useCreateLead();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createLead.mutateAsync({
        businessId, pipelineId, stageKey,
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        title: title.trim() || undefined,
        value: value ? Number(value) : undefined,
      });
      toast.success("ליד נוסף בהצלחה");
      onClose();
    } catch {
      toast.error("שגיאה בהוספת ליד");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl p-5" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">הוסף ליד חדש</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="שם *" className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="טלפון" type="tel" className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="מייל" type="email" className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="תיאור (נכס, איזור...)" className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          <input value={value} onChange={e => setValue(e.target.value)} placeholder="ערך עסקה (₪)" type="number" className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={createLead.isPending}
              className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2">
              {createLead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "הוסף ליד"}
            </button>
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-border text-sm">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CardDetailProps {
  card: PipelineCard;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  stageName: string;
  onClose: () => void;
  onMoveToStage: (stageKey: string, status?: "open" | "won" | "lost") => void;
  stages: typeof DEFAULT_STAGES;
}

function CardDetail({ card, contactName, contactPhone, contactEmail, stageName, onClose, onMoveToStage, stages }: CardDetailProps) {
  const setFollowUp = useSetFollowUp();
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!card.contact_id) return;
    sb.from("contacts").select("notes").eq("id", card.contact_id).single()
      .then(({ data }: any) => { if (data?.notes) setNotes(data.notes); });
  }, [card.contact_id]);

  const saveNotes = async () => {
    if (!card.contact_id) return;
    await sb.from("contacts").update({ notes }).eq("id", card.contact_id);
    toast.success("הערות נשמרו");
  };

  const followUpDate = card.follow_up_at ? new Date(card.follow_up_at) : null;
  const isOverdue = followUpDate && followUpDate < new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-card border-r border-border shadow-2xl overflow-y-auto" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{contactName}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Stage badge */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            {stageName}
          </div>

          {/* Stats */}
          {card.value && (
            <div className="rounded-xl bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-0.5">ערך עסקה</p>
              <p className="text-2xl font-bold text-foreground">{fmtPrice(card.value)}</p>
            </div>
          )}

          {/* Contact actions */}
          {(contactPhone || contactEmail) && (
            <div className="flex flex-wrap gap-2">
              {contactPhone && (
                <>
                  <a href={waLink(contactPhone)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm rounded-lg bg-primary text-primary-foreground px-3 py-2 hover:opacity-90">
                    <MessageCircle className="w-4 h-4" /> וואטסאפ
                  </a>
                  <a href={telLink(contactPhone)}
                    className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-border px-3 py-2 hover:bg-muted">
                    <Phone className="w-4 h-4" /> {contactPhone}
                  </a>
                </>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-border px-3 py-2 hover:bg-muted">
                  {contactEmail}
                </a>
              )}
            </div>
          )}

          {/* Follow-up */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> תזכורת מעקב
              {isOverdue && <span className="text-xs text-rose-500 font-medium">· באיחור</span>}
            </p>
            <input
              type="date"
              defaultValue={card.follow_up_at ? card.follow_up_at.slice(0, 10) : ""}
              onChange={async (e) => {
                await setFollowUp.mutateAsync({ cardId: card.id, at: e.target.value || null });
                toast.success(e.target.value ? "תזכורת נקבעה" : "תזכורת בוטלה");
              }}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>

          {/* Move stage */}
          <div>
            <p className="text-sm font-medium mb-2">העבר לשלב</p>
            <div className="flex flex-wrap gap-2">
              {stages.filter(s => s.key !== card.stage_key).map(s => (
                <button key={s.key} onClick={() => { onMoveToStage(s.key, s.is_won ? "won" : s.is_lost ? "lost" : "open"); onClose(); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-sm font-medium mb-2">הערות</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="הערות על הליד - העדפות, שיחות, פרטים חשובים..."
              rows={4}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const DashboardLeadsPipeline = ({ businessId }: { businessId?: string }) => {
  const { data, isLoading } = usePipeline(businessId);
  const { data: contacts = [] } = useContacts(businessId);
  const moveCard = useMoveCard();
  const [addingToStage, setAddingToStage] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<PipelineCard | null>(null);
  const [creatingPipeline, setCreatingPipeline] = useState(false);

  const pipeline = data?.pipeline ?? null;
  const cards = data?.cards ?? [];
  const stages = pipeline?.stages ?? DEFAULT_STAGES;

  const contactMap = useMemo(() => {
    const m = new Map<string, typeof contacts[0]>();
    contacts.forEach(c => m.set(c.id, c));
    return m;
  }, [contacts]);

  const cardsByStage = useMemo(() => {
    const m = new Map<string, PipelineCard[]>();
    stages.forEach(s => m.set(s.key, []));
    cards.filter(c => c.status === "open").forEach(c => {
      const list = m.get(c.stage_key) ?? [];
      list.push(c);
      m.set(c.stage_key, list);
    });
    return m;
  }, [cards, stages]);

  const totalValue = useMemo(() =>
    cards.filter(c => c.status === "open" && c.value).reduce((s, c) => s + (c.value ?? 0), 0),
    [cards]
  );
  const wonValue = useMemo(() =>
    cards.filter(c => c.status === "won" && c.value).reduce((s, c) => s + (c.value ?? 0), 0),
    [cards]
  );

  const createDefaultPipeline = async () => {
    if (!businessId) return;
    setCreatingPipeline(true);
    try {
      const { data: pipe, error } = await sb.from("pipelines").insert({
        business_id: businessId,
        vertical: "realestate",
        name: "ניהול לידים",
        stages: DEFAULT_STAGES,
        is_default: true,
      }).select("id").single();
      if (error) throw error;
      toast.success("Pipeline נוצר בהצלחה");
    } catch {
      toast.error("שגיאה ביצירת pipeline");
    } finally {
      setCreatingPipeline(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4" dir="rtl">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <ArrowRight className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold mb-2">טרם הוגדר לוח לידים</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          לוח הלידים עוקב אחרי כל פנייה - מהפנייה הראשונה ועד חתימה על העסקה
        </p>
        <button
          onClick={createDefaultPipeline}
          disabled={creatingPipeline}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:opacity-90"
        >
          {creatingPipeline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          צור לוח לידים
        </button>
      </div>
    );
  }

  const overdueCards = cards.filter(c => c.status === "open" && c.follow_up_at && new Date(c.follow_up_at) < new Date());

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">לוח לידים</h1>
        <button
          onClick={() => setAddingToStage(stages[0]?.key ?? "new")}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> ליד חדש
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-card border border-border p-4 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-primary" />
          <p className="text-xs text-muted-foreground mb-1">לידים פעילים</p>
          <p className="text-2xl font-bold">{cards.filter(c => c.status === "open").length}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-emerald-500" />
          <p className="text-xs text-muted-foreground mb-1">עסקאות שנסגרו</p>
          <p className="text-2xl font-bold">{cards.filter(c => c.status === "won").length}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-amber-500" />
          <p className="text-xs text-muted-foreground mb-1">שווי צבר</p>
          <p className="text-xl font-bold">{totalValue > 0 ? fmtPrice(totalValue) : "—"}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-emerald-500" />
          <p className="text-xs text-muted-foreground mb-1">שווי עסקאות שנסגרו</p>
          <p className="text-xl font-bold">{wonValue > 0 ? fmtPrice(wonValue) : "—"}</p>
        </div>
      </div>

      {/* Overdue reminders */}
      {overdueCards.length > 0 && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-3 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-700 dark:text-rose-400">
            {overdueCards.length} {overdueCards.length === 1 ? "ליד" : "לידים"} עם תזכורת שעברה -{" "}
            {overdueCards.map(c => contactMap.get(c.contact_id)?.name ?? "ללא שם").join(", ")}
          </p>
        </div>
      )}

      {/* Kanban board - horizontal scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {stages.map((stage) => {
            const stageCards = cardsByStage.get(stage.key) ?? [];
            return (
              <div key={stage.key} className="w-64 flex flex-col gap-2">
                {/* Column header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: stage.color }} />
                    <span className="text-sm font-medium text-foreground">{stage.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{stageCards.length}</span>
                  </div>
                  <button
                    onClick={() => setAddingToStage(stage.key)}
                    className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[80px]">
                  {stageCards.map((card) => {
                    const contact = contactMap.get(card.contact_id);
                    const followUpDate = card.follow_up_at ? new Date(card.follow_up_at) : null;
                    const isOverdue = followUpDate && followUpDate < new Date();
                    const isDueToday = followUpDate && !isOverdue &&
                      followUpDate.toDateString() === new Date().toDateString();

                    return (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className="w-full rounded-xl border border-border bg-card p-3 text-right hover:border-primary/40 hover:shadow-sm transition-all group"
                      >
                        <p className="text-sm font-medium text-foreground mb-1 truncate">
                          {contact?.name ?? card.title ?? "ליד"}
                        </p>
                        {card.title && contact?.name && (
                          <p className="text-xs text-muted-foreground truncate mb-1">{card.title}</p>
                        )}
                        {card.value && (
                          <p className="text-xs font-semibold text-primary mb-1.5 tabular-nums">{fmtPrice(card.value)}</p>
                        )}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          {contact?.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {contact.phone}
                            </span>
                          )}
                          {followUpDate && (
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-rose-500" : isDueToday ? "text-amber-500" : "text-muted-foreground"}`}>
                              {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                              {fmtDate(card.follow_up_at!)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {stageCards.length === 0 && (
                    <button
                      onClick={() => setAddingToStage(stage.key)}
                      className="w-full rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      + הוסף ליד
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Won/Lost summary */}
      {cards.filter(c => c.status !== "open").length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium mb-3">עסקאות שנסגרו</p>
          <div className="space-y-2">
            {cards.filter(c => c.status !== "open").map(card => {
              const contact = contactMap.get(card.contact_id);
              return (
                <div key={card.id} className="flex items-center gap-3 text-sm">
                  {card.status === "won"
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <X className="w-4 h-4 text-muted-foreground shrink-0" />
                  }
                  <span className="flex-1 truncate">{contact?.name ?? "ליד"}</span>
                  {card.value && <span className="tabular-nums text-muted-foreground">{fmtPrice(card.value)}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${card.status === "won" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {card.status === "won" ? "נסגר" : "לא רלוונטי"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {addingToStage && pipeline && (
        <AddLeadForm
          pipelineId={pipeline.id}
          businessId={businessId!}
          stageKey={addingToStage}
          onClose={() => setAddingToStage(null)}
        />
      )}

      {selectedCard && (() => {
        const contact = contactMap.get(selectedCard.contact_id);
        const stageName = stages.find(s => s.key === selectedCard.stage_key)?.label ?? "";
        return (
          <CardDetail
            card={selectedCard}
            contactName={contact?.name ?? "ליד"}
            contactPhone={contact?.phone ?? ""}
            contactEmail={contact?.email ?? ""}
            stageName={stageName}
            onClose={() => setSelectedCard(null)}
            onMoveToStage={(stageKey, status) => {
              moveCard.mutate({ cardId: selectedCard.id, stageKey, status });
              setSelectedCard(null);
            }}
            stages={stages}
          />
        );
      })()}
    </div>
  );
};

export default DashboardLeadsPipeline;
