import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Calendar, Plus, Trash2, Loader2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

/**
 * Dashboard panel for synagogue businesses.
 * Two tabs:
 *  1. זמני תפילה  — weekday + shabbat prayer times saved to synagogue_settings.prayer_times
 *  2. אירועים מיוחדים — upcoming events saved to synagogue_settings.events
 */

interface PrayerTimes { [key: string]: string }
interface ShulEvent { id: string; title: string; date: string; time: string; description: string }

const WEEKDAY_TIMES = [
  ["shacharit",     "שחרית"],
  ["mincha",        "מנחה"],
  ["maariv",        "ערבית"],
  ["daf_yomi",      "דף יומי"],
] as const;

const SHABBAT_TIMES = [
  ["shabbat_in",        "כניסת שבת"],
  ["kabbalat_shabbat",  "קבלת שבת"],
  ["shabbat_shacharit", "שחרית שבת"],
  ["shabbat_musaf",     "מוסף שבת"],
  ["shabbat_mincha",    "מנחה שבת"],
  ["shabbat_maariv",    "מוצאי שבת"],
] as const;

const uid = () => Math.random().toString(36).slice(2, 10);

const SynagogueScheduleManager = ({ businessId }: { businessId?: string }) => {
  const [tab, setTab] = useState<"times" | "events">("times");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [times, setTimes] = useState<PrayerTimes>({});
  const [events, setEvents] = useState<ShulEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Omit<ShulEvent, "id">>({ title: "", date: "", time: "", description: "" });
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("synagogue_settings")
        .select("business_id, prayer_times, events")
        .eq("business_id", businessId)
        .maybeSingle();
      if (data) {
        setSettingsId(data.business_id);
        setTimes(data.prayer_times ?? {});
        setEvents(Array.isArray(data.events) ? data.events : []);
      }
      setLoading(false);
    };
    load();
  }, [businessId]);

  const upsertSettings = async (patch: Record<string, unknown>) => {
    if (!businessId) return;
    if (settingsId) {
      await (supabase as any).from("synagogue_settings").update(patch).eq("business_id", businessId);
    } else {
      const { data } = await (supabase as any).from("synagogue_settings")
        .insert({ business_id: businessId, ...patch })
        .select("business_id").single();
      if (data) setSettingsId(data.business_id);
    }
  };

  const saveTimes = async () => {
    setSaving(true);
    await upsertSettings({ prayer_times: times });
    setSaving(false);
    toast.success("זמני התפילה נשמרו");
  };

  const saveEvents = async (updated: ShulEvent[]) => {
    setSaving(true);
    await upsertSettings({ events: updated });
    setSaving(false);
  };

  const addEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    const updated = [...events, { ...newEvent, id: uid() }].sort((a, b) => a.date.localeCompare(b.date));
    setEvents(updated);
    await saveEvents(updated);
    setNewEvent({ title: "", date: "", time: "", description: "" });
    setShowAddEvent(false);
    toast.success("האירוע נוסף");
  };

  const deleteEvent = async (id: string) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    await saveEvents(updated);
    toast.success("האירוע נמחק");
  };

  const updateEvent = async (id: string, patch: Partial<ShulEvent>) => {
    const updated = events.map(e => e.id === id ? { ...e, ...patch } : e).sort((a, b) => a.date.localeCompare(b.date));
    setEvents(updated);
    await saveEvents(updated);
    setEditId(null);
    toast.success("האירוע עודכן");
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.date >= today);
  const past = events.filter(e => e.date < today);

  const TimeRow = ({ k, label }: { k: string; label: string }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-foreground w-28 shrink-0">{label}</span>
      <input
        type="time"
        value={times[k] ?? ""}
        onChange={e => setTimes(p => ({ ...p, [k]: e.target.value }))}
        className="h-9 rounded-lg border border-input bg-background px-2 text-sm w-28 text-center"
      />
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-foreground">לוח זמנים ואירועים</h1>
        <p className="text-sm text-muted-foreground mt-0.5">מה שתגדיר כאן יופיע באתר הציבורי של בית הכנסת</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {([["times", "זמני תפילה", Clock], ["events", "אירועים מיוחדים", Calendar]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Prayer times */}
      {tab === "times" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-3">ימות השבוע</p>
            {WEEKDAY_TIMES.map(([k, l]) => <TimeRow key={k} k={k} label={l} />)}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-3">שבת קודש</p>
            {SHABBAT_TIMES.map(([k, l]) => <TimeRow key={k} k={k} label={l} />)}
          </div>
          <button
            onClick={saveTimes}
            disabled={saving}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            שמור זמני תפילה
          </button>
          <p className="text-xs text-muted-foreground text-center">שדות ריקים לא יוצגו באתר</p>
        </div>
      )}

      {/* Events */}
      {tab === "events" && (
        <div className="space-y-3">
          <button
            onClick={() => setShowAddEvent(v => !v)}
            className="w-full h-11 rounded-xl border-2 border-dashed border-primary/40 text-primary font-medium flex items-center justify-center gap-2 hover:border-primary/70 transition-colors"
          >
            {showAddEvent ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddEvent ? "סגור" : "הוסף אירוע"}
          </button>

          {showAddEvent && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">אירוע חדש</p>
              <input
                placeholder="כותרת האירוע *"
                value={newEvent.title}
                onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">תאריך *</label>
                  <input type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">שעה</label>
                  <input type="time" value={newEvent.time} onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
              </div>
              <textarea
                placeholder="תיאור קצר (לא חובה)"
                value={newEvent.description}
                onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
              />
              <button
                onClick={addEvent}
                disabled={!newEvent.title || !newEvent.date || saving}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
              >
                הוסף
              </button>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">אירועים קרובים</p>
              <div className="space-y-2">
                {upcoming.map(ev => (
                  <EventCard key={ev.id} ev={ev} editId={editId} setEditId={setEditId} onDelete={deleteEvent} onUpdate={updateEvent} saving={saving} />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">עבר</p>
              <div className="space-y-2 opacity-60">
                {past.map(ev => (
                  <EventCard key={ev.id} ev={ev} editId={editId} setEditId={setEditId} onDelete={deleteEvent} onUpdate={updateEvent} saving={saving} />
                ))}
              </div>
            </div>
          )}

          {events.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              עדיין לא הוספת אירועים
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EventCard = ({ ev, editId, setEditId, onDelete, onUpdate, saving }: {
  ev: ShulEvent;
  editId: string | null;
  setEditId: (id: string | null) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<ShulEvent>) => void;
  saving: boolean;
}) => {
  const [draft, setDraft] = useState(ev);

  const fmt = (d: string) => {
    try { return new Date(d + "T12:00:00").toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }); }
    catch { return d; }
  };

  if (editId === ev.id) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
        <input value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
          className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={draft.date} onChange={e => setDraft(p => ({ ...p, date: e.target.value }))}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
          <input type="time" value={draft.time} onChange={e => setDraft(p => ({ ...p, time: e.target.value }))}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </div>
        <textarea value={draft.description} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))}
          rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
        <div className="flex gap-2">
          <button onClick={() => onUpdate(ev.id, draft)} disabled={saving}
            className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground font-medium text-sm">שמור</button>
          <button onClick={() => setEditId(null)}
            className="flex-1 h-9 rounded-xl border border-border text-sm text-muted-foreground">ביטול</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm">{ev.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {fmt(ev.date)}{ev.time ? ` · ${ev.time}` : ""}
        </p>
        {ev.description && <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>}
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => setEditId(ev.id)}
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <ChevronDown className="w-3.5 h-3.5 rotate-[-90deg] text-muted-foreground" />
        </button>
        <button onClick={() => onDelete(ev.id)}
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>
    </div>
  );
};

export default SynagogueScheduleManager;
