import { useState, useRef, useEffect, useMemo } from "react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, ArrowRight, RotateCcw } from "lucide-react";
import { KNOWLEDGE_BASE } from "@/lib/knowledgeBase";
import { PLANS, VAT_SUFFIX } from "@/lib/pricingConfig";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import logoDarkBg from "@/assets/logo-dark-bg.png";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTED_QUESTIONS = [
  "איך אני מוסיף מוצר חדש?",
  "איך אני יוצר טקסט אודות?",
  "איך מחברים תרומות דרך נדרים פלוס?",
  "מה ההבדל בין החבילות?",
];

const HARDCODED_ANSWERS: Record<string, string> = {
  "איך מחברים תרומות דרך נדרים פלוס?": `אם לעמותה או לבית הכנסת שלכם כבר יש חשבון **נדרים פלוס**, החיבור לוקח דקה. 🙂

צריך רק **2 פרטים** מחשבון נדרים שלכם:

1️⃣ **מספר מוסד** (7 ספרות)
   מופיע למעלה מימין בממשק נדרים, ליד שם המוסד (למשל: מוסד 7002708).

2️⃣ **טקסט אימות (ApiValid)**
   בנדרים: תפריט **"עוד"** ← **"מפתחות API"** ← מעתיקים את השדה **"טקסט אימות"**.

**עכשיו בסיאנגו:**

3️⃣ דשבורד ← **"סליקה"**

4️⃣ בוחרים **"נדרים פלוס"**

5️⃣ מדביקים את שני הפרטים ולוחצים **"שמירה והפעלה"** ✅

זהו! אין צורך להגדיר שום דבר נוסף אצל נדרים. התורמים יתרמו ישירות מהאתר (חלון תשלום מאובטח של נדרים), הכסף יכנס לחשבון נדרים שלכם, ותקבלו חיווי אוטומטי על כל תרומה. 💚

בכל שדה בטופס יש כפתור **"איפה מוצאים את זה?"** עם ההוראות המדויקות.`,

  "איך אני מוסיף מוצר חדש?": `היי! 👋 אשמח לעזור להוסיף מוצר חדש.

**הנה השלבים:**

1️⃣ **נכנסים לדשבורד** - לוח הבקרה

2️⃣ **לוחצים על "מוצרים"** בתפריט הצדדי
   (לעסקי שירות: "שירותים" | לעמותות: "פעילויות")

3️⃣ **לוחצים על "+ הוסף מוצר"**

4️⃣ **ממלאים את הפרטים:**
   - שם המוצר 📝
   - מחיר 💰 (אופציונלי)
   - תיאור (אופציונלי)
   - קטגוריה

5️⃣ **מעלים תמונה** 📸
   - אפשר גם ליצור תמונה עם AI!

6️⃣ **לוחצים "שמור"** ✅

זהו! המוצר באתר 🎉

צריכים עזרה נוספת? שאלו בשמחה! 😊`,

  "איך אני יוצר טקסט אודות?": `מעולה ששאלת! 🌟 יצירת טקסט "אודות" זה ממש פשוט.

**שתי דרכים:**

**🤖 דרך 1: עם AI (מומלץ!)**
1. נכנסים לדשבורד
2. לוחצים על "אודות" בתפריט
3. לוחצים על "צור עם AI"
4. בוחרים סגנון:
   - ידידותי 😊
   - מקצועי 💼
   - רשמי 🎩
5. המערכת כותבת טקסט מקצועי בשבילך!
6. לוחצים "שמור"

**✍️ דרך 2: כתיבה ידנית**
1. נכנסים ל"אודות"
2. כותבים בתיבת הטקסט
3. לוחצים "שמור"

הטקסט יופיע באתר שלך מיד! 🚀`,

  "איך אני מגדיר מבצע על מוצר?": `אהה, מבצעים! 🎯 דרך מעולה להגדיל מכירות.

**השלבים:**

1️⃣ **נכנסים ל"מבצעים"** בדשבורד

2️⃣ **בוחרים מוצר** מהרשימה

3️⃣ **מגדירים מחיר מבצע** 💸
   - המחיר הישן יופיע מחוק
   - המחיר החדש יופיע בבולט

4️⃣ **לוחצים "שמור"**

**התוצאה:**
- המוצר יקבל תג "מבצע" 🏷️
- המחיר הישן יהיה מחוק
- המחיר החדש יהיה בצבע בולט

הלקוחות אוהבים מבצעים! 🎉`,

  "איך אני מעלה באנר?": `באנרים זה הדרך הכי טובה למשוך תשומת לב! 🎨

**הנה איך:**

1️⃣ **נכנסים ל"באנרים"** בדשבורד

2️⃣ **לוחצים "+ הוסף באנר"**

3️⃣ **מעלים תמונה** 🖼️
   - גודל מומלץ: 1200x400 פיקסלים
   - פורמט: JPG או PNG

4️⃣ **מוסיפים כותרת** (אופציונלי)

5️⃣ **מגדירים תאריכי הצגה** 📅
   - מתי הבאנר יתחיל להופיע
   - מתי יפסיק

6️⃣ **לוחצים "שמור"**

הבאנר יופיע באתר שלך! ✨`,

  "מה ההבדל בין החבילות?": `שאלה מצוינת! 💎 הנה ההבדלים:

${PLANS.map((p) => {
  const price = p.id === "classic" ? `${p.label}/חודש כולל מע"מ` : `${p.label}/חודש ${VAT_SUFFIX}`;
  const about = p.features.some((f) => f.includes("אודות")) ? '\n- כתיבת "אודות" באתר' : "";
  return `**${p.name} - ${price}**\n- עד ${p.productLimit} מוצרים${about}`;
}).join("\n\n")}

**כל החבילות כוללות:**
✅ אתר מלא ומעוצב
✅ ניהול הזמנות
✅ באנרים ומבצעים
✅ התממשקות אופציונלית עם חברת סליקה
✅ תמיכה טכנית

מחיר החבילה הקלאסית סופי (כולל מע"מ); בשאר החבילות מתווסף מע"מ בעת התשלום. ניתן לבטל בכל עת! 🎯`,

  "מתי מחייבים אותי ומתי מקבלים חשבונית?": `הכל שקוף ופשוט 🧾

**חשוב לדעת:** כרגע הפרסום **חינמי** ועדיין **לא גובים** דמי מנוי - האתר עולה לאוויר בלי תשלום. מודל המנוי בתשלום (₪79 לחודש, כולל מע"מ) קיים ויופעל בהמשך. כשהוא יופעל, כך זה יעבוד:

**מועד החיוב:**
- החיוב החודשי יתבצע **בכל חודש בתאריך שבו הצטרפתם** (הוראת קבע). הצטרפתם ב-15 לחודש? תחויבו ב-15 בכל חודש.
- **החודש הראשון** ישולם במלואו בעת פרסום האתר, והאתר עולה מיד. החיוב הבא יהיה באותו תאריך בחודש הבא - חודש שלם.

**החשבונית:**
- בכל חיוב מונפקת **חשבונית מס/קבלה אוטומטית** שנשלחת למייל שלכם.
- אפשר לצפות ולהוריד את כל החשבוניות בכל עת: דשבורד → **"התוכנית שלי"** → **"חשבוניות וקבלות"**.

**תוספות:**
- **תוספת מנוי מתחדשת** (כמו ביקורות Google) שנוספה באמצע החודש מחויבת באופן יחסי על הימים עד החיוב הבא, ומהחודש הבא מצטרפת כשורה נפרדת ל**חשבונית החודשית המאוחדת** (מנוי + תוספות יחד) במחיר מלא.
- **תוספת חד-פעמית** (כמו קרדיטים ל-AI) מחויבת מיד ובמלואה.

כל המחירים אינם כוללים מע"מ (מתווסף בעת התשלום). 💙`,

  "איך אני מחבר פיקסל פייסבוק או Google Tag Manager?": `מעולה שאתם מפרסמים! 📊 אפשר לחבר את כל כלי המעקב שלכם לחנות.

זה תוסף חד-פעמי בתשלום של **₪149 + מע"מ** (גישה לכל החיים), שמאפשר לחבר:
✅ Google Tag Manager + Google Analytics 4
✅ פיקסל של פייסבוק / אינסטגרם (Meta)
✅ Google Ads + טיקטוק פיקסל
✅ שדה קוד מותאם אישית לכל תג אחר

**איך מפעילים:**
1. בדשבורד → "תגי שיווק ומעקב" (בקבוצת "שיווק ותצוגה"), או דרך "שדרוגים לעסק"
2. משלמים את התשלום החד-פעמי
3. מדביקים את המזהים (למשל GTM-XXXX או מספר הפיקסל) ולוחצים "שמירה"
4. התגים מוזרקים אוטומטית לחנות החיה שלכם 🎯

ככה תוכלו למדוד המרות, לבנות קהלי ריטרגטינג ולמטב את הקמפיינים.`,

  "איך אני רואה את ההזמנות שלי?": `קל מאוד! 📦 הנה איך:

**צעדים:**

1️⃣ **נכנסים לדשבורד**

2️⃣ **לוחצים על "הזמנות"** בתפריט הצדדי

3️⃣ **רואים את כל ההזמנות!** 🎉

**מה אפשר לעשות:**

📊 **לראות פרטים:**
- שם הלקוח
- טלפון ומייל
- מה הזמין
- סכום ההזמנה

🔄 **לשנות סטטוס:**
- ממתינה ⏳
- אושרה ✅
- הושלמה 🎊
- בוטלה ❌

💬 **ליצור קשר עם הלקוח**
- לחיצה על הטלפון פותחת וואטסאפ

כל הזמנה חדשה תקבל התראה! 🔔`,
};

const HelpCenter = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: business } = useMyBusiness();
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Per-customer memory: load saved conversation once on mount and persist after each exchange
  const conversationLoaded = useRef(false);
  useEffect(() => {
    if (!user?.id || conversationLoaded.current) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("help_conversations")
        .select("messages")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.messages?.length) setMessages(data.messages as Message[]);
      conversationLoaded.current = true;
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !conversationLoaded.current || isLoading || messages.length === 0) return;
    const t = setTimeout(() => {
      void (supabase as any)
        .from("help_conversations")
        .upsert(
          { user_id: user.id, messages, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
    }, 500);
    return () => clearTimeout(t);
  }, [messages, isLoading, user?.id]);

  const hasActiveBusiness = !!user && !!business;
  const backLink = hasActiveBusiness ? "/dashboard" : "/";
  const backText = hasActiveBusiness ? "חזרה לדשבורד" : "חזרה לדף הבית";

  const streamChat = async (userMessages: Message[]) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/help-center`;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: userMessages,
        addressPreference: "plural",
      }),
    });

    if (!resp.ok) {
      const error = await resp.json();
      throw new Error(error.error || "שגיאה בשליחה");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      if (HARDCODED_ANSWERS[messageText]) {
        const remainingQuestions = SUGGESTED_QUESTIONS.filter(q => q !== messageText);
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            { role: "assistant" as const, content: HARDCODED_ANSWERS[messageText] },
          ]);
          if (remainingQuestions.length > 0) {
            setTimeout(() => {
              setMessages(prev => [
                ...prev,
                {
                  role: "assistant" as const,
                  content: `__SUGGESTED_QUESTIONS__${JSON.stringify(remainingQuestions)}`,
                },
              ]);
              setIsLoading(false);
            }, 1000);
          } else {
            setIsLoading(false);
          }
        }, 1000);
        return;
      }

      await streamChat([...messages, userMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "😅 סליחה, משהו השתבש. נסו שוב בבקשה." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
    if (user?.id) {
      void (supabase as any).from("help_conversations").delete().eq("user_id", user.id);
    }
  };

  // Scroll chat panel into view when first message appears
  useEffect(() => {
    if (messages.length === 1) {
      setTimeout(() => chatRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 150);
    }
  }, [messages.length]);

  // Scroll to bottom of messages when new message arrives
  useEffect(() => {
    if (messages.length === 0) return;
    const el = scrollContainerRef.current;
    if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
  }, [messages, isLoading]);

  useEffect(() => {
    setOpenArticle(null);
  }, [input]);

  // KB search: filter all articles across all categories when input is not empty
  const kbFiltered = useMemo(
    () =>
      input.trim()
        ? KNOWLEDGE_BASE.flatMap(cat =>
            cat.articles
              .filter(ar => (ar.q + " " + ar.a).toLowerCase().includes(input.trim().toLowerCase()))
              .map(ar => ({ catId: cat.id, ar }))
          )
        : [],
    [input]
  );

  const renderArticleRow = (
    catId: string,
    ar: { id: string; q: string; a: string; image?: string }
  ) => {
    const key = `${catId}-${ar.id}`;
    const isOpen = openArticle === key;
    return (
      <div key={key} className="border-b border-border/40 last:border-0">
        <button
          onClick={() => setOpenArticle(isOpen ? null : key)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-right hover:bg-muted/30 transition-colors"
          dir="rtl"
        >
          <span className="text-sm text-foreground">{ar.q}</span>
          <span className="text-primary text-xs shrink-0">←</span>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 prose prose-sm dark:prose-invert max-w-none text-right" dir="rtl">
                <ReactMarkdown>{ar.a}</ReactMarkdown>
                {ar.image && (
                  <img
                    src={ar.image}
                    alt={ar.q}
                    className="mt-2 rounded-lg border border-border w-full"
                    loading="lazy"
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl" style={{ fontFamily: "Heebo, sans-serif" }}>
      <SEOHead
        title="מרכז עזרה | סיאנגו"
        description="מצא תשובות לשאלות נפוצות על בניית אתר מכירות, ניהול מוצרים, הזמנות ותשלומים."
        canonical="https://siango.app/help"
        noindex={false}
      />

      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between gap-2 h-16">
          <Link to={backLink} className="shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowRight className="w-4 h-4" />
              <span className="hidden sm:inline">{backText}</span>
            </Button>
          </Link>
          <img
            src={logoDarkBg}
            alt="Siango"
            className="h-9 sm:h-11 w-auto object-contain shrink-0"
          />
          <div className="w-9 sm:w-28 shrink-0" />
        </div>
      </header>

      <div className="container max-w-3xl py-8 px-4">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">איך אפשר לעזור? 🤗</h1>
          <p className="text-muted-foreground">שאלו שאלה חופשית או עיינו לפי נושא</p>
        </motion.div>

        {/* Search / Chat bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="mb-4"
        >
          <div className="flex gap-2 items-center border-2 border-primary rounded-2xl px-4 py-2 shadow-sm focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] transition-shadow bg-background">
            <span className="text-lg">💬</span>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="שאלו שאלה חופשית..."
              className="flex-1 border-0 shadow-none focus-visible:ring-0 h-10 bg-transparent text-foreground placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="sm"
              className="shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>

        {/* Suggestion chips — hidden while typing */}
        <AnimatePresence>
          {!input.trim() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="flex gap-2 flex-wrap justify-center mb-8 overflow-hidden"
            >
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs hover:bg-primary/20 transition-colors"
                >
                  {q}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Chat panel — appears directly below the input, above articles */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div
              ref={chatRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="mb-6 border border-border rounded-2xl overflow-hidden"
            >
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
                <span className="text-sm font-medium">שיחה עם העוזר</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1.5 text-muted-foreground h-7 px-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  איפוס
                </Button>
              </div>

              {/* Messages */}
              <div ref={scrollContainerRef} className="h-[360px] overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl px-4 py-3 text-right ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          msg.content.startsWith("__SUGGESTED_QUESTIONS__") ? (
                            <div className="space-y-2" dir="rtl">
                              <p className="text-sm font-medium mb-2">שאלות נוספות:</p>
                              {JSON.parse(
                                msg.content.replace("__SUGGESTED_QUESTIONS__", "")
                              ).map((q: string, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => handleSend(q)}
                                  className="block w-full text-right text-sm border border-border/60 rounded-lg px-3 py-2 hover:bg-background/50 transition-colors"
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div
                              className="prose prose-sm dark:prose-invert max-w-none text-right"
                              dir="rtl"
                            >
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          )
                        ) : (
                          <p dir="rtl">{msg.content}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === "user" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Chat reply input */}
              <div className="border-t border-border/50 p-3">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (!chatInput.trim() || isLoading) return;
                    handleSend(chatInput);
                    setChatInput("");
                  }}
                  className="flex gap-2 items-center"
                >
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="כתבו הודעה נוספת..."
                    className="flex-1 h-9 text-sm"
                    disabled={isLoading}
                    dir="rtl"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading || !chatInput.trim()}
                    className="shrink-0"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
                <a
                  href="mailto:office@siango.app"
                  className="block text-center text-xs text-muted-foreground hover:text-primary transition-colors mt-2"
                >
                  לא מצאתם תשובה? שלחו מייל לתמיכה →
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search results OR category accordion */}
        <AnimatePresence mode="wait">
          {input.trim() ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {kbFiltered.length > 0 ? (
                <div className="border border-border rounded-xl overflow-hidden">
                  {kbFiltered.map(({ catId, ar }) => renderArticleRow(catId, ar))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground text-sm mb-4">
                    לא מצאנו תשובה במאמרים.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handleSend(input)}
                    className="gap-1.5"
                  >
                    שלחו את השאלה לבוט
                    <span>←</span>
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="accordion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  או עיין לפי נושא
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Category accordion */}
              <div className="space-y-2">
                {KNOWLEDGE_BASE.map(cat => {
                  const isOpen = openCategory === cat.id;
                  return (
                    <div
                      key={cat.id}
                      className={`rounded-[14px] overflow-hidden border transition-colors ${
                        isOpen
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:bg-muted/30"
                      }`}
                      style={{ borderWidth: isOpen ? "1.5px" : "1px" }}
                    >
                      <button
                        onClick={() => setOpenCategory(isOpen ? null : cat.id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3.5"
                        dir="rtl"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl leading-none">{cat.icon}</span>
                          <span
                            className={`font-semibold text-sm ${
                              isOpen ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {cat.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs ${
                              isOpen ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {cat.articles.length} מאמרים
                          </span>
                          <motion.span
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className={`text-xs inline-block ${
                              isOpen ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            ▼
                          </motion.span>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border/40 bg-background">
                              {cat.articles.map(ar => renderArticleRow(cat.id, ar))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom contact link — shown when no chat panel */}
        {messages.length === 0 && (
          <div className="text-center mt-8 text-sm text-muted-foreground">
            לא מצאתם תשובה?{" "}
            <a href="mailto:office@siango.app" className="text-primary hover:underline">
              צרו קשר עם התמיכה
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpCenter;
