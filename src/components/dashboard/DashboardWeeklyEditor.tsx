import { useState, useEffect } from "react";
import { CalendarDays, Clock, BookOpen, Megaphone, GraduationCap, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  businessId?: string;
}

interface Shiur {
  id: string;
  title: string;
  teacher: string;
  schedule: string;
}

const PARASHA_LIST = [
  "בראשית","נח","לך לך","וירא","חיי שרה","תולדות","ויצא","וישלח","וישב","מקץ","ויגש","ויחי",
  "שמות","וארא","בא","בשלח","יתרו","משפטים","תרומה","תצוה","כי תשא","ויקהל","פקודי",
  "ויקרא","צו","שמיני","תזריע","מצורע","אחרי מות","קדושים","אמור","בהר","בחוקותי",
  "במדבר","נשא","בהעלותך","שלח","קרח","חקת","בלק","פינחס","מטות","מסעי",
  "דברים","ואתחנן","עקב","ראה","שופטים","כי תצא","כי תבוא","נצבים","וילך","האזינו","וזאת הברכה",
];

const DashboardWeeklyEditor = ({ businessId }: Props) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [parasha, setParasha] = useState("בראשית");
  const [announcement, setAnnouncement] = useState("");
  const [shacharit, setShacharit] = useState("07:00");
  const [mincha, setMincha] = useState("16:45");
  const [arvit, setArvit] = useState("17:50");
  const [candleLighting, setCandleLighting] = useState("17:55");
  const [havdalah, setHavdalah] = useState("19:12");
  const [shiurim, setShiurim] = useState<Shiur[]>([]);
  const [editingShiur, setEditingShiur] = useState<Shiur | null>(null);
  const [newShiur, setNewShiur] = useState({ title: "", teacher: "", schedule: "" });
  const [showAddShiur, setShowAddShiur] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("weekly_editor_data")
        .eq("id", businessId)
        .maybeSingle();
      const d = data?.weekly_editor_data;
      if (!d) return;
      if (d.parasha) setParasha(d.parasha);
      if (d.announcement) setAnnouncement(d.announcement);
      if (d.shacharit) setShacharit(d.shacharit);
      if (d.mincha) setMincha(d.mincha);
      if (d.arvit) setArvit(d.arvit);
      if (d.candleLighting) setCandleLighting(d.candleLighting);
      if (d.havdalah) setHavdalah(d.havdalah);
      if (d.shiurim) setShiurim(d.shiurim);
    };
    load();
  }, [businessId]);

  const save = async (publish = false) => {
    if (!businessId) return;
    setSaving(true);
    const payload = { parasha, announcement, shacharit, mincha, arvit, candleLighting, havdalah, shiurim };
    await (supabase as any)
      .from("businesses")
      .update({ weekly_editor_data: payload })
      .eq("id", businessId);
    setSaving(false);
    if (publish) setPublished(true);
    toast({ title: publish ? "פורסם לאתר" : "נשמר כטיוטה" });
  };

  const addShiur = () => {
    if (!newShiur.title) return;
    setShiurim(prev => [...prev, { ...newShiur, id: crypto.randomUUID() }]);
    setNewShiur({ title: "", teacher: "", schedule: "" });
    setShowAddShiur(false);
  };

  const removeShiur = (id: string) => setShiurim(prev => prev.filter(s => s.id !== id));

  return (
    <div className="space-y-4 p-1" dir="rtl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">עריכה שבועית</h2>
          <p className="text-sm text-muted-foreground mt-0.5">עדכון תוכן השבת לאתר בית הכנסת</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            שמור טיוטה
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            {published && <CheckCircle2 className="w-4 h-4" />}
            פרסם לאתר
          </button>
        </div>
      </div>

      {/* Prayer times */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">שעות תפילה</span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
            ניתן לעדכן ידנית
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "שחרית", value: shacharit, set: setShacharit },
            { label: "מנחה", value: mincha, set: setMincha },
            { label: "ערבית", value: arvit, set: setArvit },
            { label: "כניסת שבת", value: candleLighting, set: setCandleLighting },
            { label: "צאת שבת", value: havdalah, set: setHavdalah },
          ].map(({ label, value, set }) => (
            <div key={label} className="bg-muted/50 rounded-lg p-2">
              <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
              <input
                type="time"
                value={value}
                onChange={e => set(e.target.value)}
                className="w-full text-sm font-semibold bg-transparent border-none outline-none"
                dir="ltr"
              />
            </div>
          ))}
        </div>
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
          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
        >
          {PARASHA_LIST.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Announcement */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">הודעה לקהילה</span>
        </div>
        <textarea
          value={announcement}
          onChange={e => setAnnouncement(e.target.value)}
          rows={3}
          placeholder="כתוב הודעה לקהילה לשבת הקרובה..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
          dir="rtl"
        />
      </div>

      {/* Shiurim */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">שיעורים קבועים</span>
          </div>
          <button
            onClick={() => setShowAddShiur(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> הוסף
          </button>
        </div>

        <div className="space-y-2">
          {shiurim.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">{[s.teacher, s.schedule].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingShiur(s)}><Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
                <button onClick={() => removeShiur(s.id)}><Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" /></button>
              </div>
            </div>
          ))}

          {shiurim.length === 0 && !showAddShiur && (
            <p className="text-sm text-muted-foreground text-center py-3">אין שיעורים — לחץ הוסף</p>
          )}

          {showAddShiur && (
            <div className="border border-border rounded-lg p-3 space-y-2">
              <input placeholder="שם השיעור" value={newShiur.title} onChange={e => setNewShiur(p => ({ ...p, title: e.target.value }))} className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="מרצה" value={newShiur.teacher} onChange={e => setNewShiur(p => ({ ...p, teacher: e.target.value }))} className="h-8 px-2.5 rounded-md border border-border bg-background text-sm" />
                <input placeholder="ימים ושעה" value={newShiur.schedule} onChange={e => setNewShiur(p => ({ ...p, schedule: e.target.value }))} className="h-8 px-2.5 rounded-md border border-border bg-background text-sm" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddShiur(false)} className="text-xs text-muted-foreground hover:text-foreground">ביטול</button>
                <button onClick={addShiur} className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md">הוסף</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardWeeklyEditor;
