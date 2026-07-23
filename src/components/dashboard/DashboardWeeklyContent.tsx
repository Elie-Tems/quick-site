import { useState, useEffect } from "react";
import { BookOpen, Quote, Newspaper, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  businessId?: string;
}

interface Article {
  id: string;
  title: string;
  body: string;
}

const PARASHA_LIST = [
  "בראשית","נח","לך לך","וירא","חיי שרה","תולדות","ויצא","וישלח","וישב","מקץ","ויגש","ויחי",
  "שמות","וארא","בא","בשלח","יתרו","משפטים","תרומה","תצוה","כי תשא","ויקהל","פקודי",
  "ויקרא","צו","שמיני","תזריע","מצורע","אחרי מות","קדושים","אמור","בהר","בחוקותי",
  "במדבר","נשא","בהעלותך","שלח","קרח","חקת","בלק","פינחס","מטות","מסעי",
  "דברים","ואתחנן","עקב","ראה","שופטים","כי תצא","כי תבוא","נצבים","וילך","האזינו","וזאת הברכה",
];

const DashboardWeeklyContent = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [parasha, setParasha] = useState("בראשית");
  const [parashaNote, setParashaNote] = useState("");
  const [roshMessage, setRoshMessage] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [newArticle, setNewArticle] = useState({ title: "", body: "" });

  useEffect(() => {
    if (!businessId) return;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("content_sections, weekly_editor_data")
        .eq("id", businessId)
        .maybeSingle();

      const d = data?.weekly_editor_data;
      if (d?.parasha) setParasha(d.parasha);
      if (d?.parashaNote) setParashaNote(d.parashaNote);
      if (d?.roshMessage) setRoshMessage(d.roshMessage);

      const sections: any[] = data?.content_sections ?? [];
      setArticles(
        sections
          .filter((s: any) => s.type === "article" || !s.type)
          .map((s: any) => ({ id: s.id ?? crypto.randomUUID(), title: s.title ?? "", body: s.body ?? "" }))
      );
    };
    load();
  }, [businessId]);

  const save = async () => {
    if (!businessId) return;
    setSaving(true);
    const weeklyData = { parasha, parashaNote, roshMessage };
    const contentSections = [
      { id: crypto.randomUUID(), type: "rosh_message", title: "דבר ראש הכולל", body: roshMessage },
      ...articles.map(a => ({ id: a.id, type: "article", title: a.title, body: a.body })),
    ];
    await (supabase as any)
      .from("businesses")
      .update({ weekly_editor_data: weeklyData, content_sections: contentSections })
      .eq("id", businessId);
    setSaving(false);
    toast({ title: "נשמר ופורסם לאתר" });
  };

  const addArticle = () => {
    if (!newArticle.title) return;
    setArticles(prev => [...prev, { ...newArticle, id: crypto.randomUUID() }]);
    setNewArticle({ title: "", body: "" });
    setShowAddArticle(false);
  };

  const removeArticle = (id: string) => setArticles(prev => prev.filter(a => a.id !== id));

  return (
    <div className="space-y-4 p-1" dir="rtl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">תוכן שבועי</h2>
          <p className="text-sm text-muted-foreground mt-0.5">פרשה, דבר ראש הכולל ושיעורים לאתר</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {saving ? "שומר..." : "פרסם לאתר"}
        </button>
      </div>

      {/* Parasha */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">פרשת השבוע</span>
        </div>
        <select
          value={parasha}
          onChange={e => setParasha(e.target.value)}
          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm mb-2"
        >
          {PARASHA_LIST.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <textarea
          value={parashaNote}
          onChange={e => setParashaNote(e.target.value)}
          rows={2}
          placeholder="הערה קצרה על הפרשה (אופציונלי)..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
          dir="rtl"
        />
      </div>

      {/* Rosh message */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Quote className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">דבר ראש הכולל / הישיבה</span>
        </div>
        <textarea
          value={roshMessage}
          onChange={e => setRoshMessage(e.target.value)}
          rows={4}
          placeholder="כתוב דבר תורה קצר מאת ראש הכולל..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 font-serif leading-relaxed"
          dir="rtl"
        />
      </div>

      {/* Articles / shiurim */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">שיעורים ומאמרים</span>
          </div>
          <button
            onClick={() => setShowAddArticle(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> הוסף
          </button>
        </div>

        <div className="space-y-2">
          {articles.map(a => (
            <div key={a.id} className="flex items-start justify-between bg-muted/40 rounded-lg px-3 py-2.5 gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.title}</p>
                {a.body && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.body}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button><Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
                <button onClick={() => removeArticle(a.id)}><Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" /></button>
              </div>
            </div>
          ))}

          {articles.length === 0 && !showAddArticle && (
            <p className="text-sm text-muted-foreground text-center py-3">אין תוכן עדיין — לחץ הוסף</p>
          )}

          {showAddArticle && (
            <div className="border border-border rounded-lg p-3 space-y-2">
              <input
                placeholder="כותרת השיעור / המאמר"
                value={newArticle.title}
                onChange={e => setNewArticle(p => ({ ...p, title: e.target.value }))}
                className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-sm"
              />
              <textarea
                placeholder="תוכן (אופציונלי)..."
                value={newArticle.body}
                onChange={e => setNewArticle(p => ({ ...p, body: e.target.value }))}
                rows={3}
                className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddArticle(false)} className="text-xs text-muted-foreground hover:text-foreground">ביטול</button>
                <button onClick={addArticle} className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md">הוסף</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardWeeklyContent;
