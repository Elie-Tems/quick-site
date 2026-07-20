// src/components/dashboard/PostLaunchPopups.tsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DashboardView } from "./DashboardNav";

export type PopupId = "products" | "legal" | "payments" | "crm" | "share" | "design" | "content";

interface PopupConfig {
  id: PopupId;
  emoji: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaView: DashboardView | null;
  color: string;
  /** לא מוצג ברצועת "דברים לסדר" — רק כפופאפ גילוי */
  skipTodo?: boolean;
}

function getPopups(t: (key: string) => string): PopupConfig[] {
  return [
    {
      id: "products",
      emoji: "🛍️",
      title: t("dash.postlaunch.products_title"),
      body: t("dash.postlaunch.products_body"),
      ctaLabel: t("dash.postlaunch.products_cta"),
      ctaView: "products",
      color: "from-violet-600 to-purple-500",
    },
    {
      id: "legal",
      emoji: "📄",
      title: t("dash.postlaunch.legal_title"),
      body: t("dash.postlaunch.legal_body"),
      ctaLabel: t("dash.postlaunch.legal_cta"),
      ctaView: "legal",
      color: "from-red-500 to-orange-500",
    },
    {
      id: "payments",
      emoji: "💳",
      title: t("dash.postlaunch.payments_title"),
      body: t("dash.postlaunch.payments_body"),
      ctaLabel: t("dash.postlaunch.payments_cta"),
      ctaView: "payments",
      color: "from-blue-600 to-sky-500",
    },
    {
      id: "crm",
      emoji: "👥",
      skipTodo: true,
      title: t("dash.postlaunch.crm_title"),
      body: t("dash.postlaunch.crm_body"),
      ctaLabel: t("dash.postlaunch.crm_cta"),
      ctaView: "customers",
      color: "from-emerald-600 to-teal-500",
    },
    {
      id: "share",
      emoji: "🔗",
      skipTodo: true,
      title: t("dash.postlaunch.share_title"),
      body: t("dash.postlaunch.share_body"),
      ctaLabel: t("dash.postlaunch.share_cta"),
      ctaView: null,
      color: "from-amber-500 to-orange-400",
    },
    {
      id: "design",
      emoji: "🎨",
      skipTodo: true,
      title: t("dash.postlaunch.design_title"),
      body: t("dash.postlaunch.design_body"),
      ctaLabel: t("dash.postlaunch.design_cta"),
      ctaView: "design",
      color: "from-pink-600 to-rose-500",
    },
    {
      id: "content",
      emoji: "✏️",
      skipTodo: true,
      title: t("dash.postlaunch.content_title"),
      body: t("dash.postlaunch.content_body"),
      ctaLabel: t("dash.postlaunch.content_cta"),
      ctaView: "content",
      color: "from-cyan-600 to-sky-500",
    },
  ];
}

export interface PopupState {
  shown: PopupId[];
  dismissed: PopupId[];
  completed: PopupId[];
}

interface PostLaunchPopupsProps {
  businessId: string | undefined;
  onNavigate: (view: DashboardView) => void;
  popupState: PopupState | null;
  onStateChange: (next: PopupState) => void;
}

export default function PostLaunchPopups({ businessId, onNavigate, popupState, onStateChange }: PostLaunchPopupsProps) {
  const { t } = useLanguage();
  const POPUPS = getPopups(t);
  const [activePopup, setActivePopup] = useState<PopupConfig | null>(null);
  const suppressNextRef = useRef(false);

  useEffect(() => {
    if (!popupState) return;
    if (suppressNextRef.current) {
      suppressNextRef.current = false;
      return;
    }
    const next = POPUPS.find(
      (p) =>
        !popupState.completed.includes(p.id) &&
        !popupState.dismissed.includes(p.id) &&
        !popupState.shown.includes(p.id)
    );
    setActivePopup(next ?? null);
    // Mark as shown immediately so re-entering dashboard won't re-trigger it
    if (next && businessId) {
      const nextState: PopupState = {
        ...popupState,
        shown: [...new Set([...popupState.shown, next.id])],
      };
      onStateChange(nextState);
      supabase
        .from("businesses")
        .update({ popup_state: nextState as unknown as Record<string, unknown> })
        .eq("id", businessId);
    }
  }, [popupState]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateState(next: PopupState) {
    if (!businessId) return;
    onStateChange(next);
    await supabase
      .from("businesses")
      .update({ popup_state: next as unknown as Record<string, unknown> })
      .eq("id", businessId);
  }

  async function handleSkip() {
    if (!activePopup || !popupState) return;
    const next: PopupState = {
      ...popupState,
      shown: [...new Set([...popupState.shown, activePopup.id])],
      dismissed: [...new Set([...popupState.dismissed, activePopup.id])],
    };
    setActivePopup(null);
    await updateState(next);
  }

  async function handleCta() {
    if (!activePopup || !popupState) return;
    const next: PopupState = {
      ...popupState,
      shown: [...new Set([...popupState.shown, activePopup.id])],
      completed: [...new Set([...popupState.completed, activePopup.id])],
    };
    const targetView = activePopup.ctaView;
    suppressNextRef.current = true;
    setActivePopup(null);
    await updateState(next);
    if (targetView) {
      onNavigate(targetView);
    }
  }

  return (
    <AnimatePresence>
      {activePopup && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleSkip}
        >
          <motion.div
            key={activePopup.id}
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md rounded-3xl bg-gradient-to-br ${activePopup.color} p-8 shadow-2xl`}
            dir="rtl"
          >
            <button
              onClick={handleSkip}
              className="absolute top-4 left-4 rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors"
              aria-label={t("dash.postlaunch.skip")}
            >
              <X className="h-4 w-4 text-white" />
            </button>

            <div className="text-5xl mb-4">{activePopup.emoji}</div>
            <h2 className="text-xl font-bold mb-2 text-white">{activePopup.title}</h2>
            <p className="text-sm leading-relaxed mb-6 text-white/90">{activePopup.body}</p>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleCta}
                className="flex-1 bg-white text-gray-900 hover:bg-white/90 font-semibold gap-2"
              >
                {activePopup.ctaLabel} <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={handleSkip}
                className="text-white/70 hover:text-white text-sm transition-colors px-2"
              >
                {t("dash.postlaunch.skip")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
