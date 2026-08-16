import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FaqItem {
  question: string;
  answer: string;
}

const FaqTabContent = ({ businessId }: { businessId?: string }) => {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    supabase
      .from("businesses")
      .select("faq_items")
      .eq("id", businessId)
      .single()
      .then(({ data }) => {
        if (data?.faq_items && Array.isArray(data.faq_items)) {
          setItems(data.faq_items as FaqItem[]);
        }
        setLoaded(true);
      });
  }, [businessId]);

  const update = (i: number, field: keyof FaqItem, value: string) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    setItems(next);
  };

  const remove = (i: number) => setItems(items.filter((_, j) => j !== i));

  const add = () => setItems([...items, { question: "", answer: "" }]);

  const save = async () => {
    if (!businessId) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({ faq_items: items } as any)
      .eq("id", businessId);
    setIsSaving(false);
    if (error) toast.error("שגיאה בשמירה");
    else toast.success("שאלות נפוצות נשמרו");
  };

  if (!loaded) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold">שאלות נפוצות</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            הוסיפו שאלות ותשובות שמופיעות בעמוד החנות
          </p>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={item.question}
                  onChange={e => update(i, "question", e.target.value)}
                  placeholder="מה השאלה?"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <Textarea
                value={item.answer}
                onChange={e => update(i, "answer", e.target.value)}
                placeholder="מה התשובה?"
                rows={2}
              />
            </div>
          ))}

          {items.length === 0 && (
            <button
              type="button"
              onClick={add}
              className="w-full py-6 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 transition-colors"
            >
              + הוסיפו שאלה ראשונה
            </button>
          )}

          {items.length > 0 && items.length < 20 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={add}
            >
              <Plus className="h-3.5 w-3.5" /> הוסיפו שאלה
            </Button>
          )}
        </div>
      </div>

      <Button onClick={save} disabled={isSaving} className="w-full">
        {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
        שמירה
      </Button>
    </div>
  );
};

export default FaqTabContent;
