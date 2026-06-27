import { useState, useRef, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, HelpCircle, Loader2, Sparkles, ArrowRight, ArrowLeft, User, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import logoDarkBg from "@/assets/logo-dark-bg.png";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Message = { role: "user" | "assistant"; content: string };
type AddressPreference = "plural" | "male" | "female";

const ADDRESS_OPTIONS: { value: AddressPreference; label: string }[] = [
  { value: "plural", label: "רבים (נכנסים, לוחצים)" },
  { value: "male", label: "זכר (היכנס, לחץ)" },
  { value: "female", label: "נקבה (היכנסי, לחצי)" },
];

const SUGGESTED_QUESTIONS = [
  "איך אני מוסיף מוצר חדש?",
  "איך אני יוצר טקסט אודות?",
  "איך אני מגדיר מבצע על מוצר?",
  "איך אני מעלה באנר?",
  "מה ההבדל בין החבילות?",
  "איך אני רואה את ההזמנות שלי?",
];

const HARDCODED_ANSWERS: Record<string, string> = {
  "איך אני מוסיף מוצר חדש?": `היי! 👋 אשמח לעזור לך להוסיף מוצר חדש.

**הנה השלבים:**

1️⃣ **נכנסים לדשבורד** - לוח הבקרה שלך

2️⃣ **לוחצים על "מוצרים"** בתפריט הצדדי

3️⃣ **לוחצים על "+ הוסף מוצר"** (הכפתור הירוק)

4️⃣ **ממלאים את הפרטים:**
   - שם המוצר 📝
   - מחיר 💰
   - תיאור (אופציונלי)
   - קטגוריה

5️⃣ **מעלים תמונה** 📸
   - אפשר גם להשתמש ב-AI לשדרוג התמונה!

6️⃣ **לוחצים "שמור"** ✅

זהו! המוצר שלך באתר 🎉

צריך עזרה נוספת? שאל בשמחה! 😊`,

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

**📦 קלאסית - ₪59/חודש + מע"מ**
- עד 50 מוצרים
- כל התכונות הבסיסיות
- מתאים למתחילים

**🚀 פרו - ₪79/חודש + מע"מ**
- עד 150 מוצרים
- כתיבת "אודות" עם AI
- מתאים לעסקים קטנים-בינוניים

**⭐ פרו+ - ₪99/חודש + מע"מ**
- עד 500 מוצרים
- כתיבת "אודות" עם AI
- מתאים לעסקים גדולים

**👑 פרמיום - ₪149/חודש + מע"מ**
- עד 2000 מוצרים
- כתיבת "אודות" עם AI
- מתאים לעסקים מאוד גדולים

**כל החבילות כוללות:**
✅ אתר מלא ומעוצב
✅ ניהול הזמנות
✅ באנרים ומבצעים
✅ תמיכה טכנית

ניתן לבטל בכל עת! 🎯`,

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
  const [isLoading, setIsLoading] = useState(false);
  const [addressPreference, setAddressPreference] = useState<AddressPreference>(() => {
    return (localStorage.getItem("help_address_preference") as AddressPreference) || "plural";
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { user, loading: authLoading } = useAuth();
  const { data: business, isLoading: businessLoading } = useMyBusiness();

  // Per-customer memory: load this user's saved conversation once on mount, and
  // persist it after each completed exchange so the bot "remembers" across visits.
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
    // Only save after the initial load, when an exchange has settled (not mid-stream).
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

  // Determine where to redirect: dashboard if has business, landing page otherwise
  const hasActiveBusiness = !!user && !!business;
  const backLink = hasActiveBusiness ? "/dashboard" : "/";
  const backText = hasActiveBusiness ? "חזרה לדשבורד" : "חזרה לדף הבית";

  // Save preference to localStorage
  const handlePreferenceChange = (pref: AddressPreference) => {
    setAddressPreference(pref);
    localStorage.setItem("help_address_preference", pref);
  };

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
        addressPreference: addressPreference 
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
      // Check if there's a hardcoded answer
      if (HARDCODED_ANSWERS[messageText]) {
        // Get remaining suggested questions
        const remainingQuestions = SUGGESTED_QUESTIONS.filter(q => q !== messageText);
        
        // Wait 1 second before showing the answer
        setTimeout(() => {
          setMessages(prev => {
            const newMessages: Message[] = [
              ...prev,
              { role: "assistant" as const, content: HARDCODED_ANSWERS[messageText] }
            ];
            
            return newMessages;
          });
          
          // Wait another second before showing suggested questions
          if (remainingQuestions.length > 0) {
            setTimeout(() => {
              setMessages(prev => [
                ...prev,
                {
                  role: "assistant" as const,
                  content: `__SUGGESTED_QUESTIONS__${JSON.stringify(remainingQuestions)}`
                }
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
        { role: "assistant", content: "😅 סליחה, משהו השתבש. נסה שוב בבקשה." }
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

  return (
    <div className="min-h-screen bg-background" dir="rtl" style={{ fontFamily: 'Heebo, sans-serif' }}>
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

          <img src={logoDarkBg} alt="Siango" className="h-9 sm:h-11 w-auto object-contain shrink-0" />

          <div className="w-9 sm:w-28 shrink-0" />
        </div>
      </header>

      <div className="container max-w-4xl py-8">
        {/* Title */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <HelpCircle className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">מרכז ידע</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            איך אפשר לעזור? 🤗
          </h1>
          <p className="text-muted-foreground text-lg">
            שאל אותי כל שאלה על המערכת ואסביר לך צעד אחר צעד
          </p>
        </motion.div>

        {/* Reset Button - Above Chat */}
        {messages.length > 0 && (
          <div className="flex justify-center mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              איפוס שיחה
            </Button>
          </div>
        )}

        {/* Chat Area */}
        <Card className="border-border/50 mb-6" dir="rtl">
          <CardContent className="p-0">
            <ScrollArea
              className="h-[300px] md:h-[380px] p-4"
              ref={scrollRef}
            >
              <AnimatePresence>
                {messages.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center p-8"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground mb-6">
                      היי! 👋 אני כאן לעזור לך עם כל שאלה על המערכת.
                      <br />
                      אפשר לשאול בעברית פשוטה ואני אסביר הכל.
                    </p>
                    
                    {/* Suggested Questions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg" dir="rtl">
                      {SUGGESTED_QUESTIONS.map((q, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="h-auto py-2 px-3 w-full text-right"
                          onClick={() => handleSend(q)}
                          dir="rtl"
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-6 flex flex-col-reverse">
                    {messages.slice().reverse().map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[95%] md:max-w-[90%] rounded-2xl px-4 py-3 text-right ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            msg.content.startsWith("__SUGGESTED_QUESTIONS__") ? (
                              <div className="space-y-2" dir="rtl">
                                <p className="text-sm font-medium text-foreground mb-3">שאלות נוספות שאפשר לשאול:</p>
                                <div className="grid grid-cols-1 gap-2">
                                  {JSON.parse(msg.content.replace("__SUGGESTED_QUESTIONS__", "")).map((q: string, idx: number) => (
                                    <Button
                                      key={idx}
                                      variant="outline"
                                      size="sm"
                                      className="h-auto py-2 px-3 w-full text-right justify-start"
                                      onClick={() => handleSend(q)}
                                      dir="rtl"
                                    >
                                      {q}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="prose prose-sm dark:prose-invert max-w-none text-right" dir="rtl">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            )
                          ) : (
                            <p className="text-right" dir="rtl">{msg.content}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-end"
                      >
                        <div className="bg-muted rounded-2xl px-4 py-3">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border/50 p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="שאל שאלה..."
                  className="flex-1 h-12 bg-white text-zinc-900 border-2 border-primary/40 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            לא מצאת תשובה? {" "}
            <a href="mailto:office@siango.app" className="text-primary hover:underline">
              צור קשר עם התמיכה
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
