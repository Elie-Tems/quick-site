import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Check, X, Loader2, ShoppingCart } from "lucide-react";

interface DomainResult {
  domain: string;
  available: boolean;
  customerIls: number | null;
  listIls: number | null;
}

interface Props {
  /** Called when the user clicks "buy" on an available domain. */
  onBuy?: (domain: string, priceIls: number | null) => void;
  placeholder?: string;
}

/**
 * Reusable domain search: queries the domain-search edge function (Openprovider)
 * and shows availability + customer price per extension. Used in onboarding, the
 * dashboard, settings and the homepage.
 */
const DomainSearch = ({ onBuy, placeholder }: Props) => {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DomainResult[] | null>(null);
  const [error, setError] = useState("");

  const search = async () => {
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("domain-search", { body: { query } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "search failed");
      setResults((data.results || []) as DomainResult[]);
    } catch {
      setError("החיפוש לא זמין כרגע. נסו שוב בעוד רגע.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={placeholder || "הקלידו שם לדומיין (למשל: hakafe-shel-dana)"}
          dir="ltr"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-right placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          onClick={search}
          disabled={loading}
          className="rounded-lg bg-primary text-white px-5 py-2.5 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          חפש
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {results && results.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">לא נמצאו תוצאות. נסו שם אחר.</p>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <div
              key={r.domain}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                r.available ? "border-border" : "border-border bg-muted/40 opacity-70"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {r.available ? (
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span dir="ltr" className="font-medium text-foreground truncate">{r.domain}</span>
              </div>
              {r.available ? (
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm">
                    {r.listIls != null && r.customerIls != null && r.listIls > r.customerIls && (
                      <span className="text-muted-foreground line-through ml-1">₪{r.listIls}</span>
                    )}
                    {r.customerIls != null && <b className="text-primary">₪{r.customerIls}/שנה + מע"מ</b>}
                  </span>
                  <button
                    onClick={() => onBuy?.(r.domain, r.customerIls)}
                    className="rounded-lg bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 flex items-center gap-1 hover:bg-primary/15 transition-colors"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> רכוש
                  </button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground shrink-0">תפוס</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DomainSearch;
