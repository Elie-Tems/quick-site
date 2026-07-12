import { useState } from "react";
import { Loader2, Armchair, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSynagogueSeats, useBuildSeatMap, useUpdateSeat, type Seat, type SeatStatus } from "@/hooks/useSynagogueSeats";

/**
 * Gabbai seat management (מקומות): define a layout (rows x seats + optional עזרת נשים),
 * generate the map, then click a seat to sell/assign it, set a price, and flag it for
 * the High Holidays. Needs the synagogue_seats migration (20260712150000).
 */

const ils = (n: number) => `₪${n.toLocaleString("he-IL")}`;
const STATUS_CLS: Record<SeatStatus, string> = {
  available: "bg-emerald-50 border-emerald-400 text-emerald-700",
  sold: "bg-muted border-border text-muted-foreground",
  held: "bg-amber-50 border-amber-400 border-dashed text-amber-700",
};

const SeatCell = ({ seat, active, onClick }: { seat: Seat; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    title={seat.holder_name || `שורה ${seat.row_num} · כיסא ${seat.seat_num}`}
    className={`relative w-7 h-7 rounded-md border text-[9px] flex items-center justify-center ${STATUS_CLS[seat.status]} ${active ? "ring-2 ring-primary" : ""}`}
  >
    {seat.seat_num}
    {seat.yamim_noraim && <span className="absolute -top-1 -right-1 text-[8px]">🍎</span>}
  </button>
);

const SynagogueSeatsManager = ({ businessId }: { businessId: string }) => {
  const { data, isLoading } = useSynagogueSeats(businessId);
  const build = useBuildSeatMap();
  const updateSeat = useUpdateSeat();

  const [form, setForm] = useState({ rows: "12", seatsPerRow: "4", womenRows: "6" });
  const [selected, setSelected] = useState<Seat | null>(null);

  const map = data?.map;
  const seats = data?.seats ?? [];
  const main = seats.filter((s) => s.section === "main");
  const women = seats.filter((s) => s.section === "women");
  const soldCount = seats.filter((s) => s.status === "sold").length;
  const revenue = seats.filter((s) => s.status === "sold").reduce((sum, s) => sum + Number(s.price), 0);

  const buildMap = () => {
    if (map && !window.confirm("בניית מפה מחדש תאפס את כל השיוכים הקיימים. להמשיך?")) return;
    build.mutate(
      { businessId, rows: Number(form.rows) || 1, seatsPerRow: Number(form.seatsPerRow) || 1, womenRows: Number(form.womenRows) || 0 },
      { onSuccess: () => toast.success("המפה נבנתה"), onError: () => toast.error("נכשל - ודאו שהמיגרציה רצה") },
    );
  };

  const saveSeat = (patch: Partial<Seat>) => {
    if (!selected) return;
    updateSeat.mutate({ businessId, id: selected.id, patch }, {
      onSuccess: () => { setSelected({ ...selected, ...patch } as Seat); toast.success("נשמר"); },
    });
  };

  const rowsOf = (list: Seat[]) => {
    const byRow: Record<number, Seat[]> = {};
    for (const s of list) (byRow[s.row_num] ??= []).push(s);
    return Object.entries(byRow).map(([r, arr]) => ({ row: Number(r), seats: arr.sort((a, b) => a.seat_num - b.seat_num) }));
  };

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Armchair className="w-5 h-5 text-primary" /> מקומות</h3>
        <p className="text-sm text-muted-foreground">בונים מפה, ואז לוחצים על כיסא כדי לשייך/למכור, לתמחר, ולסמן לימים נוראים.</p>
      </div>

      {/* Layout builder */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-2">
        <div className="text-sm font-medium text-foreground">{map ? "בניית מפה מחדש" : "הגדרת מפת ההושבה"}</div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="text-xs text-muted-foreground">טורים</label><Input type="number" value={form.rows} onChange={(e) => setForm({ ...form, rows: e.target.value })} /></div>
          <div><label className="text-xs text-muted-foreground">כיסאות בטור</label><Input type="number" value={form.seatsPerRow} onChange={(e) => setForm({ ...form, seatsPerRow: e.target.value })} /></div>
          <div><label className="text-xs text-muted-foreground">טורי עזרת נשים</label><Input type="number" value={form.womenRows} onChange={(e) => setForm({ ...form, womenRows: e.target.value })} /></div>
        </div>
        <Button onClick={buildMap} disabled={build.isPending}>
          {build.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (map ? "בנייה מחדש" : "בניית מפה")}
        </Button>
      </div>

      {map && seats.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "מקומות נמכרו", value: String(soldCount), color: "text-foreground" },
              { label: "פנויים", value: String(seats.length - soldCount), color: "text-emerald-600" },
              { label: "גויס ממקומות", value: ils(revenue), color: "text-amber-600" },
            ].map((k) => (
              <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* The map */}
          <div className="rounded-xl border border-border bg-card p-4 overflow-x-auto">
            <div className="text-center text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-1.5 mb-3">↑ מזרח · ארון קודש · בימה</div>
            <div className="flex flex-col items-center gap-1.5">
              {rowsOf(main).map(({ row, seats: rs }) => (
                <div key={`m${row}`} className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground w-4 text-center">{row}</span>
                  {rs.map((s) => <SeatCell key={s.id} seat={s} active={selected?.id === s.id} onClick={() => setSelected(s)} />)}
                </div>
              ))}
            </div>
            {women.length > 0 && (
              <>
                <div className="text-center text-[10px] text-muted-foreground mt-3 mb-2 border-t border-dashed border-border pt-2">— עזרת נשים —</div>
                <div className="flex flex-col items-center gap-1.5">
                  {rowsOf(women).map(({ row, seats: rs }) => (
                    <div key={`w${row}`} className="flex items-center gap-1.5">
                      <span className="text-[9px] text-muted-foreground w-4 text-center">{row}</span>
                      {rs.map((s) => <SeatCell key={s.id} seat={s} active={selected?.id === s.id} onClick={() => setSelected(s)} />)}
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="flex gap-3 flex-wrap mt-4 text-[11px] text-muted-foreground justify-center">
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-400" /> פנוי</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted border border-border" /> נמכר</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-50 border border-dashed border-amber-400" /> משוריין</span>
              <span className="inline-flex items-center gap-1">🍎 לימים נוראים</span>
            </div>
          </div>

          {/* Seat editor */}
          {selected && (
            <div className="rounded-xl border border-primary/40 bg-card p-4 space-y-2">
              <div className="text-sm font-bold text-foreground">
                {selected.section === "women" ? "עזרת נשים · " : ""}שורה {selected.row_num} · כיסא {selected.seat_num}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <Input placeholder="שם בעל המקום" value={selected.holder_name ?? ""} onChange={(e) => setSelected({ ...selected, holder_name: e.target.value })} />
                <Input placeholder="טלפון" value={selected.holder_phone ?? ""} onChange={(e) => setSelected({ ...selected, holder_phone: e.target.value })} />
                <Input placeholder="מחיר ₪" type="number" value={selected.price || ""} onChange={(e) => setSelected({ ...selected, price: Number(e.target.value) })} />
                <select value={selected.status} onChange={(e) => setSelected({ ...selected, status: e.target.value as SeatStatus })}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <option value="available">פנוי</option><option value="sold">נמכר</option><option value="held">משוריין</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={selected.yamim_noraim} onChange={(e) => setSelected({ ...selected, yamim_noraim: e.target.checked })} />
                מקום לימים נוראים 🍎
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveSeat({ holder_name: selected.holder_name, holder_phone: selected.holder_phone, price: selected.price, status: selected.status, yamim_noraim: selected.yamim_noraim })} disabled={updateSeat.isPending}>
                  {updateSeat.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 ml-1" /> שמירה</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(null)}>סגירה</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SynagogueSeatsManager;
