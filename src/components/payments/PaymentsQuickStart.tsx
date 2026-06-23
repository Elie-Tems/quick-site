import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Short, plain-language "which path are you?" helper shown above the provider
// picker. Keeps merchants from needing to understand "מספר ספק / API / סליקה".
const PATHS = [
  {
    n: "1",
    title: "כבר יש לי סליקה וחשבוניות",
    line: "עובדים עם ספק קיים — רק צריך לחבר אותו לאתר.",
    providers: "PayPlus · משולם · קארדקום · Tranzila",
  },
  {
    n: "2",
    title: "יש מספר ספק, חסר דף תשלום/חשבוניות",
    line: "יש מסוף/קופה — מוסיפים מערכת שמשלימה דף תשלום וחשבוניות.",
    providers: "Morning · iCount",
  },
  {
    n: "3",
    title: "מתחיל מאפס",
    line: "אין כלום — מערכת אחת שנותנת את כל המעטפת.",
    providers: "PayPlus · משולם",
  },
];

const MATRIX: { name: string; clearing: string; page: string; invoice: string }[] = [
  { name: "PayPlus", clearing: "✓", page: "✓", invoice: "✓" },
  { name: "משולם / Grow", clearing: "✓", page: "✓", invoice: "✓" },
  { name: "Morning", clearing: "✓*", page: "✓", invoice: "✓" },
  { name: "iCount", clearing: "✓*", page: "✓", invoice: "✓" },
];

const PaymentsQuickStart = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 rounded-xl border border-border bg-card/50 overflow-hidden" dir="rtl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-right"
      >
        <span className="font-medium text-foreground">לא בטוחים מאיפה להתחיל? בחרו את המצב שלכם</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {PATHS.map((p) => (
              <div key={p.n} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/12 text-primary text-xs font-medium">
                    {p.n}
                  </span>
                  <span className="text-sm font-medium text-foreground leading-snug">{p.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">{p.line}</p>
                <p className="text-xs text-primary">{p.providers}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground">
                  <th className="px-3 py-2 text-right font-medium">מערכת</th>
                  <th className="px-3 py-2 font-medium">סליקה</th>
                  <th className="px-3 py-2 font-medium">דף תשלום</th>
                  <th className="px-3 py-2 font-medium">חשבוניות</th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((m, i) => (
                  <tr key={m.name} className={i % 2 ? "bg-card" : ""}>
                    <td className="px-3 py-2 text-right text-foreground">{m.name}</td>
                    <td className="px-3 py-2 text-center text-primary">{m.clearing}</td>
                    <td className="px-3 py-2 text-center text-primary">{m.page}</td>
                    <td className="px-3 py-2 text-center text-primary">{m.invoice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">* סליקה דרך מספר הספק הקיים שלכם או של המערכת.</p>
        </div>
      )}
    </div>
  );
};

export default PaymentsQuickStart;
