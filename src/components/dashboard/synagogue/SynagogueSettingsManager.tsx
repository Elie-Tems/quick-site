import { useState, useEffect } from "react";
import { Loader2, Clock, MonitorPlay, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSynagogueSettings, useSaveSynagogueSettings, type PrayerTimes } from "@/hooks/useSynagogueSettings";

/**
 * Gabbai config for prayer times + the live display screen. Fixed prayer times +
 * location (for computed zmanim) + sponsor + announcements. Needs the
 * synagogue_settings migration (20260712160000). The display screen lives at
 * /shul/:slug/screen (SynagogueScreen).
 */
const SynagogueSettingsManager = ({ businessId, slug }: { businessId: string; slug?: string | null }) => {
  const { data, isLoading } = useSynagogueSettings(businessId);
  const save = useSaveSynagogueSettings();

  const [city, setCity] = useState("");
  const [nusach, setNusach] = useState("");
  const [times, setTimes] = useState<PrayerTimes>({});
  const [parnas, setParnas] = useState("");
  const [announcements, setAnnouncements] = useState("");

  useEffect(() => {
    if (!data) return;
    setCity(data.city ?? ""); setNusach(data.nusach ?? "");
    setTimes(data.prayer_times ?? {}); setParnas(data.parnas ?? ""); setAnnouncements(data.announcements ?? "");
  }, [data]);

  const setT = (k: keyof PrayerTimes, v: string) => setTimes((t) => ({ ...t, [k]: v }));

  const submit = () => {
    save.mutate(
      { businessId, city: city.trim() || null, nusach: nusach.trim() || null, prayer_times: times,
        parnas: parnas.trim() || null, announcements: announcements.trim() || null },
      { onSuccess: () => toast.success("נשמר"), onError: () => toast.error("נכשל - ודאו שהמיגרציה רצה") },
    );
  };

  const screenUrl = slug ? `${window.location.origin}/shul/${slug}/screen` : null;

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const T = [
    { k: "shacharit" as const, label: "שחרית" },
    { k: "mincha" as const, label: "מנחה" },
    { k: "maariv" as const, label: "ערבית" },
    { k: "shabbat_in" as const, label: "כניסת שבת" },
    { k: "daf_yomi" as const, label: "דף יומי" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> זמני תפילה ומסך בית הכנסת</h3>
        <p className="text-sm text-muted-foreground">מגדירים זמנים קבועים; זמני היום (נץ, שקיעה...) מחושבים אוטומטית לפי העיר.</p>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="grid sm:grid-cols-2 gap-2">
          <div><label className="text-xs text-muted-foreground">עיר (לחישוב זמנים)</label><Input placeholder="ירושלים / בני ברק..." value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">נוסח</label><Input placeholder="ספרד / אשכנז / עדות המזרח" value={nusach} onChange={(e) => setNusach(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {T.map(({ k, label }) => (
            <div key={k}><label className="text-xs text-muted-foreground">{label}</label>
              <Input placeholder="--:--" value={times[k] ?? ""} onChange={(e) => setT(k, e.target.value)} /></div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <div><label className="text-xs text-muted-foreground">פרנס היום</label><Input placeholder="משפ' כהן לע״נ..." value={parnas} onChange={(e) => setParnas(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">הודעות (רצועה במסך)</label><Input placeholder="שיעור הערב 20:15..." value={announcements} onChange={(e) => setAnnouncements(e.target.value)} /></div>
        </div>
        <Button onClick={submit} disabled={save.isPending}>{save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמירה"}</Button>
      </div>

      {/* Display screen link */}
      <div className="p-4 rounded-xl border border-primary/30 bg-primary/[0.04] flex items-center gap-3">
        <MonitorPlay className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">מסך בית הכנסת</div>
          <div className="text-xs text-muted-foreground">פותחים את הכתובת על טלוויזיה/טאבלט בכניסה. מתעדכן לבד.</div>
        </div>
        {screenUrl ? (
          <a href={screenUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary font-medium shrink-0">
            פתיחת המסך <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : <span className="text-xs text-muted-foreground">פרסמו את האתר לקבלת הקישור</span>}
      </div>
    </div>
  );
};

export default SynagogueSettingsManager;
