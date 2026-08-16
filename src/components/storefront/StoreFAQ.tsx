import { useState } from "react";
import StoreSectionHeading from "./StoreSectionHeading";
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

interface StoreFAQProps {
  items: FaqItem[];
  accent: string;
}

const StoreFAQ = ({ items, accent }: StoreFAQProps) => {
  const [open, setOpen] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <section className="py-14 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <StoreSectionHeading accent={accent} title="שאלות נפוצות" />
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-right"
              >
                <span className="font-semibold text-foreground">{item.question}</span>
                <ChevronDown
                  className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200"
                  style={{ transform: open === i ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-muted-foreground text-sm leading-relaxed border-t border-border pt-3">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StoreFAQ;
