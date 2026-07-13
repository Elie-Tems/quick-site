import { useEffect, useMemo, useState } from "react";
import { Plus, X, Loader2, Check, Palette, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useProductVariants, useSaveProductVariants, type VariantInput } from "@/hooks/useProductVariants";

/**
 * Colors x sizes stock matrix for a single product (clothing/shoes). The merchant
 * lists the colors (with a swatch) and the sizes, then fills in stock per
 * combination. 0 = out of stock (the storefront disables that combo). A product
 * with no colors/sizes simply has no variants and behaves as before.
 */

const DEFAULT_HEX = "#111111";
const key = (color: string, size: string) => `${color}||${size}`;

const ProductVariantsEditor = ({ productId, businessId }: { productId: string; businessId: string }) => {
  const { data: existing = [], isLoading } = useProductVariants(productId);
  const saveVariants = useSaveProductVariants();

  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [newColor, setNewColor] = useState({ name: "", hex: DEFAULT_HEX });
  const [newSize, setNewSize] = useState("");

  // Hydrate from saved rows.
  useEffect(() => {
    if (isLoading) return;
    const cMap = new Map<string, string>();
    const sSet = new Set<string>();
    const st: Record<string, number> = {};
    for (const v of existing) {
      const c = v.color ?? "";
      const s = v.size ?? "";
      if (c) cMap.set(c, v.color_hex || DEFAULT_HEX);
      if (s) sSet.add(s);
      st[key(c, s)] = v.stock ?? 0;
    }
    setColors(Array.from(cMap, ([name, hex]) => ({ name, hex })));
    setSizes(Array.from(sSet));
    setStock(st);
  }, [existing, isLoading]);

  const addColor = () => {
    const name = newColor.name.trim();
    if (!name || colors.some((c) => c.name === name)) return;
    setColors([...colors, { name, hex: newColor.hex }]);
    setNewColor({ name: "", hex: DEFAULT_HEX });
  };
  const addSize = () => {
    const s = newSize.trim();
    if (!s || sizes.includes(s)) return;
    setSizes([...sizes, s]);
    setNewSize("");
  };
  const removeColor = (name: string) => setColors(colors.filter((c) => c.name !== name));
  const removeSize = (s: string) => setSizes(sizes.filter((x) => x !== s));

  // Rows/cols for the matrix. If one axis is empty we still render the other.
  const rowColors = colors.length ? colors : [{ name: "", hex: "" }];
  const colSizes = sizes.length ? sizes : [""];
  const hasAny = colors.length > 0 || sizes.length > 0;

  const setCell = (c: string, s: string, val: string) =>
    setStock((m) => ({ ...m, [key(c, s)]: Math.max(0, Math.floor(Number(val) || 0)) }));

  const totalStock = useMemo(
    () => rowColors.reduce((sum, c) => sum + colSizes.reduce((a, s) => a + (stock[key(c.name, s)] || 0), 0), 0),
    [rowColors, colSizes, stock],
  );

  const save = () => {
    const hexByColor = new Map(colors.map((c) => [c.name, c.hex]));
    const variants: VariantInput[] = [];
    for (const c of rowColors) {
      for (const s of colSizes) {
        if (!c.name && !s) continue;
        variants.push({
          color: c.name || null,
          color_hex: c.name ? hexByColor.get(c.name) || DEFAULT_HEX : null,
          size: s || null,
          sku: null,
          stock: stock[key(c.name, s)] || 0,
          price_override: null,
        });
      }
    }
    saveVariants.mutate(
      { productId, businessId, variants },
      { onSuccess: () => toast.success(hasAny ? "הוריאציות נשמרו" : "הוריאציות הוסרו"), onError: () => toast.error("לא הצלחנו לשמור, נסו שוב") },
    );
  };

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4" dir="rtl">
      <p className="text-sm text-muted-foreground">
        הגדירו באילו <b>צבעים</b> ו<b>מידות</b> המוצר מגיע, וכמה יש במלאי מכל צירוף. <b>0 = אזל</b> (הלקוח לא יוכל להזמין את הצירוף הזה). מוצר בלי צבעים/מידות פשוט נמכר כרגיל.
      </p>

      {/* Colors */}
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"><Palette className="w-4 h-4 text-primary" /> צבעים</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {colors.map((c) => (
            <span key={c.name} className="inline-flex items-center gap-1.5 rounded-full border border-border pr-2 pl-1 py-1 text-sm">
              <span className="w-3.5 h-3.5 rounded-full border border-border" style={{ background: c.hex }} />
              {c.name}
              <button onClick={() => removeColor(c.name)} className="text-muted-foreground hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
          {colors.length === 0 && <span className="text-xs text-muted-foreground">אין צבעים - הוסיפו אם המוצר מגיע בכמה צבעים.</span>}
        </div>
        <div className="flex items-end gap-2">
          <input type="color" value={newColor.hex} onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })} className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent" title="בחרו גוון" />
          <Input placeholder="שם הצבע (שחור)" value={newColor.name} onChange={(e) => setNewColor({ ...newColor, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addColor()} className="max-w-[160px]" />
          <Button type="button" variant="outline" size="sm" onClick={addColor}><Plus className="w-4 h-4 ml-1" /> צבע</Button>
        </div>
      </div>

      {/* Sizes */}
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"><Ruler className="w-4 h-4 text-primary" /> מידות</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {sizes.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-sm font-medium">
              {s}
              <button onClick={() => removeSize(s)} className="text-muted-foreground hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
          {sizes.length === 0 && <span className="text-xs text-muted-foreground">אין מידות - הוסיפו אם המוצר מגיע בכמה מידות (S/M/L או 38/40).</span>}
        </div>
        <div className="flex items-end gap-2">
          <Input placeholder="מידה (M / 42)" value={newSize} onChange={(e) => setNewSize(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSize()} className="max-w-[160px]" />
          <Button type="button" variant="outline" size="sm" onClick={addSize}><Plus className="w-4 h-4 ml-1" /> מידה</Button>
        </div>
      </div>

      {/* Stock matrix */}
      {hasAny && (
        <div>
          <div className="text-sm font-semibold text-foreground mb-2">מלאי לכל צירוף</div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-1.5 text-right text-xs text-muted-foreground font-medium sticky right-0 bg-card"> </th>
                  {colSizes.map((s) => (
                    <th key={s || "one"} className="p-1.5 text-center text-xs font-bold text-foreground min-w-[64px]">{s || "יחיד"}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowColors.map((c) => (
                  <tr key={c.name || "one"}>
                    <td className="p-1.5 whitespace-nowrap sticky right-0 bg-card">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        {c.name && <span className="w-3 h-3 rounded-full border border-border" style={{ background: c.hex }} />}
                        {c.name || "כללי"}
                      </span>
                    </td>
                    {colSizes.map((s) => {
                      const val = stock[key(c.name, s)] ?? 0;
                      return (
                        <td key={s || "one"} className="p-1">
                          <input
                            type="number" min={0} value={val}
                            onChange={(e) => setCell(c.name, s, e.target.value)}
                            className={`w-16 h-9 rounded-lg border text-center text-sm focus:outline-none focus:border-primary ${val === 0 ? "border-rose-300 text-rose-500 bg-rose-500/5" : "border-border bg-background"}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">סה"כ במלאי: <b>{totalStock}</b> יחידות. תאים באדום = אזל.</p>
        </div>
      )}

      <Button type="button" onClick={save} disabled={saveVariants.isPending}>
        {saveVariants.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 ml-1" /> שמירת וריאציות</>}
      </Button>
    </div>
  );
};

export default ProductVariantsEditor;
