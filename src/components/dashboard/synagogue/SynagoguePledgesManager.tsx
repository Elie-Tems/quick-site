import { useState } from "react";
import { Plus, Loader2, ScrollText, Check, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  useSynagoguePledges, useCreatePledge, useUpdatePledgeStatus, type PledgeType,
} from "@/hooks/useSynagoguePledges";

/**
 * Gabbai view: record aliyot & nedarim as pledges (התחייבות -> חוב), then settle
 * them. This is the heart of the synagogue vertical - nobody buys an aliyah in
 * advance; the gabbai logs who committed to what, and it becomes an open debt.
 * Needs the synagogue_pledges migration (20260712140000).
 */

const TYPE_LABEL: Record<PledgeType, string> = { aliyah: "עלייה", neder: "נדר", other: "אחר" };
const ils = (n: number) => `₪${n.toLocaleString("he-IL")}`;

const SynagoguePledgesManager = ({ businessId }: { businessId: string }) => {
  const { data: pledges = [], isLoading } = useSynagoguePledges(businessId);
  const create = useCreatePledge();
  const setStatus = useUpdatePledgeStatus();

  const [draft, setDraft] = useState<{ memberName: string; memberPhone: string; pledgeType: PledgeType; label: string; amount: string }>(
    { memberName: "", memberPhone: "", pledgeType: "aliyah", label: "", amount: "" },
  );

  const open = pledges.filter((p) => p.status === "open");
  const paid = pledges.filter((p) => p.status === "paid");
  const openTotal = open.reduce((s, p) => s + Number(p.amount), 0);

  const add = () => {
    if (!draft.memberName.trim() || !draft.amount) { toast.error("שם ומספר סכום חובה"); return; }
    create.mutate(
      { businessId, memberName: draft.memberName.trim(), memberPhone: draft.memberPhone.trim() || undefined,
        pledgeType: draft.pledgeType, label: draft.label.trim() || undefined, amount: Number(draft.amount) },
      {
        onSuccess: () => { setDraft({ memberName: "", memberPhone: "", pledgeType: "aliyah", label: "", amount: "" }); toast.success("ההתחייבות נרשמה"); },
        onError: () => toast.error("שמירה נכשלה - ודאו שהמיגרציה רצה"),
      },
    );
  };

  const settle = (id: string, status: "paid" | "cancelled") =>
    setStatus.mutate({ businessId, id, status }, { onSuccess: () => toast.success(status === "paid" ? "סומן כשולם" : "בוטל") });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><ScrollText className="w-5 h-5 text-primary" /> עליות ונדרים</h3>
        <p className="text-sm text-muted-foreground">רישום התחייבות הופך אותה לחוב פתוח של המתפלל. מסמנים "שולם" כשנגבה.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "פתוח לגבייה", value: ils(openTotal), color: "text-amber-600" },
          { label: "התחייבויות פתוחות", value: String(open.length), color: "text-foreground" },
          { label: "נגבו", value: String(paid.length), color: "text-green-600" },
        ].map((k) => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Record a new pledge */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-2">
        <div className="text-sm font-medium text-foreground">רישום התחייבות חדשה</div>
        <div className="grid sm:grid-cols-2 gap-2">
          <Input placeholder="שם המתפלל" value={draft.memberName} onChange={(e) => setDraft({ ...draft, memberName: e.target.value })} />
          <Input placeholder="טלפון (לתזכורת)" value={draft.memberPhone} onChange={(e) => setDraft({ ...draft, memberPhone: e.target.value })} />
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          <select value={draft.pledgeType} onChange={(e) => setDraft({ ...draft, pledgeType: e.target.value as PledgeType })}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="aliyah">עלייה</option><option value="neder">נדר</option><option value="other">אחר</option>
          </select>
          <Input placeholder="פירוט (מפטיר / לרפואת...)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <Input placeholder="סכום ₪" type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
        </div>
        <Button onClick={add} disabled={create.isPending}>
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 ml-1" /> רישום התחייבות</>}
        </Button>
      </div>

      {/* Open debts */}
      <div>
        <div className="text-sm font-semibold text-foreground mb-2">פתוח לגבייה ({open.length})</div>
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
        <div className="space-y-2">
          {open.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <span className="text-[10px] font-bold rounded px-2 py-0.5 bg-amber-100 text-amber-700 shrink-0">{TYPE_LABEL[p.pledge_type]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{p.member_name}{p.label ? ` · ${p.label}` : ""}</div>
                {p.member_phone && <a href={`tel:${p.member_phone}`} className="text-xs text-primary inline-flex items-center gap-1"><Phone className="w-3 h-3" />{p.member_phone}</a>}
              </div>
              <span className="text-sm font-bold text-amber-700 shrink-0">{ils(Number(p.amount))}</span>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => settle(p.id, "paid")} title="סמן כשולם" className="w-7 h-7 rounded-lg bg-green-100 text-green-700 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                <button onClick={() => settle(p.id, "cancelled")} title="ביטול" className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {!isLoading && open.length === 0 && <p className="text-sm text-muted-foreground">אין התחייבויות פתוחות.</p>}
        </div>
      </div>

      {/* Recently settled */}
      {paid.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-muted-foreground mb-2">נגבו לאחרונה</div>
          <div className="space-y-1">
            {paid.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs text-muted-foreground px-3 py-1.5">
                <span>{p.member_name}{p.label ? ` · ${p.label}` : ""}</span>
                <span className="text-green-600 font-medium">{ils(Number(p.amount))} ✓</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SynagoguePledgesManager;
