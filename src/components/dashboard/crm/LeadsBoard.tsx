import { useMemo } from "react";
import { Phone, MessageCircle, ChevronLeft, ChevronRight, Inbox, Loader2 } from "lucide-react";
import { usePipeline, useMoveCard, type PipelineCard, type PipelineStage } from "@/hooks/useCrm";

/**
 * Leads pipeline board (real estate / car / any lead vertical). Columns = the
 * pipeline's data-driven stages; cards move between stages. Feature-gated on the
 * "listings" module. Needs the CRM migration applied + a pipeline row.
 */

const DEFAULT_STAGES: PipelineStage[] = [
  { key: "new", label: "חדש" },
  { key: "contacted", label: "יצרנו קשר" },
  { key: "viewing", label: "תואם ביקור" },
  { key: "offer", label: "הצעה" },
  { key: "closed_won", label: "נסגר", is_won: true },
];

const LeadsBoard = ({ businessId }: { businessId: string }) => {
  const { data, isLoading } = usePipeline(businessId);
  const move = useMoveCard();

  const stages = data?.pipeline?.stages?.length ? data.pipeline.stages : DEFAULT_STAGES;
  const cards = data?.cards ?? [];

  const byStage = useMemo(() => {
    const m: Record<string, PipelineCard[]> = {};
    for (const s of stages) m[s.key] = [];
    for (const c of cards) (m[c.stage_key] ??= []).push(c);
    return m;
  }, [cards, stages]);

  const stageIndex = (k: string) => stages.findIndex((s) => s.key === k);
  const shift = (c: PipelineCard, dir: -1 | 1) => {
    const i = stageIndex(c.stage_key);
    const next = stages[i + dir];
    if (!next) return;
    move.mutate({ cardId: c.id, stageKey: next.key, status: next.is_won ? "won" : next.is_lost ? "lost" : "open" });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
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
              {(byStage[s.key] ?? []).map((c) => (
                <div key={c.id} className="p-3 rounded-xl border border-border bg-card">
                  <div className="font-medium text-foreground text-sm truncate">{c.title || "ליד"}</div>
                  {c.value != null && <div className="text-xs text-primary font-bold mt-0.5">₪{c.value.toLocaleString()}</div>}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1">
                      <a className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary" title="חייג"><Phone className="w-3.5 h-3.5" /></a>
                      <a className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary" title="וואטסאפ"><MessageCircle className="w-3.5 h-3.5" /></a>
                    </div>
                    <div className="flex gap-0.5">
                      <button onClick={() => shift(c, -1)} disabled={stageIndex(c.stage_key) === 0} className="w-6 h-6 rounded text-muted-foreground disabled:opacity-30" title="שלב קודם"><ChevronRight className="w-4 h-4" /></button>
                      <button onClick={() => shift(c, 1)} disabled={stageIndex(c.stage_key) === stages.length - 1} className="w-6 h-6 rounded text-muted-foreground disabled:opacity-30" title="שלב הבא"><ChevronLeft className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadsBoard;
