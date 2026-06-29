import { useState } from "react";
import {
  Type, SquareIcon, Image as ImageIcon, LayoutPanelTop, Minus, MoveVertical,
  Columns2, ShoppingBag, ArrowUp, ArrowDown, Copy, Trash2, ArrowRight, Eye, Save,
  Video, Share2, GripVertical,
} from "lucide-react";
import type { TemplateBlock } from "@/lib/emailTemplates";

// Block-based email/newsletter editor (build-only v1). Self-contained: blocks live
// in local state, render to a live email canvas, and can be added / selected /
// edited / reordered / duplicated / deleted. Sending + persistence wire up later
// (shared backbone + Resend). The compliance footer (פרסומת + sender + unsubscribe)
// is locked and always present per Israeli spam law.

type BlockType = "text" | "button" | "image" | "banner" | "divider" | "spacer" | "columns" | "products" | "video" | "social";
interface Block { id: string; type: BlockType; props: Record<string, any>; }

const PALETTE: { type: BlockType; label: string; icon: typeof Type }[] = [
  { type: "text", label: "טקסט", icon: Type },
  { type: "image", label: "תמונה", icon: ImageIcon },
  { type: "button", label: "כפתור", icon: SquareIcon },
  { type: "products", label: "מוצרים", icon: ShoppingBag },
  { type: "banner", label: "באנר", icon: LayoutPanelTop },
  { type: "columns", label: "עמודות", icon: Columns2 },
  { type: "video", label: "וידאו", icon: Video },
  { type: "social", label: "רשתות", icon: Share2 },
  { type: "divider", label: "קו מפריד", icon: Minus },
  { type: "spacer", label: "רווח", icon: MoveVertical },
];

const DEFAULTS: Record<BlockType, Record<string, any>> = {
  text: { text: "כתבו כאן את הטקסט שלכם...", align: "right", size: 15, color: "#333333" },
  button: { text: "לחצו כאן", url: "", color: "#0E9F6E", align: "center" },
  image: { url: "", alt: "תמונה" },
  banner: { title: "כותרת הבאנר", bg: "#0E9F6E" },
  divider: {},
  spacer: { height: 24 },
  columns: { count: 2 },
  products: { count: 2 },
  video: { url: "" },
  social: {},
};

let counter = 0;
const newId = () => `b${++counter}_${Math.random().toString(36).slice(2, 6)}`;

interface Props { onBack?: () => void; onContinue?: (blocks: Block[]) => void; initialBlocks?: TemplateBlock[]; }

const DEFAULT_SEED: TemplateBlock[] = [
  { type: "banner", props: { ...DEFAULTS.banner, title: "מבצע סוף עונה" } },
  { type: "text", props: { ...DEFAULTS.text, text: "שלום {{שם}}! ריכזנו עבורך את המבצעים השבוע." } },
  { type: "button", props: { ...DEFAULTS.button, text: "לקנייה עכשיו" } },
];

const DashboardEmailEditor = ({ onBack, onContinue, initialBlocks }: Props) => {
  const [blocks, setBlocks] = useState<Block[]>(() =>
    (initialBlocks && initialBlocks.length ? initialBlocks : DEFAULT_SEED).map((b) => ({
      id: newId(), type: b.type as BlockType, props: { ...b.props },
    })),
  );
  const [selected, setSelected] = useState<string | null>(null);

  const add = (type: BlockType) => {
    const b: Block = { id: newId(), type, props: { ...DEFAULTS[type] } };
    setBlocks((prev) => [...prev, b]);
    setSelected(b.id);
  };
  const update = (id: string, patch: Record<string, any>) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...patch } } : b)));
  const remove = (id: string) => { setBlocks((prev) => prev.filter((b) => b.id !== id)); setSelected(null); };
  const duplicate = (id: string) => setBlocks((prev) => {
    const i = prev.findIndex((b) => b.id === id); if (i < 0) return prev;
    const copy = { ...prev[i], id: newId(), props: { ...prev[i].props } };
    return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
  });
  const move = (id: string, dir: -1 | 1) => setBlocks((prev) => {
    const i = prev.findIndex((b) => b.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= prev.length) return prev;
    const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });

  // ── Drag & drop: from the palette (new block) or within the canvas (reorder) ──
  const [dragType, setDragType] = useState<BlockType | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const insertAt = (type: BlockType, idx: number) => {
    const b: Block = { id: newId(), type, props: { ...DEFAULTS[type] } };
    setBlocks((prev) => { const n = [...prev]; n.splice(idx, 0, b); return n; });
    setSelected(b.id);
  };
  const moveTo = (id: string, idx: number) => setBlocks((prev) => {
    const from = prev.findIndex((b) => b.id === id); if (from < 0) return prev;
    const n = [...prev]; const [it] = n.splice(from, 1);
    n.splice(from < idx ? idx - 1 : idx, 0, it); return n;
  });
  const handleDrop = (idx: number) => {
    if (dragType) insertAt(dragType, idx);
    else if (dragId) moveTo(dragId, idx);
    setDragType(null); setDragId(null); setDropIdx(null);
  };
  const dragging = dragType !== null || dragId !== null;
  const DropZone = ({ idx }: { idx: number }) => (
    <div
      onDragOver={(e) => { if (dragging) { e.preventDefault(); if (dropIdx !== idx) setDropIdx(idx); } }}
      onDrop={(e) => { e.preventDefault(); handleDrop(idx); }}
      style={{ height: dragging ? 12 : 0, transition: "height .1s" }}
    >
      <div style={{ height: 2, background: dropIdx === idx ? "#0E9F6E" : "transparent", margin: "5px 0" }} />
    </div>
  );

  const sel = blocks.find((b) => b.id === selected) || null;

  const renderBlock = (b: Block) => {
    const p = b.props;
    switch (b.type) {
      case "banner":
        return <div style={{ background: p.bg, color: "#fff", padding: "28px 16px", textAlign: "center", fontWeight: 700, fontSize: 18 }}>{p.title}</div>;
      case "text":
        return <div style={{ padding: "10px 16px", textAlign: p.align, fontSize: p.size, color: p.color, lineHeight: 1.6 }}>{p.text}</div>;
      case "button":
        return <div style={{ padding: "12px 16px", textAlign: p.align }}><span style={{ display: "inline-block", background: p.color, color: "#fff", fontWeight: 700, borderRadius: 6, padding: "10px 26px", fontSize: 14 }}>{p.text}</span></div>;
      case "image":
        return p.url
          ? <img src={p.url} alt={p.alt} style={{ width: "100%", display: "block" }} />
          : <div style={{ background: "#f1f3f5", height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}><ImageIcon className="w-6 h-6" /></div>;
      case "divider":
        return <div style={{ padding: "6px 16px" }}><div style={{ borderTop: "1px solid #e5e7eb" }} /></div>;
      case "spacer":
        return <div style={{ height: p.height }} />;
      case "columns":
        return <div style={{ display: "flex", gap: 10, padding: "10px 16px" }}>{Array.from({ length: p.count }).map((_, i) => <div key={i} style={{ flex: 1, background: "#f1f3f5", height: 70, borderRadius: 6 }} />)}</div>;
      case "products":
        return <div style={{ display: "flex", gap: 10, padding: "10px 16px" }}>{Array.from({ length: p.count }).map((_, i) => <div key={i} style={{ flex: 1 }}><div style={{ background: "#f1f3f5", height: 70, borderRadius: 6 }} /><div style={{ fontSize: 11, color: "#111", marginTop: 4 }}>מוצר · ₪{(i + 1) * 49}</div></div>)}</div>;
      case "video":
        return <div style={{ padding: "10px 16px" }}><div style={{ background: "#111827", borderRadius: 8, aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.9)", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", borderRight: "13px solid #111827", marginRight: -2 }} /></div></div></div>;
      case "social":
        return <div style={{ display: "flex", gap: 12, justifyContent: "center", padding: "12px 16px" }}>{["IG", "FB", "WA"].map((s) => <div key={s} style={{ width: 30, height: 30, borderRadius: "50%", background: "#0E9F6E", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{s}</div>)}</div>;
      default: return null;
    }
  };

  return (
    <div dir="rtl" className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-4 h-4" /> חזרה
        </button>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-1.5"><Eye className="w-4 h-4" /> תצוגה</button>
          <button className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-3 py-1.5"><Save className="w-4 h-4" /> שמירה</button>
          <button onClick={() => onContinue?.(blocks)} className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground rounded-lg px-3 py-1.5">המשך לשליחה</button>
        </div>
      </div>

      <div className="flex gap-3 min-h-[460px]">
        {/* Palette */}
        <div className="w-[120px] shrink-0 rounded-xl border border-border bg-card p-2.5">
          <div className="text-[11px] text-muted-foreground mb-2">גררו לקנבס · או הקליקו</div>
          <div className="grid grid-cols-2 gap-1.5">
            {PALETTE.map((it) => (
              <button
                key={it.type}
                draggable
                onDragStart={() => setDragType(it.type)}
                onDragEnd={() => { setDragType(null); setDropIdx(null); }}
                onClick={() => add(it.type)}
                className="rounded-lg border border-border p-2 text-center hover:border-primary/40 transition-colors cursor-grab active:cursor-grabbing"
              >
                <it.icon className="w-4 h-4 mx-auto" />
                <div className="text-[10px] mt-1">{it.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-w-0 rounded-xl bg-[#dfe3e8] p-4 flex justify-center overflow-auto">
          <div className="w-[320px] bg-white rounded-lg overflow-hidden shadow self-start">
            {blocks.map((b, i) => (
              <div key={b.id}>
                <DropZone idx={i} />
                <div
                  draggable
                  onDragStart={() => setDragId(b.id)}
                  onDragEnd={() => { setDragId(null); setDropIdx(null); }}
                  onClick={() => setSelected(b.id)}
                  className="relative cursor-pointer"
                  style={{ outline: selected === b.id ? "2px solid #0E9F6E" : "none", outlineOffset: -2 }}
                >
                  {renderBlock(b)}
                  {selected === b.id && (
                    <div className="absolute -top-3 left-1 flex items-center gap-0.5 bg-[#0E9F6E] rounded px-1 py-0.5" onClick={(e) => e.stopPropagation()}>
                      <GripVertical className="w-3 h-3 text-white/70 cursor-grab" />
                      <button onClick={() => move(b.id, -1)} title="מעלה"><ArrowUp className="w-3 h-3 text-white" /></button>
                      <button onClick={() => move(b.id, 1)} title="מטה"><ArrowDown className="w-3 h-3 text-white" /></button>
                      <button onClick={() => duplicate(b.id)} title="שכפול"><Copy className="w-3 h-3 text-white" /></button>
                      <button onClick={() => remove(b.id)} title="מחיקה"><Trash2 className="w-3 h-3 text-white" /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <DropZone idx={blocks.length} />
            {/* Locked compliance footer */}
            <div style={{ background: "#f6f7f8", padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#888", lineHeight: 1.5 }}><b>פרסומת</b> · {"{{שם_העסק}}"} · {"{{כתובת}}"}</div>
              <div style={{ fontSize: 10, color: "#0E9F6E", marginTop: 2 }}>להסרה מרשימת התפוצה</div>
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="w-[150px] shrink-0 rounded-xl border border-border bg-card p-3">
          {!sel ? (
            <div className="text-[11px] text-muted-foreground">בחרו בלוק כדי לערוך</div>
          ) : (
            <div className="space-y-3">
              <div className="text-[11px] text-muted-foreground">מאפיינים · {PALETTE.find((x) => x.type === sel.type)?.label}</div>
              {(sel.type === "text" || sel.type === "button" || sel.type === "banner") && (
                <Field label={sel.type === "banner" ? "כותרת" : "כיתוב"}>
                  <input value={sel.props.text ?? sel.props.title ?? ""} onChange={(e) => update(sel.id, sel.type === "banner" ? { title: e.target.value } : { text: e.target.value })} className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs" />
                </Field>
              )}
              {sel.type === "button" && (
                <Field label="קישור"><input value={sel.props.url} onChange={(e) => update(sel.id, { url: e.target.value })} placeholder="https://..." className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs" dir="ltr" /></Field>
              )}
              {sel.type === "image" && (
                <Field label="כתובת תמונה"><input value={sel.props.url} onChange={(e) => update(sel.id, { url: e.target.value })} placeholder="העלאה / AI / קישור" className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs" dir="ltr" /></Field>
              )}
              {sel.type === "video" && (
                <Field label="קישור וידאו (YouTube)"><input value={sel.props.url} onChange={(e) => update(sel.id, { url: e.target.value })} placeholder="https://youtu.be/..." className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs" dir="ltr" /></Field>
              )}
              {sel.type === "social" && (
                <div className="text-[11px] text-muted-foreground">אייקוני הרשתות מתחברים אוטומטית לקישורים של החנות.</div>
              )}
              {(sel.type === "button" || sel.type === "banner") && (
                <Field label="צבע">
                  <div className="flex gap-1.5">
                    {["#0E9F6E", "#7C3AED", "#111827", "#E24B4A"].map((c) => (
                      <button key={c} onClick={() => update(sel.id, sel.type === "banner" ? { bg: c } : { color: c })} style={{ background: c }} className={`w-5 h-5 rounded ${(sel.props.color === c || sel.props.bg === c) ? "ring-2 ring-foreground" : ""}`} />
                    ))}
                  </div>
                </Field>
              )}
              {(sel.type === "text" || sel.type === "button") && (
                <Field label="יישור">
                  <div className="flex gap-1">
                    {["right", "center", "left"].map((a) => (
                      <button key={a} onClick={() => update(sel.id, { align: a })} className={`flex-1 h-7 rounded text-[10px] border ${sel.props.align === a ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{a === "right" ? "ימין" : a === "center" ? "מרכז" : "שמאל"}</button>
                    ))}
                  </div>
                </Field>
              )}
              {(sel.type === "spacer") && (
                <Field label={`גובה (${sel.props.height}px)`}><input type="range" min={8} max={80} value={sel.props.height} onChange={(e) => update(sel.id, { height: Number(e.target.value) })} className="w-full" /></Field>
              )}
              {(sel.type === "columns" || sel.type === "products") && (
                <Field label="מספר טורים">
                  <div className="flex gap-1">{[1, 2, 3].map((n) => <button key={n} onClick={() => update(sel.id, { count: n })} className={`flex-1 h-7 rounded text-xs border ${sel.props.count === n ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{n}</button>)}</div>
                </Field>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">הפוטר (פרסומת + פרטי שולח + הסרה) נעול בכל מייל - ציות חוק הספאם.</p>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><div className="text-[11px] text-muted-foreground mb-1">{label}</div>{children}</div>
);

export default DashboardEmailEditor;
