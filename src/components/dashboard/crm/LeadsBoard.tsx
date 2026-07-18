import { useMemo } from "react";
import { Phone, MessageCircle, ChevronLeft, ChevronRight, Inbox, Loader2, BellRing, Bell } from "lucide-react";
import { usePipeline, useMoveCard, useSetFollowUp, type PipelineCard, type PipelineStage } from "@/hooks/useCrm";

/**
 * Leads pipeline board (real estate / car / any lead vertical). Columns = the
 * pipeline's data-driven stages; cards move between stages. Feature-gated on the
 * "listings" module. Needs the CRM migration applied + a pipeline row.
 *
 * Follow-ups: each lead can carry a follow_up_at date (already in the schema). The
 * merchant sets it per card, a "לחזור אליהם" strip surfaces what's due today/overdue,
 * and the leads-followup-run cron emails a daily digest of due leads.
 */

const DEFAULT_STAGES: PipelineStage[] = [
  { key: "new", label: "חדש" },
  { key: "contacted", label: "יצרנו קשר" },
  { key: "viewing", label: "תואם ביקור" },
  { key: "offer", label: "הצעה" },
  { key: "closed_won", label: "נסגר", is_won: true },
];

const DAY = 86_400_000;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const endOfToday = () => startOfToday() + DAY - 1;

// Urgency of a follow-up date relative to today.
type Urgency = "overdue" | "today" | "soon" | "later" | null;
function urgencyOf(iso: string | null): Urgency {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (t < startOfToday()) return "overdue";
  if (t <= endOfToday()) return "today";
  if (t <= endOfToday() + 3 * DAY) return "soon";
  return "later";
}
const URGENCY_CLS: Record<Exclude<Urgency, null>, string> = {
  overdue: "bg-red-100 text-red-700",
  today: "bg-amber-100 text-amber-700",
  soon: "bg-blue-100 text-blue-700",
  later: "bg-muted text-muted-foreground",
};
function followUpLabel(iso: string): string {
  const t = new Date(iso).getTime();
  const days = Math.round((t - startOfToday()) / DAY);
  if (days < 0) return `באיחור ${Math.abs(days)} ימים`;
  if (days === 0) return "היום";
  if (days === 1) return "מחר";
  return `בעוד ${days} ימים`;
}

function waLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

const LeadsBoard = ({ businessId }: { businessId: string }) => {
  const { data, isLoading } = usePipeline(businessId);
  const move = useMoveCard();
  const setFollowUp = useSetFollowUp();

  const stages = data?.pipeline?.stages?.length ? data.pipeline.stages : DEFAULT_STAGES;
  const cards = data?.cards ?? [];

  const byStage = useMemo(() => {
    const m: Record<string, PipelineCard[]> = {};
    for (const s of stages) m[s.key] = [];
    for (const c of cards) (m[c.stage_key] ??= []).push(c);
    return m;
  }, [cards, stages]);

  // Due = open leads whose follow-up is today or earlier.
  const due = useMemo(
    () => cards
      .filter((c) => c.status === "open" && c.follow_up_at && new Date(c.follow_up_at).getTime() <= endOfToday())
      .sort((a, b) => new Date(a.follow_up_at!).getTime() - new Date(b.follow_up_at!).getTime()),
    [cards],
  );

  const stageIndex = (k: string) => stages.findIndex((s) => s.key === k);
  const shift = (c: PipelineCard, dir: -1 | 1) => {
    const i = stageIndex(c.stage_key);
    const next = stages[i + dir];
    if (!next) return;
    move.mutate({ cardId: c.id, stageKey: next.key, status: next.is_won ? "won" : next.is_lost ? "lost" : "open" });
  };

  // Quick-set a follow-up N days out (0 = today), or clear (null).
  const setFU = (cardId: string, days: number | null) => {
    if (days === null) { setFollowUp.mutate({ cardId, at: null }); return; }
    const d = new Date(); d.setHours(9, 0, 0, 0); d.setTime(d.getTime() + days * DAY);
    setFollowUp.mutate({ cardId, at: d.toISOString() });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      {/* Reminders strip: leads to get back to today / overdue */}
      {due.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold text-sm">
            <BellRing className="w-4 h-4" /> לחזור אליהם ({due.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {due.map((c) => {
              const u = urgencyOf(c.follow_up_at);
              return (
                <div key={c.id} className="flex items-center gap-2 rounded-lg bg-card border border-border px-2.5 py-1.5">
                  <span className="text-xs font-medium text-foreground">{c.title || "ליד"}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${u ? URGENCY_CLS[u] : ""}`}>{followUpLabel(c.follow_up_at!)}</span>
                  <button onClick={() => setFU(c.id, null)} className="text-[10px] text-primary hover:underline" title="סמן כטופל">טופל</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cards.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Inbox className="w-8 h-8 mx-auto mb-2 opacity-60" />
          עדיין אין לידים. פניות מהאתר יופיעו כאן אוטומטית.
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((s) => (
          <div key={s.key} className="w-64 shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-sm font-bold text-foreground">{s.label}</span>
              <span className="text-xs text-muted-foreground">{byStage[s.key]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {(byStage[s.key] ?? []).map((c) => {
                const u = urgencyOf(c.follow_up_at);
                return (
                  <div key={c.id} className="p-3 rounded-xl border border-border bg-card">
                    <div className="font-medium text-foreground text-sm truncate">{c.contacts?.name || c.title || "ליד"}</div>
                    {c.title && c.contacts?.name && <div className="text-xs text-muted-foreground truncate">{c.title}</div>}
                    {c.value != null && <div className="text-xs text-primary font-bold mt-0.5">₪{c.value.toLocaleString()}</div>}

                    {/* Follow-up badge (if set) */}
                    {c.follow_up_at && (
                      <div className={`inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${u ? URGENCY_CLS[u] : ""}`}>
                        <Bell className="w-3 h-3" /> {followUpLabel(c.follow_up_at)}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
                        {c.contacts?.phone ? (
                          <>
                            <a href={`tel:${c.contacts.phone}`} className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary" title="חייג"><Phone className="w-3.5 h-3.5" /></a>
                            <a href={waLink(c.contacts.phone)} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary" title="וואטסאפ"><MessageCircle className="w-3.5 h-3.5" /></a>
                          </>
                        ) : (
                          <>
                            <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground/40" title="אין מספר טלפון"><Phone className="w-3.5 h-3.5" /></span>
                            <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground/40" title="אין מספר טלפון"><MessageCircle className="w-3.5 h-3.5" /></span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-0.5">
                        <button onClick={() => shift(c, -1)} disabled={stageIndex(c.stage_key) === 0} className="w-6 h-6 rounded text-muted-foreground disabled:opacity-30" title="שלב קודם"><ChevronRight className="w-4 h-4" /></button>
                        <button onClick={() => shift(c, 1)} disabled={stageIndex(c.stage_key) === stages.length - 1} className="w-6 h-6 rounded text-muted-foreground disabled:opacity-30" title="שלב הבא"><ChevronLeft className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {/* Set / change a reminder to get back to this lead */}
                    <select
                      value=""
                      onChange={(e) => { const v = e.target.value; if (v !== "") setFU(c.id, v === "clear" ? null : Number(v)); }}
                      className="mt-2 w-full text-[11px] rounded-md border border-border bg-background px-2 py-1 text-muted-foreground"
                      title="הגדר תזכורת לחזור לליד"
                    >
                      <option value="">🔔 תזכורת לחזור...</option>
                      <option value="0">היום</option>
                      <option value="1">מחר</option>
                      <option value="3">בעוד 3 ימים</option>
                      <option value="7">בעוד שבוע</option>
                      {c.follow_up_at && <option value="clear">בטל תזכורת</option>}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadsBoard;
