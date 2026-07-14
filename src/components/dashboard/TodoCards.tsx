// src/components/dashboard/TodoCards.tsx
import type { PopupId, PopupState } from "./PostLaunchPopups";
import { POPUPS } from "./PostLaunchPopups";

interface TodoCardsProps {
  popupState: PopupState | null;
  onReopen: (id: PopupId) => void;
}

export default function TodoCards({ popupState, onReopen }: TodoCardsProps) {
  if (!popupState) return null;

  // Show only non-completed setup tasks (CRM and share are discovery items, not setup tasks)
  const visible = POPUPS.filter((p) => !p.skipTodo && !popupState.completed.includes(p.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {visible.length} {visible.length === 1 ? "דבר" : "דברים"} שנשארו לסדר
      </p>
      <div className="flex gap-2 flex-wrap">
        {visible.map((p) => {
          const isDismissed = popupState.dismissed.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onReopen(p.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-right text-sm transition-colors hover:opacity-80 ${
                isDismissed
                  ? "border-border bg-card"
                  : "border-amber-400/40 bg-amber-50 dark:bg-amber-950/30"
              }`}
            >
              <span>{p.emoji}</span>
              <span className="font-medium text-foreground">{p.title}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isDismissed
                    ? "bg-muted text-muted-foreground"
                    : "bg-amber-400/20 text-amber-700 dark:text-amber-300"
                }`}
              >
                {isDismissed ? "דולג" : "לא נקרא"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
