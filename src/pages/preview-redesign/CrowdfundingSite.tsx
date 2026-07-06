import { motion } from "framer-motion";
import {
  Rocket, Users, Clock, Play, Check, Heart, Share2, TrendingUp, Gift, ArrowLeft,
} from "lucide-react";
import { AuroraBg, Card, Pill, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/**
 * PREVIEW-ONLY crowdfunding campaign page (גיוס המונים). Hero + funding
 * progress (raised/goal/backers/days) + reward tiers + story. Sample data.
 */

const RAISED = 187400;
const GOAL = 250000;
const BACKERS = 1240;
const DAYS = 12;
const PCT = Math.min(100, Math.round((RAISED / GOAL) * 100));

const TIERS = [
  { amount: 50, title: "תודה מכל הלב", desc: "עדכונים בלעדיים + שמכם ברשימת התומכים", backers: 420, left: null },
  { amount: 180, title: "המוצר הראשון", desc: "יחידה אחת במחיר מוקדם + משלוח חינם", backers: 512, left: 88, hot: true },
  { amount: 500, title: "חבילת פרימיום", desc: "3 יחידות + מהדורה מוגבלת חתומה", backers: 210, left: 40 },
  { amount: 1000, title: "מהדורת אספנים", desc: "הכל + פגישת זום עם הצוות + קרדיט", backers: 34, left: 6 },
];

const STORY_IMGS = [
  "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=700&q=80",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=700&q=80",
];

const CrowdfundingSite = () => (
  <PreviewThemeRoot>
    <AuroraBg />
    <PreviewBanner title="גיוס המונים - עמוד קמפיין (צד לקוח)" />
    <StoreTopBar
      name="פרויקט לדוגמה"
      tagline="קמפיין גיוס המונים"
      cta={
        <>
          <a className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl pv-surface2 border pv-border pv-text text-sm"><Share2 className="w-4 h-4" /> שיתוף</a>
          <a href="#tiers" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"><Heart className="w-4 h-4" /> תמכו</a>
        </>
      }
    />

    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="mb-6">
        <Pill tone="primary"><Rocket className="w-3.5 h-3.5" /> טכנולוגיה · עיצוב</Pill>
        <h1 className="text-3xl md:text-5xl font-display font-bold pv-strong mt-3 mb-2">המוצר שישנה את היום-יום שלכם</h1>
        <p className="text-lg pv-muted">עזרו לנו להפוך את הרעיון למציאות. הצטרפו לתומכים שכבר איתנו.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Media + story */}
        <div className="lg:col-span-2 space-y-8">
          <div className="relative rounded-3xl overflow-hidden border pv-border shadow-2xl">
            <img src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&q=80" alt="" className="w-full aspect-video object-cover" />
            <div className="absolute inset-0 bg-black/20" />
            <button className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-2xl"><Play className="w-7 h-7" /></button>
          </div>

          {/* Story */}
          <div>
            <h2 className="text-2xl font-display font-bold pv-strong mb-3">הסיפור מאחורי הפרויקט</h2>
            <p className="pv-text leading-relaxed mb-4">
              התחלנו מבעיה פשוטה שכולנו מכירים, וחיפשנו פתרון שלא קיים בשוק. אחרי שנה של פיתוח ועשרות אבות-טיפוס,
              יצרנו מוצר שאנחנו גאים בו - ועכשיו אנחנו צריכים אתכם כדי לייצר אותו בהיקף גדול.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {STORY_IMGS.map((s, i) => <img key={i} src={s} alt="" className="rounded-2xl w-full h-44 object-cover" />)}
            </div>
            <div className="space-y-2">
              {["חומרים איכותיים ובני-קיימא", "עיצוב שזכה בפרסים", "ייצור בכמות מוגבלת"].map((b) => (
                <div key={b} className="flex items-center gap-2.5 pv-text">
                  <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5 text-primary" /></span>
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Funding panel (sticky) */}
        <div className="lg:col-span-1">
          <Card className="p-6 lg:sticky lg:top-28">
            <div className="text-3xl font-display font-bold text-primary">₪{RAISED.toLocaleString()}</div>
            <div className="text-sm pv-muted mb-3">גויסו מתוך יעד של ₪{GOAL.toLocaleString()}</div>
            <div className="h-2.5 rounded-full pv-surface2 overflow-hidden mb-4">
              <motion.div className="h-full rounded-full bg-gradient-to-l from-primary to-emerald-400"
                initial={{ width: 0 }} animate={{ width: `${PCT}%` }} transition={{ duration: 1.2 }} />
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5 text-center">
              {[[`${PCT}%`, "מהיעד", TrendingUp], [BACKERS.toLocaleString(), "תומכים", Users], [DAYS, "ימים נותרו", Clock]].map(([k, v, Icon]) => {
                const I = Icon as typeof Users;
                return (
                  <div key={v as string} className="rounded-2xl pv-surface2 border pv-border p-3">
                    <I className="w-4 h-4 text-primary mx-auto mb-1" />
                    <div className="text-lg font-display font-bold pv-strong leading-none">{k as string}</div>
                    <div className="text-[11px] pv-muted mt-1">{v as string}</div>
                  </div>
                );
              })}
            </div>
            <a href="#tiers" className="w-full py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow inline-flex items-center justify-center gap-2">
              <Heart className="w-4 h-4" /> תמכו בפרויקט
            </a>
            <button className="w-full mt-2 py-2.5 rounded-xl pv-surface2 border pv-border pv-text text-sm font-medium inline-flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4" /> שתפו את הקמפיין
            </button>
            <p className="text-xs pv-muted text-center mt-3">מודל "הכל או כלום" · תחויבו רק אם היעד יושג</p>
          </Card>
        </div>
      </div>

      {/* Reward tiers */}
      <section id="tiers" className="mt-14">
        <div className="flex items-center gap-2 mb-6">
          <Gift className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-display font-bold pv-strong">בחרו את התמיכה שלכם</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((t, i) => (
            <motion.div key={t.amount} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
              <Card hover className={`p-5 h-full flex flex-col ${t.hot ? "ring-1 ring-primary/40 border-primary/40" : ""}`}>
                {t.hot && <span className="self-start mb-2"><Pill tone="amber">הכי פופולרי</Pill></span>}
                <div className="text-2xl font-display font-bold text-primary mb-1">₪{t.amount}</div>
                <div className="font-bold pv-strong mb-1.5">{t.title}</div>
                <p className="text-sm pv-muted flex-1">{t.desc}</p>
                <div className="flex items-center justify-between text-xs pv-muted mt-4 mb-3">
                  <span>{t.backers} תומכים</span>
                  {t.left != null && <span className="text-amber-500 font-medium">{t.left} נותרו</span>}
                </div>
                <button className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold inline-flex items-center justify-center gap-1.5">
                  בחרו <ArrowLeft className="w-4 h-4" />
                </button>
              </Card>
            </motion.div>
          ))}
        </div>
        <p className="text-center text-xs pv-faint mt-6">* הסכומים והנתונים להמחשה בלבד.</p>
      </section>
    </div>
  </PreviewThemeRoot>
);

export default CrowdfundingSite;
